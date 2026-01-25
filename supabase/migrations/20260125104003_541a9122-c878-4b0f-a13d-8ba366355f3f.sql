-- Enable required extensions for server-side automation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to check and trigger competition automation
CREATE OR REPLACE FUNCTION public.trigger_competition_automation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_comp RECORD;
BEGIN
  -- Find active competition that needs phase transition
  SELECT id INTO active_comp
  FROM public.competitions
  WHERE status != 'completed'
    AND phase IS NOT NULL
    AND phase NOT IN ('idle', 'grouped', 'completed')
    AND phase_ends_at IS NOT NULL
    AND phase_ends_at <= NOW()
  LIMIT 1;

  -- If found, call the edge function
  IF active_comp.id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://rhanvchqlilmzxmufode.supabase.co/functions/v1/competition-automation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYW52Y2hxbGlsbXp4bXVmb2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDg5MzIsImV4cCI6MjA2ODA4NDkzMn0.OQ2cN38ZpK-J9GBCFMbqgSWxZxhl229CcBTr6EYS_as'
      ),
      body := jsonb_build_object('competitionId', active_comp.id)
    );
    RAISE LOG 'Competition automation triggered for competition: %', active_comp.id;
  END IF;
END;
$$;

-- Schedule 6 jobs at different second offsets for ~10s granularity
-- Each job runs every minute but with a pg_sleep offset to stagger execution
SELECT cron.schedule('comp-auto-0', '* * * * *', $$SELECT pg_sleep(0); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-10', '* * * * *', $$SELECT pg_sleep(10); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-20', '* * * * *', $$SELECT pg_sleep(20); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-30', '* * * * *', $$SELECT pg_sleep(30); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-40', '* * * * *', $$SELECT pg_sleep(40); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-50', '* * * * *', $$SELECT pg_sleep(50); SELECT public.trigger_competition_automation()$$);