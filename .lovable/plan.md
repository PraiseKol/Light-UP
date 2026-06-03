## Goal
Strip the previous (24-player, manual dual-leaderboard + search) competition setup out of the admin UI and codebase so only the new **MonthlyCompetitionPanel** (16-player auto-selection) is functional and referenced.

## Changes

### 1. `src/admin/CompetitionManager.jsx` (the main cleanup)
Remove everything related to the old "Create New Competition" flow:
- Delete the Monthly Top 20 + Free Fall Top 10 dual-leaderboard selection UI (lines ~636–718).
- Delete the "Search & Add Players" manual section (lines ~720–777).
- Delete the "Create Competition" button + selection counter (lines ~627–633, ~779–798).
- Delete the "Fully Automated Competition Flow" explainer card (lines ~801–end).
- Remove all related state: `monthlyTopPlayers`, `popGameLeaderboard`, `manualPlayers`, `searchTerm`, `searchResults`, `selectedMonthlyIds`, `selectedPopGameIds`.
- Remove handlers: `handleSearch`, `getUniqueSelectedIds`, `getTotalSelected`, `toggleMonthlySelection`, `togglePopGameSelection`, `isPlayerSelected`, `addManualPlayer`, `removeManualPlayer`, `handleCreateCompetition`.
- Remove now-unused imports: `fetchMonthlyTopPlayers`, `createCompetition`, `searchPlayers`, `fetchPopGameTopForCompetition`, and unused icons (`Search`, `Plus`, `X`, `Check`).
- Trim `loadData` so it no longer fetches monthly top players / pop-game top.
- Keep: `ScriptureMatchToggle`, `PopGameToggle`, active-competition view (grouping/start/cancel/live scores), and `<MonthlyCompetitionPanel onCreated={loadData} />` as the **only** way to create a new competition.

### 2. `src/lib/api/competition.js`
- Mark/remove dead helpers no longer referenced after cleanup: `fetchMonthlyTopPlayers`, `searchPlayers`, plus the legacy `startRound`, `endRound`, `completeCompetition` already labeled "legacy". Verify they aren't used elsewhere (quick rg) before deletion; keep `createCompetition` since the edge function path still uses similar inserts — actually the new panel inserts directly, so confirm and remove if unused.
- Keep all functions used by the new flow: `getActiveCompetition`, `cancelCompetition`, `groupPlayersForCompetition`, `startAutomatedCompetition`, `processPhaseTransition`, `getCompetitionById`, `getPlayerCompetitionEntry`, `getAllCompetitionPlayersSorted`, `submitCompetitionAnswer`, `getCompetitionQuestions`, timing constants.

### 3. Data check (no DB migration)
No schema changes needed. `competition_players.selection_type` already supports the new values. No old competition rows currently exist in `competitions` that need cleanup (will verify with a read query before/after if you want).

## Result
Admin "Competition" tab will show:
1. Memory Challenge toggle
2. Free Fall toggle
3. **Monthly Competition Panel** (generate 16, preview, swap, confirm & notify) — the only entry point
4. Active competition view once one exists (group → start → live → cancel)

No leftover references to the old 24-player manual selection anywhere in the UI or imports.
