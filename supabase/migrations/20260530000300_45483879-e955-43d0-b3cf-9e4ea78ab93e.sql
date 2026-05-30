
-- Daily quests per-user log
CREATE TABLE IF NOT EXISTS public.daily_quests_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quest_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  quests JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_date)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_quests_log TO authenticated;
GRANT ALL ON public.daily_quests_log TO service_role;

ALTER TABLE public.daily_quests_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own quest log"
ON public.daily_quests_log
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER daily_quests_log_updated_at
BEFORE UPDATE ON public.daily_quests_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Achievements catalogue
CREATE TABLE IF NOT EXISTS public.achievements (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  tier TEXT NOT NULL DEFAULT 'bronze',
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are public"
ON public.achievements
FOR SELECT
USING (true);

-- Per-user unlocked achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL REFERENCES public.achievements(key) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can record their own achievements"
ON public.user_achievements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievement counts"
ON public.user_achievements
FOR SELECT
USING (true);

-- Seed achievement catalogue
INSERT INTO public.achievements (key, title, description, icon, tier, criteria_type, criteria_value) VALUES
  ('first_steps', 'First Steps', 'Complete your first level', '👣', 'bronze', 'levels_completed', 1),
  ('level_10', 'Getting Started', 'Complete 10 levels', '🎯', 'bronze', 'levels_completed', 10),
  ('level_50', 'Dedicated', 'Complete 50 levels', '⭐', 'silver', 'levels_completed', 50),
  ('level_100', 'Centurion', 'Complete 100 levels', '💯', 'gold', 'levels_completed', 100),
  ('first_perfect', 'Flawless', 'Get your first perfect score', '✨', 'bronze', 'perfect_scores', 1),
  ('perfect_10', 'Precision', '10 perfect scores', '💎', 'silver', 'perfect_scores', 10),
  ('streak_3', 'On Fire', '3-day playing streak', '🔥', 'bronze', 'daily_streak', 3),
  ('streak_7', 'Week Warrior', '7-day playing streak', '🏆', 'silver', 'daily_streak', 7),
  ('streak_30', 'Unstoppable', '30-day playing streak', '👑', 'gold', 'daily_streak', 30),
  ('score_1k', 'Scholar', 'Reach 1,000 total score', '📚', 'bronze', 'total_score', 1000),
  ('score_10k', 'Sage', 'Reach 10,000 total score', '🧙', 'silver', 'total_score', 10000),
  ('score_50k', 'Prophet', 'Reach 50,000 total score', '🕊️', 'gold', 'total_score', 50000),
  ('phase_1', 'Genesis', 'Finish Phase 1', '📖', 'bronze', 'phase_completed', 1),
  ('phase_2', 'Exodus', 'Finish Phase 2', '📜', 'bronze', 'phase_completed', 2),
  ('phase_3', 'Wisdom', 'Finish Phase 3', '🦉', 'silver', 'phase_completed', 3),
  ('tournament_finalist', 'Finalist', 'Reach the tournament final', '🥈', 'gold', 'tournament_final', 1),
  ('tournament_champion', 'Champion', 'Win a tournament', '🏆', 'gold', 'tournament_won', 1),
  ('quest_first', 'Quester', 'Complete your first daily quest', '🎯', 'bronze', 'quests_completed', 1),
  ('quest_10', 'Quest Master', 'Complete 10 daily quests', '⚔️', 'silver', 'quests_completed', 10),
  ('quest_50', 'Quest Legend', 'Complete 50 daily quests', '🛡️', 'gold', 'quests_completed', 50)
ON CONFLICT (key) DO NOTHING;
