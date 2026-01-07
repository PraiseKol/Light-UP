-- Create scripture_match_stats table for tracking player progress
CREATE TABLE public.scripture_match_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  high_score INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  unlocked_levels INTEGER DEFAULT 1,
  fastest_completion_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scripture_match_games table for individual game records
CREATE TABLE public.scripture_match_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  moves INTEGER NOT NULL,
  time_ms INTEGER NOT NULL,
  score INTEGER NOT NULL,
  match_type TEXT,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scripture_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripture_match_games ENABLE ROW LEVEL SECURITY;

-- RLS policies for scripture_match_stats
CREATE POLICY "Users can view their own stats"
ON public.scripture_match_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
ON public.scripture_match_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.scripture_match_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for scripture_match_games
CREATE POLICY "Users can view their own games"
ON public.scripture_match_games
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own games"
ON public.scripture_match_games
FOR INSERT
WITH CHECK (auth.uid() = user_id);