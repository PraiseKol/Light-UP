import { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, getTheme } from '@/themes/themeConfig';
import { supabase } from '@/lib/supabaseClient';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, initialTheme = 'default' }) {
  const [theme, setTheme] = useState(initialTheme);
  
  // Update theme when initialTheme prop changes (e.g., after global data loads)
  useEffect(() => {
    if (initialTheme && initialTheme !== theme) {
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  // Subscribe to real-time global theme updates
  useEffect(() => {
    const channel = supabase
      .channel('global-theme')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'global_settings',
        filter: 'key=eq.app_theme'
      }, (payload) => {
        setTheme(payload.new.value);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const config = getTheme(theme);
  
  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      config,
      themes: THEMES 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default theme if used outside provider
    return {
      theme: 'default',
      setTheme: () => {},
      config: THEMES.default,
      themes: THEMES
    };
  }
  return context;
};
