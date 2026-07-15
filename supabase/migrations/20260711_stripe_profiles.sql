-- Stripe subscription columns on profiles (source of truth for desktop + portal)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_subscription_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_tier_check
      CHECK (subscription_tier IN ('free', 'standard', 'pro', 'premium'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.subscription_tier IS 'Stripe/paid entitlement: free|standard|pro|premium';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Stripe subscription status (active, canceled, etc.)';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID for billing portal';
