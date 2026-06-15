## Goals

Three independent enhancements:

1. **Idle power-up hint** — In main-game play (Trivia/FourPics/WordFill/ScriptureMatch via `GameScreen.jsx`), when a player has not selected an answer for 5 seconds on the current question, gently glow/pulse the power-up buttons (only the ones they actually own) to nudge them to use power-ups.
2. **Upgraded global loading screen** — Replace the bare spinner (`RouteFallback` in `src/App.jsx`, line 37–41, and the "Loading..." text in `ProtectedRoute` at line 57) with a polished branded "LightUP" loading screen using a freshly generated themed illustration, taking visual cues (not a copy) from the attached Magic Sort reference: a vibrant, candy-style biblical scene with the LightUP logo treatment and an animated "Loading" indicator.
3. **Free Fall background** — Update the `PopGamePage` playing-area background (currently a sky→sand gradient at lines 466–468) to a richer themed board-game-style backdrop inspired by the attached Monopoly reference (greenish board surface, foliage at corners, tape/paper decorations, subtle vignette), but biblically themed and brand-aligned — generated as an image asset, not a literal Monopoly clone.

## Technical Details

### 1. Idle power-up hint (`src/components/GameScreen.jsx`)
- Add state `idleHint` (bool) and a `useRef` timer.
- `useEffect` keyed on `currentQuestionIndex` (or equivalent question identifier already in scope) resets `idleHint` to `false` and starts a 5s timeout that sets it to `true`.
- A global `pointerdown`/`keydown` listener on the game container also resets the timer (so interacting without answering still nudges them eventually, but tapping an option still triggers the next-question reset).
- When `idleHint` is true, add a conditional class on each owned power-up button: a soft pulsing glow ring + gentle scale breathing using Tailwind + a tiny keyframe added in `src/index.css` (`@keyframes powerup-glow`). Disabled (owned=0) buttons do NOT glow.
- A small floating "💡 Try a power-up?" caption fades in above the bar via Framer Motion `AnimatePresence`, auto-hides on next interaction.
- No business-logic changes (scoring, lives, timers untouched).

### 2. Loading screen
- Generate `src/assets/lightup-loading.jpg` (premium quality) — vibrant candy-crush biblical illustration: glowing oil lamp, scrolls, doves, golden coins, soft purple/blue/pink gradient sky with castle silhouette, in the visual energy of the Magic Sort reference. No copyrighted characters.
- Create `src/components/LoadingScreen.jsx` — full-screen component: background image, animated "LightUP" wordmark (gradient + drop-shadow already used elsewhere), bouncing dots "Loading…", subtle floating sparkles using Framer Motion. Uses existing brand tokens (candyYellow / candyPink / candyPurple).
- Wire it into `src/App.jsx`:
  - Replace `RouteFallback` body with `<LoadingScreen />`.
  - Replace the `ProtectedRoute` "Loading..." text with `<LoadingScreen />`.
- Keep it lightweight: the component is small; the image is the only heavy asset and is lazy via `<img loading="eager">` only inside the loader.

### 3. Free Fall background
- Generate `src/assets/freefall-bg.jpg` (premium) — biblical-board-game backdrop: warm muted parchment/green play surface, scrolls and olive-branch foliage at the corners, subtle taped paper notes & gift icons in top corners (echoing the Monopoly reference layout without copying it), soft vignette so falling items remain readable, no logos/text.
- In `src/pages/PopGamePage.jsx` line 466–468, swap the inline gradient style for:
  ```jsx
  style={{ backgroundImage: `url(${freefallBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
  ```
  and import the asset at the top of the file.
- Keep all gameplay overlays, HUD, timer, items, modals, and the existing dark loading fallback at line 457 unchanged.

## Out of Scope
- No changes to scoring, lives, power-up effects, leaderboards, multiplayer, weekly, scripture-match memory, admin, or DB.
- No new power-ups added; only owned ones glow.
- No change to login/landing visuals beyond the loading state.

## Verification
- Open a main-game level; wait 5s without tapping → power-up buttons gently glow, caption fades in; tap any option or another button → glow stops; advance question → reset cleanly.
- Refresh the app and navigate between lazy routes (`/pop-game`, `/scripture-match`, `/admin/dashboard`) → branded loading screen appears instead of bare spinner.
- Open Free Fall → new themed background renders, items still legible, no layout shift, dark loading fallback still shows briefly while user loads.