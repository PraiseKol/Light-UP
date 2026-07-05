## Goal

Two focused UI upgrades, no gameplay/logic changes:

1. **Game modes (WordFill, Trivia, FourPics, ScriptureMatch)** — everything visible in one screen on mobile: HUD, question, options, and power-up dock all fit within `100dvh` with no vertical scroll needed to reach the power-ups.
2. **Main map** — shrink node/spacing on desktop + mobile so more levels are visible at once, and restyle the path + nodes to feel like a 3D Candy-Crush hill (up-and-over path with depth shading), not a flat bottom-to-top ribbon.

---

## Scope IN

### A. Game mode fit-on-screen (no scroll)

Root cause: `GameScreen.jsx` wraps modes in `<div class="h-full overflow-auto">`, and each mode wraps in `h-full flex items-center` / `overflow-auto`. On short mobile viewports the question card grows past the HUD's remaining space, pushing the power-up dock off-screen or forcing scroll before power-ups.

Changes:
- **`GameScreen.jsx`**
  - Replace inner `overflow-auto` with `overflow-hidden` and let the mode manage its own compact scroll only if truly needed (rare).
  - Tighten HUD padding (`py-1.5`), reduce chip font-size on mobile.
  - Tighten power-up dock: `p-1.5`, smaller orbs on mobile (`w-[20%]`, icon `text-sm`, remove label on very narrow screens), reduce top/bottom shadow bleed.
  - Ensure power-up dock is `sticky`/`flex-shrink-0` (already) and that game content uses `min-h-0` so flex children shrink properly.

- **`WordFillMode.jsx`, `TriviaMode.jsx`**
  - Change wrapper to `h-full flex flex-col justify-center` with `overflow-hidden`.
  - Card uses `w-full max-w-md` (was `xl`), tighter padding `p-2.5`, question `text-xs sm:text-base`, options `py-2` on mobile with `text-[13px]`, submit `py-2`.
  - Reduce vertical rhythm: `space-y-1.5`, `mb-2`.

- **`FourPicsMode.jsx`**
  - Remove `overflow-auto`; use `h-full flex flex-col` with compact sections.
  - Image grid uses `h-16 sm:h-24` (was `h-24 sm:h-32`), keeping 2x2.
  - Letter slots `w-7 h-7 sm:w-9 sm:h-9` and letter orbs a bit smaller with `text-xs sm:text-base`.
  - Combine Backspace + Submit row into the same flex block without extra margin.

- **`ScriptureMatchMode.jsx`**
  - Convert card to `card-3d` (consistency with other modes) and use compact `p-2.5`, `text-[11px]` on refs/verses, `min-h-[34px]` cells.
  - Ensure two-column grid stays visible without needing to scroll to Submit — Submit lives inside the flex column so it sits at the bottom.

- **Mobile layout guard**: verify with browser at 375×667 and 320×568 that HUD + question + options + power-up dock are all visible without scrolling. Content-heavy modes (long trivia questions) may still allow a small inner scroll on the question area only — never on the shell.

### B. Map: shrink + Candy-Crush 3D hilly path

- **`src/data/levelData.js`** — reduce spacing so more nodes fit per screen:
  - `verticalSpacing` from `130` → `92`.
  - Widen zigzag amplitude for a more visible hill: `xPositions = [78, 55, 22, 55]` remains, but sync with path shape below.
- **`MapAndGame.jsx`** — level container:
  - `containerHeight = (levelsPerPhase * 92) + 180` (was `* 130 + 300`).
  - Level node sizes: `w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16` (down from 14/16/20).
  - Icon/number size tightened accordingly. Stars shrink to `w-3.5 h-3.5`, avatar `text-3xl`.
  - Phase ribbon: reduce vertical padding on mobile (`py-2 px-4`), title `text-base lg:text-xl`.
- **Hilly 3D path** — replace flat gradient stroke with a layered "hill road":
  - Under-shadow path: same bezier stroked with dark brown `#5b3a1a`, `strokeWidth=18`, offset y+4, opacity 0.5 (ground shadow).
  - Base road: golden gradient stroke `strokeWidth=14`, rounded.
  - Top highlight: lighter gold `#FFF3B0`, `strokeWidth=5`, offset y-2, opacity 0.9 (rim light).
  - Curve type: use a smooth cubic `C` (S-curve) between nodes with two control points to create an over-hill arc: `M x1 y1 C x1 midY-14, x2 midY+14, x2 y2` — gives the up-and-over feel per segment.
  - Add small procedural "hill lumps" behind the path per phase via existing MapBackground (no new assets): faint elliptical radial gradients at each node position in a low-opacity SVG layer (added inside the phase container, below path z-index).
- **Level node depth (already 3D)**: keep `level-node-3d`, but tighten shadow to match smaller size (`0 4px 0` bevel instead of `0 6px 0`) via a size-scoped variant class `.level-node-3d.sm`.
- **Mini-map**: shrink `w-14 sm:w-16` to keep proportion with new map density.

### C. `index.css` additions
- `.level-node-3d.sm` variant (smaller bevel shadows).
- Optional `.hill-shadow` helper class for the SVG under-shadow if needed.
- No new keyframes; reuse `nodeBob`.

---

## Scope OUT

- No gameplay/scoring/lives/power-up logic changes.
- No backend, RLS, data, or route changes.
- No Memory / Free Fall / Weekly / Multiplayer / Admin changes.
- No new image assets (hill effect achieved purely with SVG + CSS).
- Explainer video, modals, header/footer nav untouched beyond incidental spacing consistent with node shrink.

---

## Files to modify

- `src/components/GameScreen.jsx`
- `src/modes/WordFillMode.jsx`
- `src/modes/TriviaMode.jsx`
- `src/modes/FourPicsMode.jsx`
- `src/modes/ScriptureMatchMode.jsx`
- `src/pages/MapAndGame.jsx`
- `src/data/levelData.js`
- `src/index.css`

## Verification

- Playwright at 375×667 and 320×568: enter each of the 4 modes; screenshot confirms HUD + question + options + power-up dock all visible without scrolling.
- Playwright at 1280×800 and 375×667 on map: screenshot confirms ≥5 level nodes visible per screen and path renders with hill shading (shadow + rim highlight layers).
