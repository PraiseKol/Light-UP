-- Create enum for competition status
CREATE TYPE public.competition_status AS ENUM ('waiting', 'round_1', 'round_2', 'round_3', 'final', 'completed');

-- Create competitions table
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status competition_status NOT NULL DEFAULT 'waiting',
  current_round INTEGER DEFAULT 0,
  round_started_at TIMESTAMPTZ,
  round_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  winner_user_id UUID,
  second_place_user_id UUID,
  third_place_user_id UUID
);

-- Create competition_players table
CREATE TABLE public.competition_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  player_name TEXT,
  group_letter TEXT, -- A, B, C, D, E, F or NULL for final
  round_eliminated INTEGER, -- 1, 2, 3, or NULL if still in
  total_score INTEGER DEFAULT 0,
  current_round_score INTEGER DEFAULT 0,
  is_qualified BOOLEAN DEFAULT true,
  selection_type TEXT DEFAULT 'monthly_top', -- monthly_top or manual
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Create competition_rounds table
CREATE TABLE public.competition_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  group_a_letter TEXT,
  group_b_letter TEXT,
  group_a_score INTEGER DEFAULT 0,
  group_b_score INTEGER DEFAULT 0,
  winning_group TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' -- pending, in_progress, completed
);

-- Create competition_answers table
CREATE TABLE public.competition_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  player_id UUID REFERENCES public.competition_players(id) ON DELETE CASCADE NOT NULL,
  question_id UUID NOT NULL,
  score INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitions
CREATE POLICY "Anyone can view competitions"
ON public.competitions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage competitions"
ON public.competitions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.game_users
    WHERE game_users.user_id = auth.uid()
    AND game_users.role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for competition_players
CREATE POLICY "Anyone can view competition players"
ON public.competition_players FOR SELECT
USING (true);

CREATE POLICY "Players can update their own score"
ON public.competition_players FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage competition players"
ON public.competition_players FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.game_users
    WHERE game_users.user_id = auth.uid()
    AND game_users.role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for competition_rounds
CREATE POLICY "Anyone can view competition rounds"
ON public.competition_rounds FOR SELECT
USING (true);

CREATE POLICY "Admins can manage competition rounds"
ON public.competition_rounds FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.game_users
    WHERE game_users.user_id = auth.uid()
    AND game_users.role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for competition_answers
CREATE POLICY "Anyone can view competition answers"
ON public.competition_answers FOR SELECT
USING (true);

CREATE POLICY "Players can insert their own answers"
ON public.competition_answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.competition_players
    WHERE competition_players.id = player_id
    AND competition_players.user_id = auth.uid()
  )
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_answers;

-- Create function to update group scores in real-time
CREATE OR REPLACE FUNCTION public.update_competition_group_score()
RETURNS TRIGGER AS $$
DECLARE
  player_group TEXT;
  comp_id UUID;
  round_num INTEGER;
  new_group_score INTEGER;
BEGIN
  -- Get player's group and competition info
  SELECT cp.group_letter, cp.competition_id INTO player_group, comp_id
  FROM public.competition_players cp
  WHERE cp.id = NEW.player_id;

  round_num := NEW.round_number;

  -- Calculate new group score
  SELECT COALESCE(SUM(ca.score), 0) INTO new_group_score
  FROM public.competition_answers ca
  JOIN public.competition_players cp ON ca.player_id = cp.id
  WHERE ca.competition_id = comp_id
  AND ca.round_number = round_num
  AND cp.group_letter = player_group;

  -- Update the round's group score
  IF player_group IN ('A', 'C', 'E') THEN
    UPDATE public.competition_rounds
    SET group_a_score = new_group_score
    WHERE competition_id = comp_id AND round_number = round_num;
  ELSE
    UPDATE public.competition_rounds
    SET group_b_score = new_group_score
    WHERE competition_id = comp_id AND round_number = round_num;
  END IF;

  -- Update player's current round score
  UPDATE public.competition_players
  SET current_round_score = (
    SELECT COALESCE(SUM(score), 0)
    FROM public.competition_answers
    WHERE player_id = NEW.player_id AND round_number = round_num
  ),
  total_score = total_score + NEW.score
  WHERE id = NEW.player_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for answer scoring
CREATE TRIGGER on_competition_answer_insert
AFTER INSERT ON public.competition_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_competition_group_score();