import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set(
  (Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const validRoles = new Set(["membre", "moderateur", "admin", "suspendu"]);
const validWriteModes = new Set(["direct", "draft"]);

function corsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && (allowedOrigins.size === 0 || allowedOrigins.has(origin)) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
}

function response(origin: string | null, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return response(origin, 405, { ok: false, error: "Méthode refusée." });
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return response(origin, 403, { ok: false, error: "Origine refusée." });
  }
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response(origin, 503, { ok: false, error: "Service administrateur non configuré." });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return response(origin, 401, { ok: false, error: "Session requise." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const caller = userData.user;
  if (userError || !caller?.id || !caller.email) {
    return response(origin, 401, { ok: false, error: "Session invalide." });
  }

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("user_id,email,role,write_mode,created_at")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (callerProfile?.role !== "admin") {
    return response(origin, 403, { ok: false, error: "Accès administrateur requis." });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response(origin, 400, { ok: false, error: "Requête JSON invalide." });
  }
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "me") return response(origin, 200, { ok: true, profile: callerProfile });

  const { data: authPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return response(origin, 500, { ok: false, error: listError.message });
  const authUsers = authPage.users;

  if (action === "list") {
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("user_id,email,role,write_mode,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return response(origin, 500, { ok: false, error: error.message });
    const profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const users = authUsers.map((user) => {
      const profile = profilesByUserId.get(user.id);
      return {
        user_id: user.id,
        email: user.email ?? profile?.email ?? "",
        created_at: profile?.created_at ?? user.created_at,
        role: profile?.role ?? "membre",
        write_mode: profile?.write_mode ?? "direct"
      };
    });
    return response(origin, 200, { ok: true, users });
  }

  const email = normalizeEmail(body.email);
  if (!email) return response(origin, 400, { ok: false, error: "Adresse e-mail requise." });
  const targetUser = authUsers.find((user) => user.email?.toLowerCase() === email);

  if (action === "create") {
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "membre";
    const writeMode = typeof body.writeMode === "string" ? body.writeMode : "direct";
    if (password.length < 8) return response(origin, 400, { ok: false, error: "Le mot de passe doit contenir au moins 8 caractères." });
    if (!validRoles.has(role) || !validWriteModes.has(writeMode)) {
      return response(origin, 400, { ok: false, error: "Rôle ou mode d'écriture invalide." });
    }
    if (targetUser) return response(origin, 409, { ok: false, error: "Ce compte existe déjà." });
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return response(origin, 400, { ok: false, error: error?.message ?? "Création impossible." });
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: data.user.id,
      email,
      role,
      write_mode: writeMode
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return response(origin, 500, { ok: false, error: profileError.message });
    }
    return response(origin, 200, { ok: true });
  }

  if (!targetUser) return response(origin, 404, { ok: false, error: "Compte introuvable." });
  const { data: targetProfile } = await admin.from("profiles").select("role").eq("user_id", targetUser.id).maybeSingle();
  const { count: adminCount } = await admin.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "admin");

  if (action === "update") {
    const role = typeof body.role === "string" ? body.role : "membre";
    const writeMode = typeof body.writeMode === "string" ? body.writeMode : "direct";
    if (!validRoles.has(role) || !validWriteModes.has(writeMode)) {
      return response(origin, 400, { ok: false, error: "Rôle ou mode d'écriture invalide." });
    }
    if (targetProfile?.role === "admin" && role !== "admin" && (adminCount ?? 0) <= 1) {
      return response(origin, 409, { ok: false, error: "Impossible de retirer le dernier administrateur." });
    }
    const { error } = await admin.from("profiles").upsert({
      user_id: targetUser.id,
      email,
      role,
      write_mode: writeMode
    }, { onConflict: "user_id" });
    return error
      ? response(origin, 500, { ok: false, error: error.message })
      : response(origin, 200, { ok: true });
  }

  if (action === "delete") {
    if (targetUser.id === caller.id) return response(origin, 409, { ok: false, error: "Tu ne peux pas supprimer ton propre compte." });
    if (targetProfile?.role === "admin" && (adminCount ?? 0) <= 1) {
      return response(origin, 409, { ok: false, error: "Impossible de supprimer le dernier administrateur." });
    }
    const { error } = await admin.auth.admin.deleteUser(targetUser.id);
    return error
      ? response(origin, 500, { ok: false, error: error.message })
      : response(origin, 200, { ok: true });
  }

  return response(origin, 400, { ok: false, error: "Action inconnue." });
});
