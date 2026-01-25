
# Plan: Convert Theme System to Admin-Controlled Global Setting

## Overview

Change the theme system from per-user preferences to a single global theme controlled by admins. All players will see the same theme, which an admin can switch from the Admin Dashboard.

---

## Current State

- Each user has a `selected_theme` column in `game_users`
- Users can switch themes via Settings modal
- `App.jsx` loads theme from user's `game_users.selected_theme`
- `ThemeContext` manages theme state per user

---

## Target State

- A single `global_settings` table stores the app-wide theme
- Only admins can change the theme via a new "Settings" tab in Admin Dashboard
- All users see the same theme fetched from `global_settings`
- Theme picker removed from user Settings modal

---

## Database Changes

### Create `global_settings` table

```sql
CREATE TABLE public.global_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default theme
INSERT INTO global_settings (key, value) VALUES ('app_theme', 'default');

-- RLS policies
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
```

---

## File Changes Summary

| File | Change | Description |
|------|--------|-------------|
| `src/App.jsx` | **MODIFY** | Fetch theme from `global_settings` instead of `game_users.selected_theme` |
| `src/context/ThemeContext.jsx` | **MODIFY** | Add real-time subscription to `global_settings` changes |
| `src/components/SettingsModal.jsx` | **MODIFY** | Remove theme picker section entirely |
| `src/pages/AdminDashboard.jsx` | **MODIFY** | Add new "Settings" tab |
| `src/admin/GlobalSettingsManager.jsx` | **NEW** | Admin component for theme switching |

---

## Implementation Details

### 1. App.jsx - Fetch Global Theme

Replace user-specific theme loading with global settings:

```javascript
// Instead of fetching from game_users.selected_theme
const { data: themeData } = await supabase
  .from("global_settings")
  .select("value")
  .eq("key", "app_theme")
  .single();

setSelectedTheme(themeData?.value || "default");
```

### 2. ThemeContext.jsx - Add Real-time Updates

Subscribe to theme changes so all users see updates immediately:

```javascript
useEffect(() => {
  // Subscribe to global_settings changes
  const subscription = supabase
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

  return () => subscription.unsubscribe();
}, []);
```

### 3. SettingsModal.jsx - Remove Theme Section

Remove lines 258-286 (the entire "Theme Selection" section):
- Delete the theme state: `const [selectedTheme, setSelectedTheme] = useState(...)`
- Delete the theme from `handleSave()`
- Delete the theme picker UI

### 4. AdminDashboard.jsx - Add Settings Tab

Add a new tab for global settings:

```javascript
// Add to imports
import GlobalSettingsManager from "@/admin/GlobalSettingsManager";

// Add to tabs
{tabButton("settings", "Settings")}

// Add to renderTabContent
case "settings":
  return <GlobalSettingsManager />;
```

### 5. New: GlobalSettingsManager.jsx

Create a new admin component for managing app-wide settings:

```javascript
// src/admin/GlobalSettingsManager.jsx
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { THEMES } from "@/themes/themeConfig";

export default function GlobalSettingsManager() {
  const [currentTheme, setCurrentTheme] = useState("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch current theme
    const fetchTheme = async () => {
      const { data } = await supabase
        .from("global_settings")
        .select("value")
        .eq("key", "app_theme")
        .single();
      if (data) setCurrentTheme(data.value);
    };
    fetchTheme();
  }, []);

  const handleThemeChange = async (newTheme) => {
    setSaving(true);
    await supabase
      .from("global_settings")
      .update({ 
        value: newTheme, 
        updated_at: new Date().toISOString() 
      })
      .eq("key", "app_theme");
    setCurrentTheme(newTheme);
    setSaving(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🎨 App Theme</h2>
      <p className="text-gray-600 mb-4">
        Select the visual theme for all players. Changes apply immediately to everyone.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-md">
        {Object.entries(THEMES).map(([key, themeData]) => (
          <button
            key={key}
            onClick={() => handleThemeChange(key)}
            disabled={saving}
            className={`p-4 rounded-xl border-2 transition-all ${
              currentTheme === key
                ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{themeData.icon}</div>
            <div className="text-sm font-medium">{themeData.name}</div>
          </button>
        ))}
      </div>
      {saving && <p className="text-blue-500 mt-2">Saving...</p>}
    </div>
  );
}
```

---

## Visual Changes

### Admin Dashboard
- New "Settings" tab appears in the tab bar
- Theme picker UI with 3 large buttons (Default ✨, Easter 🐰, Christmas 🎄)
- Current theme highlighted with blue border

### User Settings Modal
- Theme section completely removed
- Users no longer see any theme switching options

---

## Real-time Sync

When an admin changes the theme:
1. Update is saved to `global_settings` table
2. Supabase real-time broadcasts the change
3. All connected clients receive the update via subscription
4. `ThemeContext` updates, triggering re-render of themed components
5. All players see the new theme within seconds

---

## Implementation Order

1. **Database**: Create `global_settings` table with RLS policies
2. **Admin UI**: Create `GlobalSettingsManager.jsx`
3. **Admin Dashboard**: Add Settings tab
4. **App.jsx**: Switch to fetch from `global_settings`
5. **ThemeContext**: Add real-time subscription
6. **SettingsModal**: Remove theme picker section
