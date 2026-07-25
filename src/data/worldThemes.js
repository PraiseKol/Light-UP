// src/data/worldThemes.js
// Each "world" is a distinct sky/hill palette applied per phase, cycling
// every 6 phases so the map genuinely feels like new territory as you
// progress, without needing 100 hand-authored themes.

export const WORLD_THEMES = [
  { name: 'Dawn Hills',      skyTop: '#fef3c7', skyBottom: '#fde68a', hill: '#b45309', path: ['#FFD93D', '#FFC107', '#FFD93D'] },
  { name: 'Deep Ocean',      skyTop: '#bae6fd', skyBottom: '#0369a1', hill: '#075985', path: ['#7dd3fc', '#0ea5e9', '#7dd3fc'] },
  { name: 'Emerald Forest',  skyTop: '#d9f99d', skyBottom: '#166534', hill: '#14532d', path: ['#bef264', '#84cc16', '#bef264'] },
  { name: 'Twilight Desert', skyTop: '#fed7aa', skyBottom: '#9a3412', hill: '#7c2d12', path: ['#fdba74', '#f97316', '#fdba74'] },
  { name: 'Amethyst Peaks',  skyTop: '#e9d5ff', skyBottom: '#6b21a8', hill: '#581c87', path: ['#d8b4fe', '#a855f7', '#d8b4fe'] },
  { name: 'Rose Clouds',     skyTop: '#fbcfe8', skyBottom: '#be185d', hill: '#9d174d', path: ['#f9a8d4', '#ec4899', '#f9a8d4'] },
];

export function getWorldTheme(phaseNumber) {
  const idx = Math.max(0, (phaseNumber - 1)) % WORLD_THEMES.length;
  return WORLD_THEMES[idx];
}
