-- Allow all authenticated users to read progress data for leaderboards
-- This is required for monthly/weekly leaderboard aggregation to show all players

CREATE POLICY "Allow authenticated users to read all progress for leaderboards"
ON progress
FOR SELECT
TO authenticated
USING (true);