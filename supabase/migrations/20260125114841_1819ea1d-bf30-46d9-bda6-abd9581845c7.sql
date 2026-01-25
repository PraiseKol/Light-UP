-- Add selected_theme column to game_users
ALTER TABLE public.game_users 
ADD COLUMN IF NOT EXISTS selected_theme text DEFAULT 'default';

-- Add comment for documentation
COMMENT ON COLUMN public.game_users.selected_theme IS 'User selected visual theme: default, easter, christmas';