-- Faith Runner game stats table
CREATE TABLE public.faith_runner_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  high_score INTEGER DEFAULT 0,
  total_distance INTEGER DEFAULT 0,
  total_scrolls INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  unlocked_characters TEXT[] DEFAULT ARRAY['faith_runner'],
  unlocked_environments TEXT[] DEFAULT ARRAY['desert_path'],
  selected_character TEXT DEFAULT 'faith_runner',
  power_up_levels JSONB DEFAULT '{"shield_of_faith": 1, "wings_of_grace": 1, "speed_of_spirit": 1, "lamp_of_truth": 1}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Faith Runner run history table
CREATE TABLE public.faith_runner_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distance INTEGER NOT NULL,
  scrolls_collected INTEGER DEFAULT 0,
  light_orbs_collected INTEGER DEFAULT 0,
  obstacles_avoided INTEGER DEFAULT 0,
  power_ups_used INTEGER DEFAULT 0,
  environment TEXT DEFAULT 'desert_path',
  ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.faith_runner_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faith_runner_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for faith_runner_stats
CREATE POLICY "Users can view their own stats"
  ON public.faith_runner_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.faith_runner_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.faith_runner_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for faith_runner_runs
CREATE POLICY "Users can view their own runs"
  ON public.faith_runner_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own runs"
  ON public.faith_runner_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow viewing leaderboard (top scores)
CREATE POLICY "Anyone can view run leaderboard"
  ON public.faith_runner_runs FOR SELECT
  USING (true);

-- Create function to get or create user stats
CREATE OR REPLACE FUNCTION public.get_or_create_faith_runner_stats(p_user_id UUID)
RETURNS faith_runner_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats faith_runner_stats;
BEGIN
  SELECT * INTO v_stats FROM faith_runner_stats WHERE user_id = p_user_id;
  
  IF v_stats IS NULL THEN
    INSERT INTO faith_runner_stats (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_stats;
  END IF;
  
  RETURN v_stats;
END;
$$;

-- Create function to save run and update stats
CREATE OR REPLACE FUNCTION public.save_faith_runner_run(
  p_user_id UUID,
  p_distance INTEGER,
  p_scrolls INTEGER,
  p_light_orbs INTEGER DEFAULT 0,
  p_obstacles_avoided INTEGER DEFAULT 0,
  p_power_ups_used INTEGER DEFAULT 0,
  p_environment TEXT DEFAULT 'desert_path'
)
RETURNS faith_runner_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats faith_runner_stats;
BEGIN
  -- Insert the run record
  INSERT INTO faith_runner_runs (user_id, distance, scrolls_collected, light_orbs_collected, obstacles_avoided, power_ups_used, environment)
  VALUES (p_user_id, p_distance, p_scrolls, p_light_orbs, p_obstacles_avoided, p_power_ups_used, p_environment);
  
  -- Update stats
  INSERT INTO faith_runner_stats (user_id, high_score, total_distance, total_scrolls, total_runs)
  VALUES (p_user_id, p_distance, p_distance, p_scrolls, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    high_score = GREATEST(faith_runner_stats.high_score, p_distance),
    total_distance = faith_runner_stats.total_distance + p_distance,
    total_scrolls = faith_runner_stats.total_scrolls + p_scrolls,
    total_runs = faith_runner_stats.total_runs + 1,
    updated_at = NOW()
  RETURNING * INTO v_stats;
  
  RETURN v_stats;
END;
$$;