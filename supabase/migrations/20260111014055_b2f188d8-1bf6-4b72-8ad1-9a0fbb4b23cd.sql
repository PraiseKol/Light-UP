-- Insert pop_game entry into mini_game_settings for admin toggle
INSERT INTO mini_game_settings (game_key, is_active, updated_at)
VALUES ('pop_game', false, NOW())
ON CONFLICT (game_key) DO NOTHING;

-- Create table for storing top 3 best scores per player
CREATE TABLE pop_game_best_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, rank)
);

-- Enable RLS
ALTER TABLE pop_game_best_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view best scores (for potential leaderboard)
CREATE POLICY "Anyone can view pop game best scores"
  ON pop_game_best_scores FOR SELECT
  USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own best scores"
  ON pop_game_best_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update their own best scores"
  ON pop_game_best_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own scores (for cleanup)
CREATE POLICY "Users can delete their own best scores"
  ON pop_game_best_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_pop_game_best_scores_user_id ON pop_game_best_scores(user_id);
CREATE INDEX idx_pop_game_best_scores_score ON pop_game_best_scores(score DESC);