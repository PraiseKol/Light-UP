

# Plan: Enhanced Competition Management with Leaderboard Selection & Cancel Feature

## Overview
Enhance the Competition Manager to allow admins to:
1. **Cancel active competitions** at any time
2. **View Top 20 Monthly Leaderboard** (currently shows 19)
3. **View Top 10 Free Fall Pop Game Leaderboard** with correct ordering
4. **Select 24 players** from these leaderboards for the competition
5. **Start the competition** with clear workflow explanation

---

## Current State Analysis

The existing system:
- Fetches top 19 monthly players (`fetchMonthlyTopPlayers(19)`)
- Allows adding up to 5 manual players (total = 24)
- Has a Pop Game session system for qualification (competition mode)
- Creates competitions, starts rounds, and manages elimination

What's missing:
- **Cancel competition** button
- **Display of Pop Game global leaderboard** (top 10 scores)
- **Flexible player selection** from both leaderboards (not just auto-qualify)

---

## Changes Summary

### 1. Add Cancel Competition Function
**File:** `src/lib/api/competition.js`

Add a new function to cancel/delete an active competition:
```javascript
export async function cancelCompetition(competitionId) {
  // Delete all related data and the competition itself
  await supabase.from('competition_answers').delete().eq('competition_id', competitionId);
  await supabase.from('competition_rounds').delete().eq('competition_id', competitionId);
  await supabase.from('competition_players').delete().eq('competition_id', competitionId);
  await supabase.from('competitions').delete().eq('id', competitionId);
  return true;
}
```

---

### 2. Update Monthly Leaderboard Fetch
**File:** `src/lib/api/competition.js`

Change `fetchMonthlyTopPlayers` to fetch **20 players** instead of 19:
- `const topPlayers = await fetchMonthlyTopPlayers(20);`

---

### 3. Add Pop Game Leaderboard Fetch for Admin
**File:** `src/lib/api/popGame.js`

Create a function to fetch top 10 Pop Game scores for admin selection:
```javascript
export const fetchPopGameTopForCompetition = async () => {
  // Get top 10 unique players by their best score
  const { data: topScores } = await supabase
    .from('pop_game_best_scores')
    .select('user_id, score')
    .order('score', { ascending: false });
  
  // Get best score per player
  const uniquePlayers = {};
  topScores?.forEach(score => {
    if (!uniquePlayers[score.user_id] || score.score > uniquePlayers[score.user_id]) {
      uniquePlayers[score.user_id] = score.score;
    }
  });
  
  // Convert to array, sort, and limit to 10
  const topTen = Object.entries(uniquePlayers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Fetch player names
  const userIds = topTen.map(([userId]) => userId);
  const { data: users } = await supabase
    .from('game_users')
    .select('user_id, player_name')
    .in('user_id', userIds);
  
  return topTen.map(([userId, score], idx) => ({
    user_id: userId,
    player_name: users?.find(u => u.user_id === userId)?.player_name || 'Unknown',
    score,
    rank: idx + 1,
    source: 'pop_game'
  }));
};
```

---

### 4. Update CompetitionManager UI
**File:** `src/admin/CompetitionManager.jsx`

#### A. Add Cancel Button (Active Competition View)
Add a "Cancel Competition" button in the active competition header:
```jsx
<button
  onClick={handleCancelCompetition}
  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
>
  Cancel Competition
</button>
```

#### B. Display Both Leaderboards Side by Side
Replace the current "Monthly Top 19" section with:
- **Left Panel:** Monthly Leaderboard (Top 20) with checkboxes
- **Right Panel:** Pop Game Leaderboard (Top 10) with checkboxes

#### C. Player Selection UI
- Each leaderboard entry has a checkbox
- Show selection count: "Selected: X/24"
- Players can be selected from either leaderboard
- Prevent duplicate selections (same user from both lists)

#### D. Create Competition Button
Only enabled when exactly 24 unique players are selected

---

### 5. Competition Workflow Explanation

Once the admin clicks **"Create Competition"** with 24 players selected:

**Step 1: Competition Created (Status: "waiting")**
- 24 players are added to `competition_players` table
- Competition shows "Start Competition" button
- Players see "Competition Starting Soon!" on their screen

**Step 2: Admin Starts Competition (5-second countdown)**
- Round 1 begins
- 24 players are randomly split into 2 groups (A and B, 12 each)
- 1-minute timer starts

