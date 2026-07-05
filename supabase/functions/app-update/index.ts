import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const headers: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Update service not configured" }), { status: 503, headers });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await admin
    .from("release_records")
    .select("version,notes,artifact_url,signature,updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 503, headers });
  }
  if (!data) return new Response(null, { status: 204, headers });

  const manifest = {
    version: data.version,
    notes: data.notes || `SR Editer ${data.version}`,
    pub_date: data.updated_at,
    platforms: {
      "windows-x86_64": {
        signature: data.signature,
        url: data.artifact_url
      }
    }
  };
  return new Response(request.method === "HEAD" ? null : JSON.stringify(manifest), { status: 200, headers });
});
