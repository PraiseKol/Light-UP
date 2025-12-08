-- Add max_attempts column to pop_game_sessions table
ALTER TABLE public.pop_game_sessions 
ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3;