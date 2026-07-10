import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set([
  "https://sr-editer.vercel.app",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:4313",
  "http://127.0.0.1:4313",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
  ...(Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean)
]);
const validRoles = new Set(["membre", "moderateur", "admin", "suspendu"]);
const validWriteModes = new Set(["direct", "draft"]);
const validPlans = new Set(["free", "pro", "studio", "lifetime"]);
const validLicenseStatuses = new Set(["trialing", "active", "past_due", "canceled", "suspended"]);
const permissionKeys = ["console", "users", "licenses", "support", "contacts", "releases", "audit", "system", "team", "library"];
const appPermissionKeys = ["project", "explorer", "converter", "assets", "materials", "textures", "modeling", "library", "ai", "settings"];

function appPermissionsOf(value: unknown) {
  const requested = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(appPermissionKeys.map((key) => [key, requested[key] !== false]));
}

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
  if (action.startsWith("library")) return "library";
  return "console";
}

function isManagedLibraryUrl(value: string) {
  const prefix = `${supabaseUrl}/storage/v1/object/public/textures-library/`;
  const vercelPrefix = "https://sr-editer.vercel.app/assets/textures/";
  return (value.startsWith(prefix) || value.startsWith(vercelPrefix)) && value.length <= 2048;
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
    .select("user_id,email,role,write_mode,app_permissions,created_at").eq("user_id", caller.id).maybeSingle();
  const { data: access } = await admin.from("superadmin_access")
    .select("level,permissions").eq("user_id", caller.id).maybeSingle();
  if (!callerProfile) return json(origin, 403, { ok: false, error: "Profil administrateur actif requis." });
  if (callerProfile.role === "suspendu") return json(origin, 403, { ok: false, error: "Ce compte administrateur est suspendu." });
  if (!access) return json(origin, 403, { ok: false, error: "Accès à la superconsole requis." });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(origin, 400, { ok: false, error: "Requête JSON invalide." }); }
  const action = textOf(body.action, 64);
  const level = access.level === "owner" ? "owner" : "collaborator";
  const permissions = access.permissions && typeof access.permissions === "object" ? access.permissions as Record<string, boolean> : {};
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
    const allUsers = await listAuthUsers();
    const users = allUsers.filter((u) => !u.deleted_at);
    const [{ data: profiles, error }, { data: licenses }, { data: superadmins }] = await Promise.all([
      admin.from("profiles").select("user_id,email,role,write_mode,app_permissions,created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("customer_licenses").select("user_id,plan,status,device_limit,expires_at"),
      admin.from("superadmin_access").select("user_id,level")
    ]);
    if (error) return json(origin, 500, { ok: false, error: error.message });
    const byUser = new Map((profiles ?? []).map((row) => [row.user_id, row]));
    const licensesByUser = new Map((licenses ?? []).map((row) => [row.user_id, row]));
    const superadminLevelByUser = new Map((superadmins ?? []).map((row) => [row.user_id, row.level]));
    return json(origin, 200, { ok: true, users: users.map((user) => {
      const profile = byUser.get(user.id); const license = licensesByUser.get(user.id);
      const superadminLevel = superadminLevelByUser.get(user.id);
      let role = profile?.role ?? "membre";
      if (role === "admin" && superadminLevel === "owner") {
        role = "owner";
      }
      return {
        user_id: user.id, email: user.email ?? profile?.email ?? "", created_at: profile?.created_at ?? user.created_at,
        last_sign_in_at: user.last_sign_in_at, confirmed: Boolean(user.email_confirmed_at), banned_until: user.banned_until,
        role, write_mode: profile?.write_mode ?? "direct",
        app_permissions: appPermissionsOf(profile?.app_permissions),
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
    const { data: targetAccess } = await admin.from("superadmin_access").select("level").eq("user_id", target.id).maybeSingle();
    if (targetAccess && level !== "owner") return json(origin, 403, { ok: false, error: "Seul un propriétaire peut modifier la licence d'un administrateur." });
    const { error } = await admin.from("customer_licenses").upsert({ user_id: target.id, plan, status, device_limit: deviceLimit, expires_at: body.expiresAt || null, notes: textOf(body.notes, 2000), updated_at: new Date().toISOString() });
    if (!error) await audit("license.upsert", "user", target.id, { plan, status, deviceLimit });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "devices-list") {
    const targetEmail = emailOf(body.email); const users = await listAuthUsers(); const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
    const { data: targetAccess } = await admin.from("superadmin_access").select("level").eq("user_id", target.id).maybeSingle();
    if (targetAccess && level !== "owner") return json(origin, 403, { ok: false, error: "Seul un propriétaire peut consulter les appareils d'un administrateur." });
    const { data, error } = await admin.from("device_activations").select("id,device_name,app_version,revoked,first_seen_at,last_seen_at").eq("user_id", target.id).order("last_seen_at", { ascending: false });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "device-revoke") {
    const id = textOf(body.id, 64);
    const { data: device } = await admin.from("device_activations").select("user_id").eq("id", id).maybeSingle();
    if (!device) return json(origin, 404, { ok: false, error: "Appareil introuvable." });
    const { data: targetAccess } = await admin.from("superadmin_access").select("level").eq("user_id", device.user_id).maybeSingle();
    if (targetAccess && level !== "owner") return json(origin, 403, { ok: false, error: "Seul un propriétaire peut révoquer l'appareil d'un administrateur." });
    const { error } = await admin.from("device_activations").update({ revoked: true }).eq("id", id);
    if (!error) await audit("device.revoke", "device", id);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "release-list") {
    const { data, error } = await admin.from("release_records").select("*").order("created_at", { ascending: false });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "release-upsert") {
    const version = textOf(body.version, 32); const artifactUrl = textOf(body.artifactUrl, 2048); const signature = textOf(body.signature, 8192); const published = Boolean(body.published);
    if (!/^\d+\.\d+\.\d+$/.test(version) || !artifactUrl.startsWith("https://") || !artifactUrl.includes("/releases/download/") || !artifactUrl.toLowerCase().endsWith(".exe") || signature.length < 20) return json(origin, 400, { ok: false, error: "Utilise le lien direct GitHub vers l'installateur .exe signé." });
    if (published) {
      try {
        const artifact = await fetch(artifactUrl, { method: "HEAD", redirect: "follow" });
        if (!artifact.ok) return json(origin, 400, { ok: false, error: `L'installateur est inaccessible (HTTP ${artifact.status}).` });
      } catch {
        return json(origin, 400, { ok: false, error: "L'installateur GitHub est inaccessible." });
      }
      const { error: unpublishError } = await admin.from("release_records").update({ published: false, updated_at: new Date().toISOString() }).eq("published", true).neq("version", version);
      if (unpublishError) return json(origin, 500, { ok: false, error: unpublishError.message });
    }
    const { error } = await admin.from("release_records").upsert({ version, artifact_url: artifactUrl, signature, notes: textOf(body.notes, 5000), published, updated_at: new Date().toISOString() });
    if (!error) await audit("release.upsert", "release", version, { published });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, manifestUrl: `${supabaseUrl}/functions/v1/app-update` });
  }
  if (action === "library-list") {
    const { data, error } = await admin.from("library_textures").select("*").order("created_at", { ascending: false });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true, rows: data ?? [] });
  }
  if (action === "library-upsert") {
    const id = body.id ? textOf(body.id, 64) : undefined;
    const name = textOf(body.name, 256);
    const category = textOf(body.category, 64);
    const color = textOf(body.color, 64);
    const url = textOf(body.url, 2048);
    if (!name || !category || !color || !isManagedLibraryUrl(url)) return json(origin, 400, { ok: false, error: "Utilise une image de la bibliothèque Supabase gérée par la console." });
    const payload: Record<string, string | undefined> = { name, category, color, url };
    if (id) payload.id = id;
    const { data: upsertedData, error } = await admin.from("library_textures").upsert(payload).select().single();
    if (error) return json(origin, 500, { ok: false, error: error.message });
    await audit(id ? "library.update" : "library.create", "library_texture", upsertedData.id, { name });
    return json(origin, 200, { ok: true, data: upsertedData });
  }
  if (action === "library-upload-audit") {
    const path = textOf(body.path, 512);
    const width = Number(body.width);
    const height = Number(body.height);
    if (!path || !/^texture-[a-z0-9-]+\.webp$/i.test(path) || !Number.isInteger(width) || !Number.isInteger(height)) {
      return json(origin, 400, { ok: false, error: "Métadonnées de téléversement invalides." });
    }
    await audit("library.upload", "storage_object", path, { width, height });
    return json(origin, 200, { ok: true });
  }
  if (action === "library-delete") {
    const id = textOf(body.id, 64);
    if (!id) return json(origin, 400, { ok: false, error: "ID requis." });
    const { error } = await admin.from("library_textures").delete().eq("id", id);
    if (!error) await audit("library.delete", "library_texture", id);
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
    if (target.id === caller.id) return json(origin, 409, { ok: false, error: "Modifie ton propre accès depuis un autre compte propriétaire." });
    const nextLevel = body.level === "owner" ? "owner" : "collaborator";
    const { data: currentAccess } = await admin.from("superadmin_access").select("level").eq("user_id", target.id).maybeSingle();
    const { count: ownerCount } = await admin.from("superadmin_access").select("user_id", { count: "exact", head: true }).eq("level", "owner");
    if (currentAccess?.level === "owner" && nextLevel !== "owner" && (ownerCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de rétrograder le dernier propriétaire." });
    const { error } = await admin.from("superadmin_access").upsert({ user_id: target.id, level: nextLevel, permissions: nextPermissions, updated_at: new Date().toISOString() });
    if (error) return json(origin, 500, { ok: false, error: error.message });
    if (nextLevel === "owner") {
      const { error: profileError } = await admin.from("profiles").update({ role: "admin" }).eq("user_id", target.id);
      if (profileError) return json(origin, 500, { ok: false, error: profileError.message });
    }
    await audit("team.upsert", "user", target.id, { email: targetEmail, level: nextLevel });
    return json(origin, 200, { ok: true });
  }
  if (action === "team-delete") {
    const targetEmail = emailOf(body.email); if (targetEmail === caller.email.toLowerCase()) return json(origin, 409, { ok: false, error: "Impossible de retirer ton propre accès." });
    const users = await listAuthUsers(); const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
    const { data: targetAccess } = await admin.from("superadmin_access").select("level").eq("user_id", target.id).maybeSingle();
    const { count: ownerCount } = await admin.from("superadmin_access").select("user_id", { count: "exact", head: true }).eq("level", "owner");
    if (targetAccess?.level === "owner" && (ownerCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de retirer le dernier propriétaire." });
    const { error } = await admin.from("superadmin_access").delete().eq("user_id", target.id);
    if (!error) await audit("team.delete", "user", target.id, { email: targetEmail });
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }

  const users = await listAuthUsers();
  const targetEmail = emailOf(body.email);
  const target = users.find((user) => user.email?.toLowerCase() === targetEmail);
  if (action === "create") {
    const password = typeof body.password === "string" ? body.password : ""; const requestedRole = textOf(body.role, 16) || "membre"; const writeMode = textOf(body.writeMode, 16) || "direct";
    const appPermissions = appPermissionsOf(body.appPermissions);
    const isOwner = requestedRole === "owner";
    const role = isOwner ? "admin" : requestedRole;
    if (password.length < 10) return json(origin, 400, { ok: false, error: "Le mot de passe doit contenir au moins 10 caractères." });
    if (!validRoles.has(role) || !validWriteModes.has(writeMode) || !targetEmail || target) return json(origin, 400, { ok: false, error: "Compte, rôle ou mode invalide." });
    if (["admin", "owner"].includes(requestedRole) && level !== "owner") return json(origin, 403, { ok: false, error: "Seul un propriétaire peut créer un administrateur." });
    const { data, error } = await admin.auth.admin.createUser({ email: targetEmail, password, email_confirm: true });
    if (error || !data.user) return json(origin, 400, { ok: false, error: error?.message ?? "Création impossible." });
    const { error: profileError } = await admin.from("profiles").upsert({ user_id: data.user.id, email: targetEmail, role, write_mode: writeMode, app_permissions: appPermissions }, { onConflict: "user_id" });
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return json(origin, 500, { ok: false, error: profileError.message }); }
    if (isOwner) {
      const nextPermissions = Object.fromEntries(permissionKeys.map((key) => [key, true]));
      const { error: accessError } = await admin.from("superadmin_access").upsert({ user_id: data.user.id, level: "owner", permissions: nextPermissions, updated_at: new Date().toISOString() });
      if (accessError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json(origin, 500, { ok: false, error: accessError.message });
      }
    }
    await audit("user.create", "user", data.user.id, { email: targetEmail, role: isOwner ? "owner" : role });
    return json(origin, 200, { ok: true });
  }
  if (!target) return json(origin, 404, { ok: false, error: "Compte introuvable." });
  const { data: targetProfile } = await admin.from("profiles").select("role").eq("user_id", target.id).maybeSingle();
  const { data: targetAccess } = await admin.from("superadmin_access").select("level").eq("user_id", target.id).maybeSingle();
  const { count: adminCount } = await admin.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
  const { count: ownerCount } = await admin.from("superadmin_access").select("user_id", { count: "exact", head: true }).eq("level", "owner");
  if (targetAccess && level !== "owner") return json(origin, 403, { ok: false, error: "Seul un propriétaire peut gérer un autre administrateur." });
  if (action === "update") {
    const requestedRole = textOf(body.role, 16); const writeMode = textOf(body.writeMode, 16);
    const appPermissions = appPermissionsOf(body.appPermissions);
    const isOwner = requestedRole === "owner";
    const role = isOwner ? "admin" : requestedRole;
    if (!validRoles.has(role) || !validWriteModes.has(writeMode)) return json(origin, 400, { ok: false, error: "Rôle ou mode invalide." });
    if (["admin", "owner"].includes(requestedRole) && level !== "owner") return json(origin, 403, { ok: false, error: "Seul un propriétaire peut attribuer ce rôle." });
    if (target.id === caller.id && !isOwner) return json(origin, 409, { ok: false, error: "Tu ne peux pas retirer ton propre rôle propriétaire." });
    if (targetAccess?.level === "owner" && !isOwner && (ownerCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de rétrograder ou suspendre le dernier propriétaire." });
    if (targetProfile?.role === "admin" && role !== "admin" && (adminCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de retirer le dernier administrateur." });
    const { error } = await admin.from("profiles").upsert({ user_id: target.id, email: targetEmail, role, write_mode: writeMode, app_permissions: appPermissions }, { onConflict: "user_id" });
    if (!error) {
      if (isOwner) {
        const nextPermissions = Object.fromEntries(permissionKeys.map((key) => [key, true]));
        const { error: accessError } = await admin.from("superadmin_access").upsert({ user_id: target.id, level: "owner", permissions: nextPermissions, updated_at: new Date().toISOString() });
        if (accessError) return json(origin, 500, { ok: false, error: accessError.message });
      } else if (targetAccess?.level === "owner") {
        const { error: accessError } = await admin.from("superadmin_access").delete().eq("user_id", target.id);
        if (accessError) return json(origin, 500, { ok: false, error: accessError.message });
      }
      await audit("user.update", "user", target.id, { role: isOwner ? "owner" : role, writeMode, appPermissions });
    }
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "ban" || action === "unban") {
    if (target.id === caller.id) return json(origin, 409, { ok: false, error: "Action impossible sur ton propre compte." });
    if (action === "ban" && targetAccess?.level === "owner" && (ownerCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de bannir le dernier propriétaire." });
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
    const { error } = await admin.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: Deno.env.get("PUBLIC_SITE_URL") ?? "https://sr-editer.vercel.app/"
    });
    if (!error) await audit("user.password_recovery", "user", target.id);
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  if (action === "delete") {
    if (target.id === caller.id) return json(origin, 409, { ok: false, error: "Tu ne peux pas supprimer ton propre compte." });
    if (targetAccess?.level === "owner" && (ownerCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de supprimer le dernier propriétaire." });
    if (targetProfile?.role === "admin" && (adminCount ?? 0) <= 1) return json(origin, 409, { ok: false, error: "Impossible de supprimer le dernier administrateur." });
    const { error } = await admin.auth.admin.deleteUser(target.id);
    if (!error) {
      await Promise.all([
        admin.from("profiles").delete().eq("user_id", target.id),
        admin.from("customer_licenses").delete().eq("user_id", target.id),
        admin.from("device_activations").delete().eq("user_id", target.id),
        admin.from("superadmin_access").delete().eq("user_id", target.id)
      ]);
      await audit("user.delete", "user", target.id, { email: targetEmail });
    }
    return error ? json(origin, 500, { ok: false, error: error.message }) : json(origin, 200, { ok: true });
  }
  return json(origin, 400, { ok: false, error: "Action inconnue." });
});
