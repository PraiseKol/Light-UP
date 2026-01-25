
# Plan: Seasonal Theme System

## Overview

Add a theme switching system that allows users to select between **Default** (spiritual/candy), **Easter**, and **Christmas** themes via the Settings modal. The selected theme will be saved to the database and applied app-wide, affecting backgrounds, decorative elements, color schemes, and accent emojis.

---

## Architecture

### Theme Structure

```text
src/
├── context/
│   └── ThemeContext.jsx          # NEW - React context for theme state
├── themes/
│   ├── themeConfig.js            # NEW - Theme definitions (colors, emojis, gradients)
│   └── ThemedBackground.jsx      # NEW - Unified background component
├── components/
│   ├── SettingsModal.jsx         # MODIFY - Add theme picker
│   ├── MapBackground.jsx         # MODIFY - Use theme context
│   ├── GameScreen.jsx            # MODIFY - Use themed background
│   ├── PowerUpStore.jsx          # MODIFY - Use theme colors
│   └── PopGameItem.jsx           # MODIFY - Add theme-based items
├── pages/
│   ├── LoginPage.jsx             # MODIFY - Use themed background
│   └── WeeklyChallengeScreen.jsx # MODIFY - Use themed background
```

---

## Database Changes

### Add `selected_theme` column to `game_users`

```sql
ALTER TABLE public.game_users 
ADD COLUMN selected_theme text DEFAULT 'default';

-- Add comment for documentation
COMMENT ON COLUMN public.game_users.selected_theme IS 'User selected visual theme: default, easter, christmas';
```

---

## Theme Definitions

### File: `src/themes/themeConfig.js`

Each theme defines:
- **Background gradients** (primary gradient colors)
- **Accent colors** (for buttons, highlights)
- **Decorative emojis** (theme-specific floating elements)
- **Particle colors** (for floating light particles)
- **Special elements** (crosses become Easter eggs, etc.)

```javascript
export const THEMES = {
  default: {
    name: 'Default',
    icon: '✨',
    description: 'Classic spiritual theme',
    background: {
      gradient: 'from-indigo-900 via-purple-900 to-blue-900',
      particleColor: 'bg-candyYellow/30',
    },
    decorations: {
      primary: ['🕊️', '✝️', '👼'],
      secondary: ['⭐', '✨'],
      floating: '🕊️',
    },
    accent: {
      primary: 'candyYellow',
      secondary: 'candyPink',
      glow: 'rgba(255,217,61,0.8)',
    },
    popGameItems: {
      special: { emoji: '🕊️', name: 'dove' },
    }
  },
  
  easter: {
    name: 'Easter',
    icon: '🐰',
    description: 'Celebrate the resurrection',
    background: {
      gradient: 'from-sky-400 via-purple-300 to-pink-200',
      particleColor: 'bg-pink-300/40',
    },
    decorations: {
      primary: ['🐰', '🥚', '🌷'],
      secondary: ['🦋', '🌸', '☀️'],
      floating: '🐰',
    },
    accent: {
      primary: 'pink-400',
      secondary: 'purple-400',
      glow: 'rgba(236,72,153,0.8)',
    },
    popGameItems: {
      special: { emoji: '🥚', name: 'egg' },
    }
  },
  
  christmas: {
    name: 'Christmas',
    icon: '🎄',
    description: 'Celebrate the birth of Christ',
    background: {
      gradient: 'from-slate-900 via-blue-950 to-indigo-950',
      particleColor: 'bg-white/40',
    },
    decorations: {
      primary: ['🎄', '⭐', '🎅'],
      secondary: ['❄️', '🎁', '🔔'],
      floating: '❄️',
      snowfall: true,
    },
    accent: {
      primary: 'red-500',
      secondary: 'green-600',
      glow: 'rgba(239,68,68,0.8)',
    },
    popGameItems: {
      special: { emoji: '🎅', name: 'santa' },
    }
  }
};
```

---

## Theme Context

### File: `src/context/ThemeContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { THEMES } from '@/themes/themeConfig';

const ThemeContext = createContext();

export function ThemeProvider({ children, initialTheme = 'default' }) {
  const [theme, setTheme] = useState(initialTheme);
  
  const themeConfig = THEMES[theme] || THEMES.default;
  
  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      config: themeConfig,
      themes: THEMES 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## Themed Background Component

### File: `src/themes/ThemedBackground.jsx`

A unified background component that renders differently based on the current theme:

```javascript
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

export default function ThemedBackground({ starCount = 60 }) {
  const { config, theme } = useTheme();
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.background.gradient}`} />
      
      {/* Stars (all themes) */}
      <div className="absolute inset-0">
        {[...Array(starCount)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Snowfall for Christmas */}
      {config.decorations.snowfall && <SnowfallEffect />}
      
      {/* Floating decorations */}
      <FloatingDecorations decorations={config.decorations} />
      
      {/* Themed particles */}
      <FloatingParticles color={config.background.particleColor} />
      
      {/* Rolling hills */}
      <Hills theme={theme} />
    </div>
  );
}
```

---

## Settings Modal Update

### Modify: `src/components/SettingsModal.jsx`

Add a theme picker section between the avatar selection and notifications:

```javascript
// Inside SettingsModal component

