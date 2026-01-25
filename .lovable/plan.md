
# Plan: Add Leaderboard to Free Fall Pop Game

## Overview
Add a leaderboard feature to the Pop Game page that displays the top 10 players' best scores. A trophy button will be visible in the ready and finished states, opening a modal with the global leaderboard.

---

## Changes Summary

### 1. Add Leaderboard Fetch Function
**File:** `src/lib/api/popGame.js`

Add a new function to fetch the global leaderboard:
- Query `pop_game_best_scores` where `rank = 1` (each player's personal best)
- Join with `game_users` to get `player_name`
- Order by `score DESC` and limit to 10
- Also calculate the current user's rank if they're not in the top 10

```text
┌──────────────────────────────────────────────────────┐
│  fetchPopGameLeaderboard(userId)                     │
├──────────────────────────────────────────────────────┤
│  1. Get top 10 best scores (rank=1) from all users   │
│  2. Join with game_users for player names            │
│  3. If userId not in top 10, fetch their rank        │
│  4. Return { topPlayers, currentUserRank }           │
└──────────────────────────────────────────────────────┘
```

---

### 2. Create Pop Game Leaderboard Modal Component
**File:** `src/components/PopGameLeaderboardModal.jsx` (new file)

Create a dedicated modal for the Pop Game leaderboard:
- Displays top 10 players with medals for ranks 1-3
- Shows the current user's position if not in top 10
- Uses the same styling patterns as the existing `LeaderboardModal`
- Candy-theme styling (no Christmas elements)

---

### 3. Update PopGamePage with Leaderboard
**File:** `src/pages/PopGamePage.jsx`

Add the following:
- Import the new modal and fetch function
- Add state for leaderboard data and modal visibility
- Add a leaderboard button (🏆) in the ready and finished states
- Fetch leaderboard data when the page loads

**UI Changes in Ready State:**
- Add a 🏆 button below the "Your Top 3" section before the start button

**UI Changes in Finished State:**
- Add a "View Leaderboard" button below the score display

---

## Technical Details

### Database Query
```sql
SELECT s.user_id, s.score, g.player_name 
FROM pop_game_best_scores s 
LEFT JOIN game_users g ON s.user_id = g.user_id 
WHERE s.rank = 1 
ORDER BY s.score DESC 
LIMIT 10
```

### New API Function Signature
```javascript
export async function fetchPopGameLeaderboard(userId = null) {
  // Returns: { topPlayers: [...], currentUserRank: {...} | null }
}
```

### UI Components

| Element | Location | Action |
|---------|----------|--------|
| 🏆 Leaderboard Button | Ready state | Opens leaderboard modal |
| 🏆 View Leaderboard Button | Finished state | Opens leaderboard modal |
| PopGameLeaderboardModal | Modal overlay | Shows top 10 + user position |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/api/popGame.js` | Add `fetchPopGameLeaderboard()` function |
| `src/components/PopGameLeaderboardModal.jsx` | New file - leaderboard modal component |
| `src/pages/PopGamePage.jsx` | Add leaderboard button, state, and modal integration |

---

## Visual Design

The leaderboard modal will feature:
- Title: "🏆 Free Fall Champions 🏆"
- Top 10 list with medal icons (🥇🥈🥉) for positions 1-3
- Player names and scores with candy-themed styling
- Crown (👑) decoration for the #1 player
- "Your Position" section at the bottom if user is not in top 10
- Gradient button styling matching the game theme
