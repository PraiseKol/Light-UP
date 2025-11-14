-- Drop old trigger function
DROP FUNCTION IF EXISTS set_week_start_date_trigger() CASCADE;

-- Create improved version with timezone support and proper Friday calculation
CREATE OR REPLACE FUNCTION set_week_start_date_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  day_diff INTEGER;
  friday_start TIMESTAMP WITH TIME ZONE;
  current_hour INTEGER;
BEGIN
  -- Get day of week and hour from attempted_at
  day_diff := EXTRACT(DOW FROM NEW.attempted_at)::int;
  current_hour := EXTRACT(HOUR FROM NEW.attempted_at)::int;
  
  -- Calculate days since last Friday
  IF day_diff = 0 THEN
    -- Sunday → last Friday was 2 days ago
    day_diff := 2;
  ELSIF day_diff = 1 THEN
    -- Monday: if before noon, use last Friday (3 days ago), else next Friday (4 days ahead)
    day_diff := CASE WHEN current_hour < 12 THEN 3 ELSE -4 END;
  ELSIF day_diff = 5 THEN
    -- Friday: if before noon, use last Friday (7 days ago), else current Friday (today)
    day_diff := CASE WHEN current_hour < 12 THEN 7 ELSE 0 END;
  ELSIF day_diff = 6 THEN
    -- Saturday → last Friday was yesterday
    day_diff := 1;
  ELSE
    -- Tuesday (2), Wednesday (3), Thursday (4)
    day_diff := day_diff + 2;
  END IF;
  
  -- Calculate Friday 12PM
  friday_start := (NEW.attempted_at::date - day_diff) + INTERVAL '12 hours';
  
  -- Store as date only (YYYY-MM-DD)
  NEW.week_start_date := friday_start::date;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_set_week_start ON weekly_challenges;
CREATE TRIGGER trg_set_week_start
  BEFORE INSERT ON weekly_challenges
  FOR EACH ROW
  EXECUTE FUNCTION set_week_start_date_trigger();