-- Create mini_game_settings table for controlling mini-game visibility
CREATE TABLE public.mini_game_settings (
  game_key TEXT PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mini_game_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Anyone can read mini game settings"
ON public.mini_game_settings
FOR SELECT
USING (true);

-- Allow authenticated users to update (admin check should be in app logic)
CREATE POLICY "Authenticated users can update mini game settings"
ON public.mini_game_settings
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Insert default scripture_match setting
INSERT INTO public.mini_game_settings (game_key, is_active)
VALUES ('scripture_match', false)
ON CONFLICT (game_key) DO NOTHING;