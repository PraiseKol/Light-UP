-- Add selected_avatar column to game_users table
ALTER TABLE game_users 
ADD COLUMN IF NOT EXISTS selected_avatar text DEFAULT 'avatar1';

COMMENT ON COLUMN game_users.selected_avatar IS 'Currently selected avatar ID (avatar1-avatar5). Avatar unlocks: avatar1&2=start, avatar3=Phase5, avatar4=Phase10, avatar5=Phase20';