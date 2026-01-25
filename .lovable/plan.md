

# Plan: Add Top 10 Scores Leaderboard to Free Fall Pop Game

## Overview
Add a leaderboard feature that displays the **top 10 scores globally** (not top 10 players). This means a single player can appear multiple times if they have multiple high scores in the top 10.

---

## Database Query Logic

The `pop_game_best_scores` table stores each player's personal top 3 scores (rank 1, 2, 3). To get the global top 10 scores:

```text
Query all scores from pop_game_best_scores (all ranks, not just rank=1)
    → Join with game_users to get player names
    → Order by score DESC
    → Limit 10
```

This ensures if one player has scores of 5000, 4800, 4500 and these are the highest globally, they will occupy positions 1, 2, and 3 on the leaderboard.

---

## Changes Summary

### 1. Add Leaderboard Fetch Function
**File:** `src/lib/api/popGame.js`

Add a new `fetchPopGameLeaderboard(userId)` function:
- Query ALL records from `pop_game_best_scores` (not filtered by rank)
- Join with `game_users` to get `player_name`
- Order by `score DESC`, limit 10
- Also calculate the current user's best score rank if not in top 10

---

### 2. Create Pop Game Leaderboard Modal
**File:** `src/components/PopGameLeaderboardModal.jsx` (new file)

Create a modal component that:
- Displays the top 10 scores with player names
- Shows medals (🥇🥈🥉) for positions 1-3
- Highlights entries belonging to the current user with "(You)"
- Shows the user's best score position if not in top 10
- Uses candy-theme styling consistent with the game

---

### 3. Update PopGamePage
**File:** `src/pages/PopGamePage.jsx`

Add:
- Import the new modal and fetch function
- State for leaderboard data and modal visibility
- A leaderboard button (🏆) in the "Ready" state near the best scores section
- A "View Leaderboard" button in the "Finished" state
- Fetch leaderboard data when the page loads

---

## Technical Details

### New API Function

```javascript
export const fetchPopGameLeaderboard = async (userId) => {
  // Get top 10 scores globally (same player can appear multiple times)
  const { data: topScores } = await supabase
    .from('pop_game_best_scores')
    .select('user_id, score, achieved_at')
    .order('score', { ascending: false })
    .limit(10);

  // Get player names for each score
  const userIds = [...new Set(topScores.map(s => s.user_id))];
  const { data: users } = await supabase
    .from('game_users')
    .select('user_id, player_name')
    .in('user_id', userIds);

  // Map player names to scores
  const topPlayers = topScores.map((score, index) => ({
    position: index + 1,
    user_id: score.user_id,
    player_name: users.find(u => u.user_id === score.user_id)?.player_name || 'Unknown',
    score: score.score,
    achieved_at: score.achieved_at
  }));

  // Check if current user's best score is in top 10
  let currentUserRank = null;
  if (userId && !topPlayers.some(p => p.user_id === userId)) {
    // Get user's best score and calculate rank
    const { data: userBest } = await supabase
      .from('pop_game_best_scores')
      .select('score')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userBest) {
      // Count how many scores are higher
      const { count } = await supabase
        .from('pop_game_best_scores')
        .select('*', { count: 'exact', head: true })
        .gt('score', userBest.score);

      currentUserRank = {
        position: (count || 0) + 1,
        score: userBest.score
      };
    }
  }

  return { topPlayers, currentUserRank };
};
```

---

### UI Changes

| Location | Element | Action |
|----------|---------|--------|
| Ready State | 🏆 Leaderboard Button | Opens leaderboard modal |
| Finished State | 🏆 View Leaderboard Button | Opens leaderboard modal |

---

### Modal Design

```text
┌─────────────────────────────────────┐
│      🏆 Free Fall Champions 🏆       │
├─────────────────────────────────────┤
│  🥇 1. PlayerOne           5,200    │
│  🥈 2. PlayerOne (You)     4,800    │  ← Same player, different score
│  🥉 3. PlayerTwo           4,500    │
│     4. PlayerThree         4,200    │
│     5. PlayerOne (You)     4,100    │  ← Same player again
│     6. PlayerFour          3,900    │
│     ...                             │
├─────────────────────────────────────┤
│  • • • Your Best Position • • •     │
│  #15 - 2,100 points                 │  ← Only if not in top 10
└─────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/lib/api/popGame.js` | Modify | Add `fetchPopGameLeaderboard()` function |
| `src/components/PopGameLeaderboardModal.jsx` | Create | New leaderboard modal component |
| `src/pages/PopGamePage.jsx` | Modify | Add button, state, and modal integration |

