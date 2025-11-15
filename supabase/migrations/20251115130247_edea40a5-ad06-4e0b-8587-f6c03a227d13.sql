-- Create push_subscriptions table for PWA notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add notification preferences to game_users table
ALTER TABLE game_users 
ADD COLUMN IF NOT EXISTS notify_challenge_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_challenge_closing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_lives_full BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_daily_streak BOOLEAN DEFAULT true;
