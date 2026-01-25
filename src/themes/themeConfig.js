// Theme configuration for seasonal themes
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
      snowfall: false,
    },
    accent: {
      primary: 'candyYellow',
      secondary: 'candyPink',
      glow: 'rgba(255,217,61,0.8)',
    },
    hills: {
      back: '#4c1d95',
      front: '#6d28d9',
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
      snowfall: false,
    },
    accent: {
      primary: 'easterPink',
      secondary: 'easterPurple',
      glow: 'rgba(236,72,153,0.8)',
    },
    hills: {
      back: '#86efac',
      front: '#4ade80',
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
      primary: 'christmasRed',
      secondary: 'christmasGreen',
      glow: 'rgba(239,68,68,0.8)',
    },
    hills: {
      back: '#1e3a5f',
      front: '#1e40af',
    },
    popGameItems: {
      special: { emoji: '🎅', name: 'santa' },
    }
  }
};

export const getTheme = (themeName) => THEMES[themeName] || THEMES.default;
