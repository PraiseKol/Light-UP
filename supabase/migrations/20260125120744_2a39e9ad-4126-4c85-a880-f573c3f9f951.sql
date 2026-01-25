-- Create global_settings table for app-wide configuration
CREATE TABLE public.global_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default theme
INSERT INTO public.global_settings (key, value) VALUES ('app_theme', 'default');

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for all users to get the theme)
CREATE POLICY "Anyone can read global settings"
  ON public.global_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update global settings"
  ON public.global_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_users.user_id = auth.uid()
      AND game_users.role IN ('admin', 'super_admin')
    )
  );