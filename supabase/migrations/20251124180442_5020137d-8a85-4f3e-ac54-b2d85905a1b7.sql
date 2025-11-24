-- Add column to track if user has seen the explainer video
ALTER TABLE game_users 
ADD COLUMN has_seen_explainer_video BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN game_users.has_seen_explainer_video IS 'Tracks whether the user has watched or skipped the onboarding explainer video';