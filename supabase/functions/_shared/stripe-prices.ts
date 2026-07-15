/** Shared Stripe price ID helpers for edge functions. */

export type SubscriptionTier = "free" | "standard" | "pro" | "premium";

const FALLBACK_PRICES: Record<Exclude<SubscriptionTier, "free">, string> = {
  standard: "price_1Ts1m6FsXnUoET6TnguqshCg",
  pro: "price_1Ts1m7FsXnUoET6T2cUyCREX",
  premium: "price_1Ts1m9FsXnUoET6T2hyEAH5M",
};

export function getPriceIdForTier(tier: string): string | null {
  if (tier !== "standard" && tier !== "pro" && tier !== "premium") return null;
  const envKey =
    tier === "standard"
      ? "STRIPE_PRICE_STANDARD"
      : tier === "pro"
        ? "STRIPE_PRICE_PRO"
        : "STRIPE_PRICE_PREMIUM";
  return Deno.env.get(envKey)?.trim() || FALLBACK_PRICES[tier];
}

export function tierFromPriceId(priceId: string | undefined | null): SubscriptionTier {
  if (!priceId) return "free";
  for (const tier of ["standard", "pro", "premium"] as const) {
    if (getPriceIdForTier(tier) === priceId) return tier;
  }
  return "free";
}

/** Manual admin license plan → subscription_tier mirror. */
export function tierFromLicensePlan(plan: string | undefined | null): SubscriptionTier {
  switch (plan) {
    case "pro":
      return "pro";
    case "studio":
    case "lifetime":
      return "premium";
    case "standard":
      return "standard";
    default:
      return "free";
  }
}

export const SITE_DASHBOARD_URL = "https://sr-editer.vercel.app/dashboard.html";
