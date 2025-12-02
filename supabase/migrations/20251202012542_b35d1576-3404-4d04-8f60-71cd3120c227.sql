-- Add consecutive_perfects column to game_users for accuracy bonus tracking
ALTER TABLE public.game_users 
ADD COLUMN consecutive_perfects INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.game_users.consecutive_perfects IS 'Tracks consecutive perfect (100 score) levels for accuracy bonus awards';