

# Plan: Fully Automated Competition System with Spectator Mode

## Overview
Transform the competition from a manual admin-triggered flow to a fully automated system where the admin only needs to:
1. Click "Group Players" to assign initial groups
2. Click "Start Competition" to begin the automated flow

Everything else (rounds, eliminations, regrouping, breaks) happens automatically with correct timings.

---

## Competition Flow (Automated)

```text
[Admin clicks "Group Players"]
         ↓
[Admin clicks "Start Competition"]
         ↓
[30-second countdown] → Visible to all players/spectators
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ ROUND 1: 24 players (12 vs 12) — 2 MINUTES                      │
│ • Groups A vs B                                                 │
│ • Scores reset for this round                                   │
│ • Timer auto-ends round when complete                           │
└─────────────────────────────────────────────────────────────────┘
         ↓ (Auto-trigger)
[30-second break] → Losing group eliminated, winners regrouped into C/D
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ ROUND 2: 12 players (6 vs 6) — 1 MINUTE                         │
│ • Groups C vs D                                                 │
│ • Scores reset for this round                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓ (Auto-trigger)
[30-second break] → Losing group eliminated, winners regrouped into E/F
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ ROUND 3: 6 players (3 vs 3) — 1 MINUTE                          │
│ • Groups E vs F                                                 │
│ • Scores reset for this round                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓ (Auto-trigger)
[30-second break] → Losing group eliminated, 3 finalists ready
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ FINAL ROUND: 3 players (individual) — 2 MINUTES                 │
│ • No groups, all compete individually                           │
│ • Scores reset for this round                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓
[Competition Complete] → Display Results Tables
```

---

## Round Timings

| Round | Duration | Players | Groups | Break After |
|-------|----------|---------|--------|-------------|
| 1 | 2 minutes | 24 | A vs B (12 vs 12) | 30 seconds |
| 2 | 1 minute | 12 | C vs D (6 vs 6) | 30 seconds |
| 3 | 1 minute | 6 | E vs F (3 vs 3) | 30 seconds |
| Final | 2 minutes | 3 | Individual | None |

---

## Key Changes Required

### 1. Database Migration
Add new fields to `competitions` table for automation state:

```sql
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'idle';
-- Phases: idle, countdown, round_active, break, completed

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMPTZ;
-- When current phase (countdown/round/break) ends
```

---

### 2. API Changes (`src/lib/api/competition.js`)

#### A. Round Duration Map
```javascript
const ROUND_DURATIONS = {
  1: 120,  // 2 minutes
  2: 60,   // 1 minute
  3: 60,   // 1 minute
  4: 120   // 2 minutes (final)
};

const COUNTDOWN_DURATION = 30;  // 30 seconds
const BREAK_DURATION = 30;      // 30 seconds
```

#### B. New Functions

- `groupPlayers(competitionId)` - Assigns initial groups A/B to all 24 players
- `startAutomatedCompetition(competitionId)` - Begins 30-second countdown
- `processPhaseTransition(competitionId)` - Handles automatic transitions:
  - countdown → round_active
  - round_active → break (eliminates losing group, regroups winners)
  - break → round_active (next round)
  - final round_active → completed

#### C. Modified `endRound()` function
- Now automatically called when phase timer expires
- Includes auto-regrouping logic for next round

---

### 3. Edge Function for Automation
Create `supabase/functions/competition-automation/index.ts`:

This function will be triggered by a client-side interval that checks if the current phase has ended. When a phase ends:
1. Process elimination (if round ended)
2. Regroup players (if break starts)
3. Start next phase with correct timer
4. Update competition state

**Why Edge Function?** To ensure automation continues even if admin closes browser.

---

### 4. Admin UI Updates (`src/admin/CompetitionManager.jsx`)

#### Simplified Admin Controls:
```jsx
// When competition is in "waiting" status with 24 players
<button onClick={handleGroupPlayers}>
  👥 Group Players (Assign A & B)
</button>

// After players are grouped
<button onClick={handleStartAutomatedCompetition}>
  🚀 Start Competition (Auto Mode)
</button>

// During competition - admin can only watch + cancel
<div>
  Competition running automatically...
  [Cancel Competition] button only
</div>
```

#### Live Status Display:
- Current phase: "Countdown (25s)" / "Round 1 (1:45)" / "Break (20s)"
- Phase progress bar
- No manual "End Round" or "Start Next Round" buttons needed

---

### 5. Player Competition Page Updates (`src/pages/CompetitionPage.jsx`)

#### Phase-Aware UI:
- **Countdown Phase**: Show "Get Ready! Starting in 25..."
- **Round Active**: Show questions + timer
- **Break Phase**: Show "Round ended! Regrouping... (20s)"
- **Eliminated**: Redirect to spectator mode

#### Auto-Question Flow:
- Players answer questions continuously during round
- Scores update in real-time via database triggers (already working)

---

### 6. Spectator Mode Updates (`src/pages/CompetitionViewerPage.jsx`)

