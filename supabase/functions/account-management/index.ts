import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.4.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import {
  DiscordMembershipRequiredError,
  DiscordRulesRequiredError,
  getDiscordId,
  syncDiscordRole,
  type DiscordTier,
} from "../_shared/discord-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeTier(value: unknown): DiscordTier {
  return value === "standard" || value === "pro" || value === "premium" ? value : "free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  if (Number(req.headers.get("content-length") ?? 0) > 16_384) {
    return json(413, { error: "Request too large." });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json(401, { error: "Session required." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(503, { error: "Account service is not configured." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user?.id) return json(401, { error: "Invalid session." });
  const userEmail = user.email?.trim() ?? "";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, subscription_tier, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !profile) return json(409, { error: "SR Editer profile not found." });

  const discordId = getDiscordId(user);

  try {
    if (action === "sync-discord") {
      if (!discordId) return json(409, { error: "No Discord identity is linked." });
      const tier = normalizeTier(profile.subscription_tier);
      const result = await syncDiscordRole(discordId, tier, true);
      return json(200, { ok: true, tier, result });
    }

    if (action === "prepare-discord-unlink") {
      if (!discordId) return json(200, { ok: true, skipped: true });
      const result = await syncDiscordRole(discordId, "free");
      return json(200, { ok: true, tier: "free", result });
    }

    if (action !== "delete-account") return json(400, { error: "Unknown action." });

    if (!userEmail) {
      return json(409, {
        error: "Ajoute une adresse e-mail à ton compte avant de pouvoir le supprimer.",
      });
    }

    const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
    if (confirmation.toLowerCase() !== userEmail.toLowerCase()) {
      return json(400, { error: "Type the account email to confirm deletion." });
    }

    const { data: elevatedAccess } = await admin
      .from("superadmin_access")
      .select("level")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile.role === "admin" || elevatedAccess) {
      return json(409, { error: "Transfer administrator access before deleting this account." });
    }

    const customerId = typeof profile.stripe_customer_id === "string"
      ? profile.stripe_customer_id
      : "";
    if (customerId) {
      const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
      if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is not configured.");
      const stripe = new Stripe(stripeSecret, {
        apiVersion: "2022-11-15",
        httpClient: Stripe.createFetchHttpClient(),
      });
      const customer = await stripe.customers.retrieve(customerId);
      if (!("deleted" in customer && customer.deleted)) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 100,
        });
        for (const subscription of subscriptions.data) {
          if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
            await stripe.subscriptions.cancel(subscription.id);
          }
        }
        await stripe.customers.del(customerId);
      }
    }

    if (discordId) await syncDiscordRole(discordId, "free");

    const cleanupResults = await Promise.all([
      admin.from("support_tickets").delete().eq("user_id", user.id),
      admin.from("contact_messages").delete().ilike("email", userEmail),
      admin.from("admin_audit_logs").delete().eq("actor_user_id", user.id),
      admin.from("admin_audit_logs").delete().eq("target_id", user.id),
    ]);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;
    if (cleanupError) throw cleanupError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json(200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Account management error (${action}):`, error);
    if (error instanceof DiscordMembershipRequiredError) {
      return json(403, { error: message, code: "DISCORD_MEMBERSHIP_REQUIRED" });
    }
    if (error instanceof DiscordRulesRequiredError) {
      return json(403, { error: message, code: "DISCORD_RULES_REQUIRED" });
    }
    return json(502, { error: message });
  }
});
