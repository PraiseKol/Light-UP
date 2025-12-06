-- Create pop game sessions table
CREATE TABLE public.pop_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'inactive',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pop game scores table
CREATE TABLE public.pop_game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES pop_game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  player_name TEXT,
  attempt_number INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pop_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_game_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for pop_game_sessions
CREATE POLICY "Anyone can view pop game sessions"
ON public.pop_game_sessions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pop game sessions"
ON public.pop_game_sessions FOR ALL
USING (EXISTS (
  SELECT 1 FROM game_users
  WHERE game_users.user_id = auth.uid()
  AND game_users.role IN ('admin', 'super_admin')
));

-- RLS policies for pop_game_scores
CREATE POLICY "Anyone can view pop game scores"
ON public.pop_game_scores FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own scores"
ON public.pop_game_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pop_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE pop_game_scores;