import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.4.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { getPriceIdForTier, SITE_DASHBOARD_URL } from "../_shared/stripe-prices.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resolveReturnUrl(req: Request, provided?: string): string {
  if (provided && /^https?:\/\//i.test(provided)) return provided;
  const origin = req.headers.get("origin") || "";
  if (origin.startsWith("http://") || origin.startsWith("https://")) {
    // Tauri / localhost → send users back to the web dashboard after payment
    if (origin.includes("127.0.0.1") || origin.includes("localhost") || origin.includes("tauri")) {
      return SITE_DASHBOARD_URL;
    }
    return `${origin.replace(/\/$/, "")}/dashboard.html`;
  }
  return SITE_DASHBOARD_URL;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const tier = typeof body.tier === "string" ? body.tier : "";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const priceId = getPriceIdForTier(tier);
    if (!priceId) throw new Error("Invalid tier");

    const returnUrl = resolveReturnUrl(req, body.success_url || body.return_url);

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: returnUrl,
      cancel_url: returnUrl,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
        },
      },
    };

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else if (user.email) {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
