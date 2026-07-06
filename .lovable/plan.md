# Extend 3D Theme Across App + New Map Background

Extend the Candy-Crush-style 3D look (already applied to the game/map) to every remaining page/modal, and add a new Bible-themed 3D illustrated background layer for the map. Theme wiring stays admin-controlled via `ThemeContext` — no hard-coded overrides.

## A. Generate the new 3D Bible-themed map background image

- Use `imagegen` (premium) to create `src/assets/map-bg-3d-bible.jpg` (1024×1920 portrait, tile-friendly top/bottom).
- Prompt style: soft painterly 3D render, Candy-Crush / Royal Match world map vibe, Bible-story landscape — rolling green hills, small Middle-Eastern stone houses, olive trees, distant ark/temple silhouette, dove, subtle golden light, soft cel-shaded 3D characters (shepherd, sheep), pastel sky with clouds. No text.
- Add a second horizon-friendly variant later only if the first doesn't tile well.

## B. Wire the image into the theme system (still admin-controlled)

- `src/themes/themeConfig.js`: add `background.image` field per theme (default → new Bible bg; Easter/Christmas keep gradients or optional images later).
- `src/components/MapBackground.jsx`: render the `config.background.image` as a fixed, `bg-cover` layer above the gradient with a soft dark overlay (`bg-black/25`) so 3D orbs and paths still pop. Keep all existing stars/particles/hills so animation and Christmas snow still work. Fallback to pure gradient when `image` is undefined.
- No hard-coding: admin `GlobalSettingsManager` continues to switch themes, which flips the whole background including the new image.

## C. 3D primitives for modals & pages

Extend `src/index.css` with reusable classes (no colour tokens hard-coded in components):

- `.modal-3d` — glossy white panel with layered inset highlight, thick soft shadow, 2px white border, rounded-2xl (mirrors `.card-3d` but sized for modals).
- `.tab-3d` / `.tab-3d.active` — pill tabs with bevel + press depth.
- `.row-3d` — embossed list row for settings/shop items.
- `.badge-3d` — small 3D chip variant for prices/counts.
- `.icon-orb` — circular gradient orb wrapper for leading icons.

## D. Apply 3D styling to remaining surfaces

Convert flat cards/buttons to the primitives above, keep all logic intact:

1. `src/components/SettingsModal.jsx` — wrap in `.modal-3d`, section headers as `phase-ribbon-3d` mini, toggles wrapped in `.row-3d`, action buttons use `.btn-orb-*`.
2. `src/components/PowerUpStore.jsx` — items become `.row-3d` with `.icon-orb` (yellow/purple/blue variants) + `.btn-orb-green` "Buy" and `.badge-3d` prices.
3. `src/components/TalentStore.jsx` — same treatment; tabs → `.tab-3d`.
4. `src/components/HolyShieldButton.jsx` modal — `.modal-3d`, `.btn-orb-amber` confirm.
5. `src/components/LeaderboardModal.jsx` + `PopGameLeaderboardModal.jsx` — `.modal-3d`, top-3 rows use gold/silver/bronze `.row-3d` variants, tabs → `.tab-3d`.
6. `src/components/DailyQuestsModal.jsx` — `.modal-3d`, quest rows as `.row-3d`, progress bar embossed, claim → `.btn-orb-green`.
7. `src/components/ProfileBadgesModal.jsx` — badges become circular `.level-node-3d` variants (gold/locked grey).
8. `src/components/ScriptureModal.jsx` + `ExplainerVideoModal.jsx` + `PWAInstallPrompt.jsx` + `PWAUpdatePrompt.jsx` — `.modal-3d` shell, `.btn-orb-*` actions.
9. `src/components/BonusesTab.jsx` — reward rows as `.row-3d`.
10. `src/components/LivesDisplay.jsx` — hearts as `.chip-3d-heart` (already partially done in HUD; unify).
11. `src/pages/WeeklyChallengeScreen.jsx` header + start button → 3D primitives.
12. `src/components/NoQuizPage.jsx` + `OfflinePage.jsx` — `.card-3d` container + `.btn-orb-blue` retry.

Multiplayer, Admin, and Auth pages are out of scope for this pass to keep scope tight.

## E. Map background integration polish

- `src/pages/MapAndGame.jsx`: no structural change; verify path & nodes remain legible over the new image (adjust overlay opacity if needed after Playwright check).
- `src/components/MapBackground.jsx`: dim hills opacity slightly when `config.background.image` is set so painted hills in the image show through.

## Out of scope

- Gameplay, scoring, lives regen, RLS/data, edge functions.
- Free Fall / Memory mini-game internals (already themed).
- Admin dashboard UI (kept utilitarian on purpose).
- Auth pages redesign.
- New DB fields — theme image ships in `themeConfig.js`, still admin-toggled via existing theme selector.

## Files to modify / add

- **Add**: `src/assets/map-bg-3d-bible.jpg`
- **Edit**: `src/themes/themeConfig.js`, `src/components/MapBackground.jsx`, `src/index.css`, and the modal/component files listed in section D.

## Verification

- Playwright at 375×667 and 1280×800: open map (image loads, nodes readable), open Settings / Power-Up Store / Talent Store / Daily Quests / Leaderboard / Profile Badges → screenshot each, confirm 3D bevel + no overflow.
- Build passes; no changes to Supabase or business logic.