#### Enhanced Spectator View:
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🏆 LIVE COMPETITION                              [ROUND 2 LIVE] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⏱️ 0:45 remaining                                              │
│  ═══════════════════════▓▓▓▓▓▓▓▓▓▓▓▓▓                          │
│                                                                 │
├────────────────────────┬────────────────────────────────────────┤
│      GROUP C           │           GROUP D                      │
│   Total: 1,250         │        Total: 980                      │
├────────────────────────┼────────────────────────────────────────┤
│  PlayerOne    +350     │  PlayerSeven   +280                    │
│  PlayerTwo    +290     │  PlayerEight   +250                    │
│  PlayerThree  +220     │  PlayerNine    +200                    │
│  PlayerFour   +180     │  PlayerTen     +150                    │
│  PlayerFive   +120     │  PlayerEleven  +80                     │
│  PlayerSix    +90      │  PlayerTwelve  +20                     │
├────────────────────────┴────────────────────────────────────────┤
│                     ELIMINATED PLAYERS                          │
│  ───────────────────────────────────────                        │
│  PlayerX (R1), PlayerY (R1), PlayerZ (R1), ...                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Features:
- Real-time group scores and totals
- Player names with individual scores
- Which group is winning (highlight)
- Eliminated players section

---

### 7. Results Display (Post-Competition)

#### Table 1: Top 3 Winners (Final Standings)
```text
┌───────────────────────────────────────┐
│     🏆 COMPETITION WINNERS 🏆          │
├───────────────────────────────────────┤
│  🥇 1st  PlayerOne         2,450 pts  │
│  🥈 2nd  PlayerTwo         2,100 pts  │
│  🥉 3rd  PlayerThree       1,850 pts  │
└───────────────────────────────────────┘
```

#### Table 2: Top 7 Scores (All Competition - includes eliminated)
```text
┌───────────────────────────────────────┐
│     ⭐ TOP SCORES (All Rounds) ⭐      │
├───────────────────────────────────────┤
│  #1  PlayerOne         2,450 pts ⬅ Final │
│  #2  PlayerTwo         2,100 pts ⬅ Final │
│  #3  PlayerFour        1,950 pts  (R2)   │
│  #4  PlayerThree       1,850 pts ⬅ Final │
│  #5  PlayerFive        1,720 pts  (R1)   │
│  #6  PlayerSix         1,680 pts  (R2)   │
│  #7  PlayerSeven       1,590 pts  (R3)   │
└───────────────────────────────────────┘
```

The top 7 scores are calculated from `total_score` accumulated across ALL rounds the player participated in.

---

## Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `src/lib/api/competition.js` | Modify | Add automation functions, round durations, phase transitions |
| `src/admin/CompetitionManager.jsx` | Modify | Simplified controls, live phase display |
| `src/pages/CompetitionPage.jsx` | Modify | Phase-aware UI, countdown/break states |
| `src/pages/CompetitionViewerPage.jsx` | Modify | Enhanced spectator view, dual results tables |
| `supabase/functions/competition-automation/index.ts` | Create | Background automation handler |
| Database migration | Create | Add `phase` and `phase_ends_at` columns |

---

## Technical Implementation: Automation Flow

### Client-Side Timer + Server Processing

Since Supabase doesn't have built-in cron/scheduling, we'll use a hybrid approach:

1. **Admin starts competition** → Sets `phase = 'countdown'`, `phase_ends_at = now() + 30s`
2. **All clients** (admin, players, spectators) subscribe to competition changes
3. **Any client** checks if `phase_ends_at < now()` → Calls edge function to process transition
4. **Edge function** (idempotent):
   - Checks if phase actually ended
   - Processes elimination/regrouping
   - Sets next phase and timer
   - Updates competition record

This ensures automation continues even if admin disconnects.

### Phase State Machine

```text
                    ┌─────────────────────┐
                    │       idle          │
                    └─────────┬───────────┘
                              │ startAutomatedCompetition()
                              ▼
                    ┌─────────────────────┐
         ┌──────────│     countdown       │ (30 seconds)
         │          │   round_number: 1   │
         │          └─────────┬───────────┘
         │                    │ timer expires
         │                    ▼
         │          ┌─────────────────────┐
         │          │    round_active     │ (2 min for R1/Final, 1 min for R2/R3)
         │          └─────────┬───────────┘
         │                    │ timer expires
         │                    ▼
         │          ┌─────────────────────┐
         │          │       break         │ (30 seconds)
         │          │ (eliminate losers)  │
         │          │ (regroup winners)   │
         │          └─────────┬───────────┘
         │                    │ timer expires
         │                    ▼
         │          ┌─────────────────────┐
         └──────────│    round_active     │ (next round)
                    └─────────┬───────────┘
                              │ (repeat until final)
                              ▼
                    ┌─────────────────────┐
                    │      completed      │
                    └─────────────────────┘
```

---

## Summary

This plan transforms the competition into a fully automated experience:

1. **Admin actions reduced to 2 buttons**: Group Players → Start Competition
2. **Correct round timings**: R1 (2 min), R2 (1 min), R3 (1 min), Final (2 min)
3. **30-second breaks** between rounds for elimination + regrouping
4. **Automatic transitions** with no manual intervention needed
5. **Enhanced spectator mode** showing groups, player names, and live scores
6. **Dual results tables**: Top 3 winners + Top 7 overall scores

The automation uses a hybrid client-timer + edge-function approach to ensure reliability even if the admin disconnects.

