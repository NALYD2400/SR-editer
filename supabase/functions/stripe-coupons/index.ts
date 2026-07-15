import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.4.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function assertBillingAccess(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: access } = await admin
    .from("superadmin_access")
    .select("level, permissions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (access) {
    const level = access.level as string;
    const permissions = (access.permissions || {}) as Record<string, boolean>;
    if (level === "owner" || permissions.billing === true || permissions.coupons === true) {
      return user;
    }
  }

  // Fallback: profiles.role = admin (legacy)
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") return user;

  throw new Error("Admin access required");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    await assertBillingAccess(authHeader);

    const { action, coupon, couponId } = await req.json();

    if (action === "list") {
      const coupons = await stripe.coupons.list({ limit: 100 });
      return new Response(JSON.stringify({ coupons: coupons.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const createdCoupon = await stripe.coupons.create(coupon);
      return new Response(JSON.stringify(createdCoupon), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && couponId) {
      const deletedCoupon = await stripe.coupons.del(couponId);
      return new Response(JSON.stringify(deletedCoupon), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