const [selectedTheme, setSelectedTheme] = useState(gameUser?.selected_theme || 'default');

// In handleSave:
await supabase
  .from("game_users")
  .update({
    player_name: name,
    sound,
    effects_on: effectsOn,
    selected_avatar: selectedAvatar,
    selected_theme: selectedTheme,  // NEW
  })
  .eq("user_id", gameUser.user_id);

// In the JSX, add after Avatar Selection:
{/* Theme Selection */}
<div className="border-t border-gray-200 pt-3 sm:pt-4">
  <label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block text-gray-800">
    🎨 Visual Theme
  </label>
  <div className="grid grid-cols-3 gap-2">
    {Object.entries(THEMES).map(([key, themeData]) => (
      <button
        key={key}
        onClick={() => {
          setSelectedTheme(key);
          playSound("select", effectsOn);
        }}
        className={`p-3 rounded-xl border-2 transition-all ${
          selectedTheme === key
            ? 'border-yellow-400 ring-2 ring-yellow-300 scale-105 shadow-lg'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="text-2xl mb-1">{themeData.icon}</div>
        <div className="text-xs font-medium">{themeData.name}</div>
      </button>
    ))}
  </div>
  <p className="text-[10px] sm:text-xs text-gray-500 mt-2 text-center">
    Switch themes to match the season!
  </p>
</div>
```

---

## Component Updates

### 1. MapBackground.jsx
Replace hardcoded gradients and emojis with theme-aware versions using `useTheme()`.

### 2. GameScreen.jsx
Replace the hardcoded `bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900` with the themed gradient.

### 3. LoginPage.jsx
Apply theme-aware gradient and decorative elements.

### 4. WeeklyChallengeScreen.jsx
Use `ThemedBackground` component.

### 5. PowerUpStore.jsx
Remove the hardcoded Christmas colors (`christmasGreen`, `christmasRed`) and replace with theme-aware accent colors.

### 6. PopGameItem.jsx
Add theme-specific items (Easter eggs for Easter, Santa for Christmas) based on current theme.

---

## App.jsx Integration

### Wrap the app with ThemeProvider:

```javascript
// In App.jsx
import { ThemeProvider } from '@/context/ThemeContext';

function AppContent() {
  // Fetch user's selected_theme from gameUser
  const theme = gameUser?.selected_theme || 'default';
  
  return (
    <ThemeProvider initialTheme={theme}>
      {/* ... rest of app */}
    </ThemeProvider>
  );
}
```

---

## Tailwind Config Update

### Add seasonal colors to `tailwind.config.js`:

```javascript
colors: {
  // Existing candy colors...
  
  // Easter theme
  easterPink: '#F9A8D4',
  easterPurple: '#C084FC',
  easterBlue: '#7DD3FC',
  easterGreen: '#86EFAC',
  
  // Christmas theme
  christmasRed: '#DC2626',
  christmasGreen: '#16A34A',
  christmasGold: '#FBBF24',
}
```

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/themes/themeConfig.js` | **NEW** | Theme definitions with colors, emojis, gradients |
| `src/context/ThemeContext.jsx` | **NEW** | React context for theme state management |
| `src/themes/ThemedBackground.jsx` | **NEW** | Unified themed background component |
| `src/components/SettingsModal.jsx` | **MODIFY** | Add theme picker UI |
| `src/components/MapBackground.jsx` | **MODIFY** | Use theme context for gradients/decorations |
| `src/components/GameScreen.jsx` | **MODIFY** | Apply themed background |
| `src/components/PowerUpStore.jsx` | **MODIFY** | Use theme-aware colors |
| `src/components/PopGameItem.jsx` | **MODIFY** | Add theme-specific items |
| `src/pages/LoginPage.jsx` | **MODIFY** | Apply themed background |
| `src/pages/WeeklyChallengeScreen.jsx` | **MODIFY** | Apply themed background |
| `src/App.jsx` | **MODIFY** | Wrap with ThemeProvider |
| `tailwind.config.js` | **MODIFY** | Add Easter/Christmas colors |
| **Database Migration** | **NEW** | Add `selected_theme` column to `game_users` |

---

## Visual Preview

### Default Theme (Current)
- Deep purple-blue gradient sky
- Doves, crosses, angels floating
- Golden/yellow accents

### Easter Theme
- Pastel sky gradient (sky blue to pink)
- Bunnies, Easter eggs, butterflies, flowers
- Pink/purple accents
- Bright, hopeful atmosphere

### Christmas Theme
- Dark winter night gradient
- Snowfall animation
- Christmas trees, stars, Santa, snowflakes
- Red/green accents
- Festive, cozy atmosphere

---

## Implementation Order

1. **Database**: Add `selected_theme` column
2. **Config**: Create `themeConfig.js` with theme definitions
3. **Context**: Create `ThemeContext.jsx`
4. **Tailwind**: Add seasonal colors
5. **Background**: Create `ThemedBackground.jsx`
6. **Settings**: Add theme picker to `SettingsModal.jsx`
7. **Integration**: Update `App.jsx` with ThemeProvider
8. **Components**: Update each component to use theme context
