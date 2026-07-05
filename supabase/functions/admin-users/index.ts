import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set([
  "https://sr-editer.vercel.app",
  ...(Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean)
]);
const validRoles = new Set(["membre", "moderateur", "admin", "suspendu"]);
const validWriteModes = new Set(["direct", "draft"]);
const validPlans = new Set(["free", "pro", "studio", "lifetime"]);
const validLicenseStatuses = new Set(["trialing", "active", "past_due", "canceled", "suspended"]);
const permissionKeys = ["console", "users", "licenses", "support", "contacts", "releases", "audit", "system", "team"];

function headers(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  };
}

function json(origin: string | null, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}

function emailOf(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function textOf(value: unknown, max = 10_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function permissionFor(action: string) {
  if (["dashboard", "me"].includes(action)) return "console";
  if (["list", "create", "update", "delete", "ban", "unban", "confirm-email", "reset-password", "devices-list", "device-revoke"].includes(action)) return "users";
  if (action.startsWith("license")) return "licenses";
  if (action.startsWith("support")) return "support";
  if (action.startsWith("contact")) return "contacts";
  if (action.startsWith("release")) return "releases";
  if (action.startsWith("audit")) return "audit";
  if (action.startsWith("health")) return "system";
  if (action.startsWith("team")) return "team";
  return "console";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return json(origin, 405, { ok: false, error: "Méthode refusée." });
  if (origin && !allowedOrigins.has(origin)) return json(origin, 403, { ok: false, error: "Origine refusée." });
  if (Number(request.headers.get("content-length") ?? 0) > 65_536) return json(origin, 413, { ok: false, error: "Requête trop volumineuse." });
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(origin, 503, { ok: false, error: "Service administrateur non configuré." });

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json(origin, 401, { ok: false, error: "Session requise." });
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const caller = userData.user;
  if (userError || !caller?.id || !caller.email) return json(origin, 401, { ok: false, error: "Session invalide." });

  const { data: callerProfile } = await admin.from("profiles")
    .select("user_id,email,role,write_mode,created_at").eq("user_id", caller.id).maybeSingle();
  const { data: access } = await admin.from("superadmin_access")
    .select("level,permissions").eq("user_id", caller.id).maybeSingle();
  if (callerProfile?.role !== "admin" && !access) return json(origin, 403, { ok: false, error: "Accès administrateur requis." });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(origin, 400, { ok: false, error: "Requête JSON invalide." }); }
  const action = textOf(body.action, 64);
  const level = access?.level === "collaborator" ? "collaborator" : "owner";
  const permissions = access?.permissions && typeof access.permissions === "object" ? access.permissions as Record<string, boolean> : {};
  const requiredPermission = permissionFor(action);
  if (level === "collaborator" && !permissions[requiredPermission]) return json(origin, 403, { ok: false, error: "Permission superadmin manquante." });
  if (requiredPermission === "team" && level !== "owner") return json(origin, 403, { ok: false, error: "Réservé au propriétaire." });

  const audit = async (auditAction: string, targetType: string, targetId?: string, metadata: Record<string, unknown> = {}) => {
    await admin.from("admin_audit_logs").insert({
      actor_user_id: caller.id, actor_email: caller.email, action: auditAction,
      target_type: targetType, target_id: targetId ?? null, metadata
    });
  };
  const listAuthUsers = async () => {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return data.users;
  };

  if (action === "me") return json(origin, 200, { ok: true, profile: callerProfile, level, permissions });

  if (action === "dashboard") {
    const [users, licenses, tickets, contacts, audits] = await Promise.all([
      listAuthUsers(),
      admin.from("customer_licenses").select("status,plan"),
      admin.from("support_tickets").select("status,priority"),
      admin.from("contact_messages").select("status"),
      admin.from("admin_audit_logs").select("id,actor_email,action,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(8)
    ]);
    return json(origin, 200, {
      ok: true,
      metrics: {
        users: users.length,
        confirmed: users.filter((user) => user.email_confirmed_at).length,
        banned: users.filter((user) => user.banned_until && new Date(user.banned_until) > new Date()).length,
        activeLicenses: (licenses.data ?? []).filter((row) => ["active", "trialing"].includes(row.status)).length,
        openTickets: (tickets.data ?? []).filter((row) => row.status !== "closed").length,
        urgentTickets: (tickets.data ?? []).filter((row) => row.priority === "urgent" && row.status !== "closed").length,
        newContacts: (contacts.data ?? []).filter((row) => row.status === "new").length
      },
      recentAudit: audits.data ?? []
    });
  }

  if (action === "list") {
    const users = await listAuthUsers();
    const [{ data: profiles, error }, { data: licenses }] = await Promise.all([
      admin.from("profiles").select("user_id,email,role,write_mode,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("customer_licenses").select("user_id,plan,status,device_limit,expires_at")
    ]);
    if (error) return json(origin, 500, { ok: false, error: error.message });
    const byUser = new Map((profiles ?? []).map((row) => [row.user_id, row]));
    const licensesByUser = new Map((licenses ?? []).map((row) => [row.user_id, row]));
    return json(origin, 200, { ok: true, users: users.map((user) => {
      const profile = byUser.get(user.id); const license = licensesByUser.get(user.id);
      return {
        user_id: user.id, email: user.email ?? profile?.email ?? "", created_at: profile?.created_at ?? user.created_at,
        last_sign_in_at: user.last_sign_in_at, confirmed: Boolean(user.email_confirmed_at), banned_until: user.banned_until,
        role: profile?.role ?? "membre", write_mode: profile?.write_mode ?? "direct",
        plan: license?.plan ?? "free", license_status: license?.status ?? "active", device_limit: license?.device_limit ?? 1,
        expires_at: license?.expires_at ?? null
      };
    }) });
  }

  if (action === "audit-list") {
    const { data, error } = await admin.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "health") {
    const started = Date.now();
    const { error } = await admin.from("profiles").select("user_id", { head: true, count: "exact" });
    return json(origin, error ? 503 : 200, { ok: !error, database: error ? "error" : "online", latencyMs: Date.now() - started, time: new Date().toISOString(), error: error?.message });
  }
  if (action === "support-list") {
    const { data, error } = await admin.from("support_tickets").select("*,support_messages(id,author_kind,content,created_at)").order("updated_at", { ascending: false }).limit(300);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "support-update") {
    const id = textOf(body.id, 64); const status = textOf(body.status, 16);
    if (!id || !["open", "pending", "closed"].includes(status)) return json(origin, 400, { ok: false, error: "Ticket ou statut invalide." });
    const { error } = await admin.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) await audit("support.update", "ticket", id, { status });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "support-reply") {
    const id = textOf(body.id, 64); const content = textOf(body.content);
    if (!id || !content) return json(origin, 400, { ok: false, error: "Réponse vide." });
    const { error } = await admin.from("support_messages").insert({ ticket_id: id, author_user_id: caller.id, author_kind: "admin", content });
    if (!error) { await admin.from("support_tickets").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", id); await audit("support.reply", "ticket", id); }
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "contact-list") {
    const { data, error } = await admin.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "contact-update") {
    const id = textOf(body.id, 64); const status = textOf(body.status, 16);
    if (!id || !["new", "read", "archived"].includes(status)) return json(origin, 400, { ok: false, error: "Statut invalide." });
    const { error } = await admin.from("contact_messages").update({ status }).eq("id", id);
    if (!error) await audit("contact.update", "contact", id, { status });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "license-list") {
    const users = await listAuthUsers();
    const { data, error } = await admin.from("customer_licenses").select("*").order("updated_at", { ascending: false });
    if (error) return json(origin, 500, { ok: false, error: error.message });
    const emailById = new Map(users.map((user) => [user.id, user.email ?? ""]));
    return json(origin, 200, { ok: true, rows: (data ?? []).map((row) => ({ ...row, email: emailById.get(row.user_id) ?? "" })) });
  }
  if (action === "license-upsert") {
    const targetEmail = emailOf(body.email); const users = await listAuthUsers(); const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
    const plan = textOf(body.plan, 16); const status = textOf(body.status, 16); const deviceLimit = Number(body.deviceLimit ?? 1);
    if (!target || !validPlans.has(plan) || !validLicenseStatuses.has(status) || !Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 25) return json(origin, 400, { ok: false, error: "Licence invalide." });
    const { error } = await admin.from("customer_licenses").upsert({ user_id: target.id, plan, status, device_limit: deviceLimit, expires_at: body.expiresAt || null, notes: textOf(body.notes, 2000), updated_at: new Date().toISOString() });
    if (!error) await audit("license.upsert", "user", target.id, { plan, status, deviceLimit });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "devices-list") {
    const targetEmail = emailOf(body.email); const users = await listAuthUsers(); const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
    const { data, error } = await admin.from("device_activations").select("id,device_name,app_version,revoked,first_seen_at,last_seen_at").eq("user_id", target.id).order("last_seen_at", { ascending: false });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "device-revoke") {
    const id = textOf(body.id, 64); const { error } = await admin.from("device_activations").update({ revoked: true }).eq("id", id);
    if (!error) await audit("device.revoke", "device", id);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "release-list") {
    const { data, error } = await admin.from("release_records").select("*").order("created_at", { ascending: false });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "release-upsert") {
    const version = textOf(body.version, 32); const artifactUrl = textOf(body.artifactUrl, 2048); const signature = textOf(body.signature, 8192);
    if (!/^\d+\.\d+\.\d+/.test(version) || !artifactUrl.startsWith("https://") || signature.length < 20) return json(origin, 400, { ok: false, error: "Release incomplète ou non signée." });
    const { error } = await admin.from("release_records").upsert({ version, artifact_url: artifactUrl, signature, notes: textOf(body.notes, 5000), published: Boolean(body.published), updated_at: new Date().toISOString() });
    if (!error) await audit("release.upsert", "release", version, { published: Boolean(body.published) });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "team-list") {
    const users = await listAuthUsers(); const { data, error } = await admin.from("superadmin_access").select("*").order("created_at");
    const emailById = new Map(users.map((user) => [user.id, user.email ?? ""]));
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: (data ?? []).map((row) => ({ ...row, email: emailById.get(row.user_id) ?? "" })) });
  }
  if (action === "team-upsert") {
    const targetEmail = emailOf(body.email); const users = await listAuthUsers(); const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
    const requested = body.permissions && typeof body.permissions === "object" ? body.permissions as Record<string, unknown> : {};
    const nextPermissions = Object.fromEntries(permissionKeys.map((key) => [key, Boolean(requested[key])]));
    if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
    const { error } = await admin.from("superadmin_access").upsert({ user_id: target.id, level: body.level === "owner" ? "owner" : "collaborator", permissions: nextPermissions, updated_at: new Date().toISOString() });
    if (!error) await audit("team.upsert", "user", target.id, { email: targetEmail });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "team-delete") {
    const targetEmail = emailOf(body.email); if (targetEmail === caller.email.toLowerCase()) return json(origin, 409, { ok: false, error: "Impossible de retirer ton propre accès." });
    const users = await listAuthUsers(); const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
    const { error } = await admin.from("superadmin_access").delete().eq("user_id", target.id);
    if (!error) await audit("team.delete", "user", target.id, { email: targetEmail });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }

  const users = await listAuthUsers();
  const targetEmail = emailOf(body.email);
  const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
  if (action === "create") {
    const password = typeof body.password === "string" ? body.password : ""; const role = textOf(body.role, 16) || "membre"; const writeMode = textOf(body.writeMode, 16) || "direct";
    if (password.length < 10) return json(origin, 400, { ok: false, error: "Le mot de passe doit contenir au moins 10 caractères." });
    if (!validRoles.has(role) || !validWriteModes.has(writeMode) || !targetEmail || target) return json(origin, 400, { ok: false, error: "Compte, rôle ou mode invalide." });
    const { data, error } = await admin.auth.admin.createUser({ email: targetEmail, password, email_confirm: true });
    if (error || !data.user) return json(origin, 400, { ok: false, error: error?.message ?? "Création impossible." });
    const { error: profileError } = await admin.from("profiles").insert({ user_id: data.user.id, email: targetEmail, role, write_mode: writeMode });
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return json(origin, 500, { ok: false, error: profileError.message }); }
    await audit("user.create", "user", data.user.id, { email: targetEmail, role });
    return json(origin, 200, { ok: true });
  }
  if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
  const { data: targetProfile } = await admin.from("profiles").select("role").eq("user_id", target.id).maybeSingle();
  const { count: adminCount } = await admin.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
  if (action === "update") {
    const role = textOf(body.role, 16); const writeMode = textOf(body.writeMode, 16);
    if (!validRoles.has(role) || !validWriteModes.has(writeMode)) return json(origin, 400, { ok: false, error: "Rôle ou mode invalide." });
    if (targetProfile?.role === "admin" && role !== "admin" && (adminCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de retirer le dernier administrateur." });
    const { error } = await admin.from("profiles").upsert({ user_id: target.id, email: targetEmail, role, write_mode: writeMode }, { onConflict: "user_id" });
    if (!error) await audit("user.update", "user", target.id, { role, writeMode });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "ban" || action === "unban") {
    if (target.id === caller.id) return json(origin, 409, { ok: false, error: "Action impossible sur ton propre compte." });
    const { error } = await admin.auth.admin.updateUserById(target.id, { ban_duration: action === "ban" ? "876000h" : "none" });
    if (!error) await audit(`user.${action}`, "user", target.id);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "confirm-email") {
    const { error } = await admin.auth.admin.updateUserById(target.id, { email_confirm: true });
    if (!error) await audit("user.confirm_email", "user", target.id);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "reset-password") {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: targetEmail });
    if (!error) await audit("user.password_recovery", "user", target.id);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, actionLink: data.properties?.action_link ?? null });
  }
  if (action === "delete") {
    if (target.id === caller.id) return json(origin, 409, { ok: false, error: "Tu ne peux pas supprimer ton propre compte." });
    if (targetProfile?.role === "admin" && (adminCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de supprimer le dernier administrateur." });
    const { error } = await admin.auth.admin.deleteUser(target.id);
    if (!error) await audit("user.delete", "user", target.id, { email: targetEmail });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  return json(origin, 400, { ok: false, error: "Action inconnue." });
});
