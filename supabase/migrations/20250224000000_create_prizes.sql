-- Prize competition system for Goalactico
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query

CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'seasonal')),
  period TEXT NOT NULL,
  winner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awarded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prizes_winner_user_id ON prizes(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_prizes_type_period ON prizes(type, period);
CREATE INDEX IF NOT EXISTS idx_prizes_status ON prizes(status);

COMMENT ON TABLE prizes IS 'Prize competitions: admin creates after each period, confirms winner, adds description, marks as awarded when sent.';

-- RLS: users can read only their own prizes (for dashboard banner)
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own prizes"
  ON prizes FOR SELECT
  USING (auth.uid() = winner_user_id);
