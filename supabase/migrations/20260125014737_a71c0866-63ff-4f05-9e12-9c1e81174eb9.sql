-- Add phase tracking columns for automated competition flow
ALTER TABLE competitions 
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'idle';

ALTER TABLE competitions 
ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMPTZ;

-- Add comment for phase values
COMMENT ON COLUMN competitions.phase IS 'Automation phase: idle, countdown, round_active, break, completed';