-- Add account_type to profiles for subscription access (paid/free) per product flow.
-- Webhook sets account_type = 'paid' on successful payment, 'free' on cancel.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'free';
  END IF;
END $$;

COMMENT ON COLUMN profiles.account_type IS 'Access tier: paid = full games, free = core only. Set by Stripe webhooks.';

-- Ensure existing active subscribers are marked paid
UPDATE profiles
SET account_type = 'paid'
WHERE subscription_status = 'active' AND (account_type IS NULL OR account_type = 'free');
