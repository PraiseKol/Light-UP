## Goal

Upgrade the visual layer of the main phase/level game so it feels like a polished 3D casual game (Candy Crush / Monopoly / Royal Match). Pure presentation — no gameplay, scoring, backend, or data changes. Mobile no-scroll rule and existing routes preserved.

## Scope (in)

1. **Map screen (`src/pages/MapAndGame.jsx` + `src/components/MapBackground.jsx`)** — richer 3D level nodes, glossy phase headers, deeper parallax, stronger path with beveled edges.
2. **In-level HUD & shell (`src/components/GameScreen.jsx`)** — chunky 3D top bar (level chip, score coin, heart pill), 3D power-up dock with glossy orbs, refined idle-glow.
3. **Question surfaces (`src/modes/TriviaMode.jsx`, `WordFillMode.jsx`, `FourPicsMode.jsx`)** — 3D question card, embossed option buttons with press-down shadow, subtle tilt on hover, celebratory correct/incorrect states.
4. **Shared 3D primitive utilities in `src/index.css` + `tailwind.config.js`** — reusable classes: `.btn-orb`, `.card-3d`, `.chip-3d`, `.coin-3d`, `.press-3d`, plus keyframes for `bob`, `sheen`, `press`, `pop-in`.

## Scope (out)

- Memory Challenge, Free Fall, Multiplayer, Weekly, Competition, Admin, Auth, LoadingScreen (already themed).
- Any scoring, lives, power-up logic, DB schema, routing, or API changes.
- New assets/images (all effects done in CSS + Framer Motion already installed).

## Design language

- **Depth:** layered inner-highlight + outer drop-shadow (`inset 0 2px 0 rgba(255,255,255,.6), 0 6px 0 rgba(0,0,0,.25), 0 12px 20px -6px rgba(0,0,0,.35)`).
- **Gloss:** top-half radial white 12–20% overlay on every orb/button.
- **Press:** `active:translate-y-[3px]` + shadow collapse, 120ms ease.
- **Motion:** idle bob (2–3px, 3s), sheen sweep on hover, pop-in on mount via existing `popIn` keyframe.
- **Palette:** keep current candy tokens (`candyBlue/Purple/Yellow/Pink/Green`) — no new colors, works with all seasonal themes.
- **A11y:** all effects respect existing `prefers-reduced-motion` block; focus-visible ring preserved.

## File-by-file changes

**`src/index.css`** — add reusable primitives:
- `.btn-orb-{color}` (blue/purple/yellow/pink/green) with layered shadows + gloss pseudo-element.
- `.card-3d` (raised panel with inner highlight + soft outer shadow).
- `.chip-3d` (small pill for level/score/heart badges).
- `.coin-3d` (circular star/coin with rim highlight).
- Keyframes: `bob`, `sheen`, `pressDown`, plus utility `.tilt-hover` (rotateX/Y on hover via transform-style: preserve-3d).

**`tailwind.config.js`** — register `bob`, `sheen` animations. Extend `boxShadow` with `orb`, `orb-pressed`, `card-3d` tokens so components stay declarative.

**`src/components/GameScreen.jsx`** — swap top HUD `<span>`s for `chip-3d` / `coin-3d`; wrap power-up buttons in `.btn-orb-*` classes; keep existing handlers, idle-hint, disabled logic untouched. No JS logic touched beyond className strings.

**`src/pages/MapAndGame.jsx`** — replace flat level node markup with `.btn-orb` + inner star badge; give phase title banners `.card-3d` treatment with a small ribbon; leave scroll, refs, and unlock logic untouched.

**`src/components/MapBackground.jsx`** — deepen gradient stops, add a second parallax hill layer with beveled highlight, keep existing SVG paths.

**`src/modes/TriviaMode.jsx` / `WordFillMode.jsx` / `FourPicsMode.jsx`** — wrap question in `.card-3d`; convert option buttons to `.btn-orb-*` with `.press-3d`; add `motion.div` `whileTap={{ scale: 0.96 }}` where a button already exists. Correct/incorrect state uses a green/red variant of the same orb class. Keep all answer-handling code identical.

## Technical notes

- All shadow/gloss values live in `index.css` as CSS custom properties so themes (`ThemeContext`) can override per season later without component edits.
- No new npm packages. Framer Motion and Tailwind already present.
- Every className swap keeps existing responsive breakpoints (`sm:`, `text-[9px]`, etc.) so mobile no-scroll behavior is preserved.
- Verification: after edits, load `/` (map), click any unlocked level to enter `GameScreen`, run Playwright screenshot on mobile viewport (390×844) and desktop (1280×800) to confirm nothing overflows and tiles/buttons render with 3D depth.

## Out-of-scope guardrails

If while editing I find broken logic, I will NOT fix it in this task — I'll note it and stop. This PR is presentation only.
