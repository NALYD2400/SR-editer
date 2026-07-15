import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.4.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { tierFromPriceId, type SubscriptionTier } from "../_shared/stripe-prices.ts";
import { getDiscordId, syncDiscordRole } from "../_shared/discord-sync.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});
async function resolveTierFromSubscription(
  subscription: Stripe.Subscription,
): Promise<SubscriptionTier> {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = tierFromPriceId(priceId);
  if (tier === "free" && priceId) console.error(`Unknown Stripe price id: ${priceId}`);
  return tier;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncUserDiscordRole(supabaseAdmin: any, userId: string, tier: SubscriptionTier) {
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUser(userId);
  if (error || !user) throw error ?? new Error(`Auth user ${userId} was not found.`);

  const discordId = getDiscordId(user);
  if (!discordId) {
    console.log(`User ${userId} does not have a linked Discord account.`);
    return;
  }

  await syncDiscordRole(discordId, tier);
  console.log(`Discord role synced for user ${userId} (${discordId}) to tier ${tier}.`);
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Stripe signature error: ${message}`);
    return new Response(`Webhook signature error: ${message}`, { status: 400 });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id || null;
        if (!userId) throw new Error(`No user id on checkout session ${session.id}.`);

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        let tier: SubscriptionTier =
          (session.metadata?.tier as SubscriptionTier) || "free";

        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const fromPrice = await resolveTierFromSubscription(subscription);
            if (fromPrice !== "free") tier = fromPrice;
          } catch (error) {
            console.error("Failed to retrieve subscription for checkout:", error);
          }
        }

        const update: Record<string, unknown> = { subscription_status: "active" };
        if (customerId) update.stripe_customer_id = customerId;
        if (tier !== "free") update.subscription_tier = tier;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(update)
          .eq("user_id", userId);
        if (updateError) throw updateError;

        await syncUserDiscordRole(supabaseAdmin, userId, tier);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
        const status = subscription.status;
        let userId = subscription.metadata?.user_id || null;

        if (!userId && customerId) {
          const { data: profiles, error: lookupError } = await supabaseAdmin
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .limit(1);
          if (lookupError) throw lookupError;
          userId = profiles?.[0]?.user_id ?? null;
        }
        if (!userId) throw new Error(`No profile found for Stripe customer ${customerId}.`);

        let tier: SubscriptionTier = "free";
        if (status === "active" || status === "trialing") {
          tier = await resolveTierFromSubscription(subscription);
          if (tier === "free" && subscription.metadata?.tier) {
            const metadataTier = subscription.metadata.tier as SubscriptionTier;
            if (["standard", "pro", "premium"].includes(metadataTier)) tier = metadataTier;
          }
        }

        const update: Record<string, unknown> = {
          subscription_status: status,
          subscription_tier: tier,
        };
        if (customerId) update.stripe_customer_id = customerId;

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(update)
          .eq("user_id", userId);
        if (updateError) throw updateError;

        await syncUserDiscordRole(supabaseAdmin, userId, tier);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Webhook processing error: ${message}`);
    return new Response(`Webhook processing error: ${message}`, { status: 500 });
  }
});
