
# Full Sound & Music Upgrade

Complete overhaul of the app's audio: replace every existing sound effect with a fresh, action-fitted set, add looping background music across map/game/menus, and give players separate control over music vs SFX.

## 1. New SFX Library (ElevenLabs — Hybrid approach)

Delete all files in `/public/sounds/` and regenerate a full set via ElevenLabs Sound Effects API (through a Supabase edge function using the ElevenLabs connector). Each SFX tuned to its action, saved as MP3 to `/public/sounds/` and referenced from `src/utils/sound.js`.

**UI cues (short, crisp, <1s):**
- `tap` — soft bubble pop (replaces `click`)
- `select` — light glassy chime
- `back` — gentle whoosh-down
- `switch` — subtle tick
- `modalOpen` — airy swell-in
- `modalClose` — soft swoosh
- `toggle` — playful click-clack

**Game feedback:**
- `correct` — bright ascending harp glissando + sparkle
- `wrong` — soft comedic "aww" descending tones (not harsh)
- `timeUp` — dramatic bell knell
- `optionSelect` — candy tap
- `submitAnswer` — confident whoosh
- `countdown` — ticking clock with tension
- `lifeLost` — heart-crack thud
- `levelUp` — triumphant fanfare with sparkle
- `starEarned` — magical shimmer (per star, stackable)
- `perfectStreak` — angelic choir stinger
- `phaseUnlock` — grand gate-opening chord

**Power-ups (distinct signatures):**
- `divineHint` — mystical whoosh + reveal chime
- `gracePeriod` — clock rewind with soft harp
- `holyShield` — shimmering barrier hum
- `heavenlyMatch` — dove-wing flutter + glow
- `powerUpPurchase` — coin cash-register with sparkle
- `purchase` — satisfying coin drop
- `bonusAwarded` — celebratory ta-da

**Mini-games / social:**
- `bombTap` — muffled explosion (Free Fall)
- `cardFlip` — paper flip (Memory)
- `matchFound` — happy chime pair
- `notification` — soft ping (chat/quests)
- `questComplete` — scroll-unfurl chime
- `gameOver` — solemn organ resolve

## 2. Background Music (Curated, royalty-free MP3s)

Add 5 looping tracks to `/public/music/`. Sourced from royalty-free libraries (Pixabay Music / Free Music Archive — CC0/CC-BY) matching **Uplifting Orchestral + Playful Cartoon** blend:

- `map-theme.mp3` — bouncy marimba + light strings (map screen)
- `gameplay-theme.mp3` — subtle orchestral pulse, low-distraction (all game modes)
- `menu-theme.mp3` — soft cartoon-hymnal loop (shop/settings/leaderboards/modals)
- `victory-cue.mp3` — 6s orchestral stinger (level complete/phase unlock)
- `defeat-cue.mp3` — 4s gentle minor cue (game over / no lives)

Cross-fade between tracks (1s fade) when route changes. Pause on tab blur; resume on focus.

## 3. Audio Engine Refactor (`src/utils/sound.js` + new `music.js`)

- Rewrite `sound.js` with the full new key map, preserve `playSound(name, effectsOn)` signature so no call sites break.
- New `src/utils/music.js`: `playMusic(track)`, `stopMusic()`, `setMusicVolume(n)`, singleton `<audio>` with loop+fade.
- New `src/context/AudioContext.jsx`: exposes `{ sfxOn, sfxVolume, musicOn, musicVolume, setters }`, persists to `localStorage`, wraps App.
- `BackgroundMusic.jsx` retired in favor of `music.js` driven by route via a small `useRouteMusic()` hook in `App.jsx`.

## 4. Settings Modal — Separate Controls

Update `SettingsModal.jsx`:
- 🔊 **Sound Effects**: on/off toggle + volume slider (0–100)
- 🎵 **Music**: on/off toggle + volume slider (0–100)
- Preview button next to each (plays sample `tap` / 2s of `menu-theme`).
- Uses existing 3D primitives (`.row-3d`, `.tab-3d`).

## 5. Wire Up New Cues Across App

Add missing `playSound()` calls at action points that currently have none:
- Star reveals in `RightAnswerModal` → `starEarned`
- Level unlock animation in `MapAndGame` → `phaseUnlock`
- Purchases in `PowerUpStore` / `TalentStore` → `powerUpPurchase`
- Modal opens/closes → `modalOpen` / `modalClose`
- Free Fall bomb tap → `bombTap`; Memory flip/match → `cardFlip` / `matchFound`
- Quest completion toast → `questComplete`

## 6. Cleanup

- `rm` every legacy file in `/public/sounds/` before writing new ones.
- Remove old `BackgroundMusic.jsx` `soundMap` (shifts/peace/juba) — replaced by route-driven music.
- Update `mem://audio/sound-effects-system-upgrade` memory with the new key map + music system.

## Technical Details

- **ElevenLabs**: connector already recommended; if not linked I'll link the ElevenLabs standard connector first. SFX generated via a temporary edge function (`generate-sfx`) that batches all keys, returns MP3 blobs; I'll run it once during implementation to populate `/public/sounds/`, then remove the function (assets are static after generation).
- **Music files**: downloaded via `curl` from Pixabay CDN (CC0), placed directly in `/public/music/`.
- **No DB/RLS changes.** All prefs stored in `localStorage` (`sfxOn`, `sfxVolume`, `musicOn`, `musicVolume`).
- **File count**: ~35 SFX MP3s + 5 music MP3s (~2–3 MB total, streamed on demand).

## Out of Scope

- Voice-overs / narration
- Per-level custom music
- Server-persisted audio prefs
- Gameplay logic, scoring, RLS

## Files Touched

- **Delete**: everything in `public/sounds/`, `src/components/BackgroundMusic.jsx`
- **Add**: `public/sounds/*.mp3` (new set), `public/music/*.mp3` (5 tracks), `src/utils/music.js`, `src/context/AudioContext.jsx`, `src/hooks/useRouteMusic.js`
- **Edit**: `src/utils/sound.js`, `src/components/SettingsModal.jsx`, `src/App.jsx`, `src/components/GameScreen.jsx`, `src/pages/MapAndGame.jsx`, `src/components/PowerUpStore.jsx`, `src/components/TalentStore.jsx`, `src/components/ui/RightAnswerModal.jsx`, `src/components/DailyQuestsModal.jsx`, `src/components/memory/*`, `src/components/PopGameItem.jsx`
