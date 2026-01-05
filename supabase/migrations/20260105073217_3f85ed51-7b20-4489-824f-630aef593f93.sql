-- Drop the old functions first with CASCADE
DROP FUNCTION IF EXISTS get_or_create_faith_runner_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS save_faith_runner_run(UUID, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) CASCADE;

-- Now drop old Faith Runner tables
DROP TABLE IF EXISTS faith_runner_runs CASCADE;
DROP TABLE IF EXISTS faith_runner_stats CASCADE;