## Monthly Competition: Auto-Selection of 16 Players

### Selection rule
- **12 slots**: top scorers by `total_user_score` for the **current calendar month** (sum of `progress.score` where `completed_at` is in this UTC month).
- **4 wildcard slots**: randomly picked from "active but not in top 12" players. *Active* = at least 3 `progress` entries in the last 14 days.
- **Excluded**: anyone in `main_leaderboard_bans` or `weekly_leaderboard_bans`, plus players already in the top 12.

### Admin flow
1. New **"Monthly Competition"** panel inside `CompetitionManager` with a **"Generate 16 Players"** button.
2. Calls a new edge function `monthly-competition-select` that returns the 12 + 4 list (with name, score, selection_type: `top_score` / `wildcard`).
3. Admin sees a **preview table** with swap controls:
   - Remove any player → pick replacement from a searchable list of eligible alternates.
   - Re-roll wildcards button.
4. Admin clicks **"Confirm & Notify"** → inserts rows into `competition_players` (reusing existing table; add `selection_type` value `monthly_auto`), sends push notifications via existing `send-push-notification`.
5. **"Start Competition"** button (separate, only enabled after confirm) launches the existing 4-round engine.

### Player-side experience
- **Qualified players**: Footer Compete button shows a **"You're In! Prepare for battle"** badge + countdown card on the map.
- **Non-qualified players**: Compete button shows **"Watch Live"** with a spectator entry — reuses `CompetitionViewerPage` with real-time scoreboard and elimination list (already exists; just wire entry point + label).
- Real-time updates already handled by `competition_players` / `competition_rounds` subscriptions.

### Technical pieces
- **Edge function** `monthly-competition-select/index.ts`:
  - Query monthly totals (UTC), exclude bans, return top 12.
  - Query active players (progress count ≥ 3 in 14d), exclude bans + top 12, random sample 4.
- **Migration**:
  - Add `competition_players.selection_type` allowed values include `'monthly_top'`, `'monthly_wildcard'` (already a text col).
  - Optional `monthly_competition_pool` table to persist the admin's draft pre-confirm (so reloads don't lose the list).
- **Admin UI**: extend `src/admin/CompetitionManager.jsx` with the new panel.
- **Player UI**: update footer Compete button + map badge to read qualification state from `competition_players` for the upcoming (status='waiting') competition.

---

## App Improvements

### Engagement (Phase 1)
- **Daily Quests**: 3 rotating quests per day (e.g., "Complete 2 levels", "Get a perfect score", "Play Weekend Challenge"). New `daily_quests` + `user_quest_progress` tables. Reward: talents/lives. Surfaces in a new map header tile.
- **Achievements & Badges**: ~25 milestones (first perfect, 10-day streak, finish phase X, tournament finalist). New `achievements` + `user_achievements` tables. Display on a profile/badges modal accessible from Settings.
- **Profile/Stats screen**: collects total score, streak, badges, tournament history — gives players something to show off.

### Polish (Phase 2)
- **Onboarding**: short interactive tutorial after the explainer video — guided first level + tooltip on lives/talents/footer buttons. Tracked via new `has_completed_tutorial` flag on `game_users`.
- **Accessibility**: add `aria-label`s to orb buttons, focus rings on interactive map nodes, prefers-reduced-motion handling for animations, color-contrast pass on glass cards.
- **Performance**: lazy-load admin bundle and competition viewer, image `loading="lazy"` on four-pics, memoize map node list, defer audio preload until first interaction.

---

## Suggested Build Order
1. Monthly auto-selection (edge function + admin preview/confirm + player qualification UI).
2. Daily Quests system.
3. Achievements/Badges + Profile screen.
4. Onboarding tutorial + a11y/perf polish pass.

Want me to start with **Step 1 (monthly auto-selection end-to-end)**, or split it differently?