**Step 3: Players Answer Questions**
- Each correct answer adds score to their group
- Players in the same group contribute to group score
- Real-time score updates visible to all

**Step 4: Round Ends (Admin clicks "End Round & Eliminate")**
- Losing group (lower score) is eliminated
- 12 players remain qualified

**Step 5: Rounds 2-3 Follow Same Pattern**
- Round 2: 12 → 6 players (Groups C vs D)
- Round 3: 6 → 3 players (Groups E vs F)

**Step 6: Final Round (Round 4)**
- 3 remaining players compete individually
- Highest individual score wins

**Step 7: Competition Complete**
- Admin clicks "Complete & Show Winners"
- 1st, 2nd, 3rd place recorded
- Players can view results on Competition Viewer page

---

## UI Mockup

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🏆 Create New Competition                     [Cancel Competition] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📊 Monthly Leaderboard (Top 20)    │  🎮 Pop Game Leaderboard     │
│  ─────────────────────────────────  │  ────────────────────────────│
│  ☑ #1  PlayerOne         12,500    │  ☑ #1  GamerX          5,200 │
│  ☑ #2  PlayerTwo         11,800    │  ☐ #2  ProPlayer       4,800 │
│  ☑ #3  PlayerThree       10,200    │  ☐ #3  ChampKing       4,500 │
│  ☐ #4  PlayerFour         9,800    │  ☐ #4  StarPlayer      4,200 │
│  ...                                │  ...                         │
│  ☐ #20 PlayerTwenty       2,100    │  ☐ #10 NewbieHero      1,800 │
│                                                                     │
│  ───────────────────────────────────────────────────────────────── │
│                                                                     │
│  Selected: 22/24 players                                            │
│                                                                     │
│  🔍 Search additional players: [________________] [Search]          │
│                                                                     │
│  Added manually: [Player A ✕] [Player B ✕]                         │
│                                                                     │
│  [────────── Create Competition (24 players) ──────────]            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/api/competition.js` | Add `cancelCompetition()` function, update `fetchMonthlyTopPlayers()` to accept limit param |
| `src/lib/api/popGame.js` | Add `fetchPopGameTopForCompetition()` function |
| `src/admin/CompetitionManager.jsx` | Major UI updates: cancel button, dual leaderboard display, checkbox selection, player count tracking |

---

## Technical Details

### State Management in CompetitionManager
```javascript
// New state variables
const [popGameLeaderboard, setPopGameLeaderboard] = useState([]);
const [selectedMonthlyPlayers, setSelectedMonthlyPlayers] = useState([]);
const [selectedPopGamePlayers, setSelectedPopGamePlayers] = useState([]);

// Total selected count
const totalSelected = new Set([
  ...selectedMonthlyPlayers,
  ...selectedPopGamePlayers,
  ...manualPlayers.map(p => p.user_id)
]).size;
```

### Cancel Competition Handler
```javascript
async function handleCancelCompetition() {
  if (confirm('Are you sure? This will delete the competition and all progress.')) {
    await cancelCompetition(activeCompetition.id);
    toast.success('Competition cancelled');
    loadData();
  }
}
```

---

## Competition Flow Diagram

```text
[Admin Selects 24 Players]
         ↓
[Create Competition] → Status: "waiting"
         ↓
[Start Competition] → 5s countdown
         ↓
┌─────────────────────────────────┐
│ ROUND 1: 24 players             │
│ Group A (12) vs Group B (12)    │
│ 1 minute timer                  │
│ → Losing group eliminated       │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ ROUND 2: 12 players             │
│ Group C (6) vs Group D (6)      │
│ → Losing group eliminated       │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ ROUND 3: 6 players              │
│ Group E (3) vs Group F (3)      │
│ → Losing group eliminated       │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ FINAL ROUND: 3 players          │
│ Individual competition          │
│ Highest score wins!             │
└─────────────────────────────────┘
         ↓
[Complete Competition] → Show Winners
```

---

## Summary

This plan adds:
1. **Cancel Competition** - Admin can abort at any time
2. **Dual Leaderboard View** - Monthly (20) + Pop Game (10) side by side
3. **Flexible Selection** - Checkboxes to pick any 24 players
4. **Clear Workflow** - Step-by-step competition progression with group elimination

The competition uses a tournament-style elimination where groups compete, losers are eliminated, until 3 finalists compete individually for the championship.

