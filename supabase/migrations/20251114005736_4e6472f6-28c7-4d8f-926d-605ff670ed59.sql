-- Drop existing view
DROP VIEW IF EXISTS weekly_leaderboard;

-- Create new view with correct challenge window logic
CREATE OR REPLACE VIEW weekly_leaderboard AS
WITH challenge_window AS (
  -- Calculate the current or most recent challenge week
  SELECT DISTINCT
    week_start_date,
    -- Challenge starts Friday 12:00 PM
    (week_start_date::timestamp + INTERVAL '12 hours') AS challenge_start,
    -- Challenge ends Monday 12:00 AM (midnight)
    ((week_start_date::timestamp + INTERVAL '3 days'))::timestamp AS challenge_end,
    -- Check if challenge is currently active
    NOW() >= (week_start_date::timestamp + INTERVAL '12 hours') 
      AND NOW() < ((week_start_date::timestamp + INTERVAL '3 days'))::timestamp AS is_active
  FROM weekly_challenges
  ORDER BY week_start_date DESC
  LIMIT 2  -- Get current and previous week
),
target_week AS (
  -- If challenge is active, show current week; otherwise show most recent completed week
  SELECT 
    week_start_date,
    challenge_start,
    challenge_end,
    is_active
  FROM challenge_window
  WHERE is_active = true
  
  UNION ALL
  
  -- If no active challenge, get the most recently completed one
  SELECT 
    week_start_date,
    challenge_start,
    challenge_end,
    false as is_active
  FROM challenge_window
  WHERE NOT EXISTS (SELECT 1 FROM challenge_window WHERE is_active = true)
  ORDER BY week_start_date DESC
  LIMIT 1
)
SELECT 
  wc.user_id,
  gu.player_name,
  wc.score,
  tw.week_start_date,
  tw.is_active
FROM weekly_challenges wc
JOIN target_week tw ON wc.week_start_date = tw.week_start_date
JOIN game_users gu ON gu.user_id = wc.user_id
LEFT JOIN weekly_leaderboard_bans wb ON wb.user_id = wc.user_id
WHERE wb.user_id IS NULL  -- Exclude banned users
ORDER BY wc.score DESC
LIMIT 10;