# Memory Challenge: Responsive Tile Sizing Fix

## Problem
On the Memory Challenge screen, larger levels (4–6 column grids) push tiles below the HUD/power-up bar, causing the top tiles to be clipped or overlapped. The current `aspect-[3/4]` cards are too tall, and the board only constrains width (`max-w-2xl`), not height.

## Fix Scope
Visual/layout only. No game logic, scoring, or data changes.

### 1. `src/components/memory/GameBoard.jsx`
- Make the board fully height-aware so the grid always fits between HUD and power-up bar.
- Wrap the grid in a flex container that uses the available height (`h-full min-h-0`) and centers content.
- Change card aspect from `aspect-[3/4]` to a more compact `aspect-square` (or `aspect-[4/5]` for verse-heavy levels) so tall grids don't overflow.
- Cap the grid width based on column count so 2–3 column levels don't render giant tiles on desktop:
  - 2 cols → `max-w-xs`
  - 3 cols → `max-w-sm`
  - 4 cols → `max-w-md`
  - 5 cols → `max-w-lg`
  - 6 cols → `max-w-xl`
- Reduce gap on dense grids (`gap-1` for ≥5 cols, `gap-1.5` for 4, `gap-2` for ≤3).
- Add an outer `overflow-hidden` and inner safe padding so nothing clips under the HUD.

### 2. `src/components/memory/MemoryCard.jsx`
- Shrink content typography so text/symbols never spill past the smaller tile:
  - `symbol`: `text-2xl sm:text-3xl` (was 3xl/4xl), label `text-[9px] sm:text-[10px]`.
  - `verse_first` / `verse_second`: `text-[10px] sm:text-xs`, reference `text-[8px] sm:text-[9px]`.
  - `symbol_verse`: `text-[9px] sm:text-[11px]`, reference `text-[7px] sm:text-[8px]`.
- Tighten inner padding to `p-1 sm:p-1.5`, add `leading-tight`, and `line-clamp-4` to avoid awkward overflow.
- Keep flip animation and matched/back styling unchanged.

### 3. `src/pages/ScriptureMatchPage.jsx` (minor)
- Ensure the playing container uses `h-[100dvh] flex flex-col overflow-hidden` (already present) and that `<GameBoard />` is wrapped to consume remaining height (`flex-1 min-h-0`). Add `min-h-0` if missing so the grid actually shrinks instead of pushing the power-up bar off-screen.

## Verification
- Open Memory Challenge on mobile (375×812) and desktop (1280×720) preview.
- Step through levels with 2, 3, 4, 5, and 6 column grids; confirm:
  - HUD, board, and power-up bar all visible without scrolling.
  - No tile clipped at top or bottom.
  - Tile content (symbol, label, verse, reference) stays inside the card.
- Re-screenshot a 6-column level on mobile to confirm the densest case fits.

## Out of scope
Game rules, level definitions, scoring, power-ups, sounds, and any non-Memory-Challenge screens stay untouched.
