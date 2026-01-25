

## Plan: Remove Christmas Theming from LeaderboardModal

### Overview
Update the LeaderboardModal component to remove all Christmas-themed elements and replace them with candy-themed styling consistent with the rest of the app.

---

### Issues to Fix

| Issue | Location | Current | Replacement |
|-------|----------|---------|-------------|
| Title emoji | Line 30 | `🎄 Leaderboards 🏆` | `🏆 Leaderboards ⭐` |
| Decorations | Lines 35-39 | 🎄⭐🎄 with `animate-ornament-swing` | ✨⭐✨ with `animate-pulse` |
| Tab background | Line 43 | `from-christmasGreen/20 to-christmasRed/20` | `from-blue-200/30 to-purple-200/30` |
| Rank 1 badge | Line 93 | `from-christmasGold to-yellow-600` | `from-amber-400 to-yellow-500` |
| Medal color | Line 82-85 | `text-christmasGold` for rank 1 | `text-amber-500` |

---

### Changes Summary

**File:** `src/components/LeaderboardModal.jsx`

1. **Update Modal Title (Line 30)**
   - From: `🎄 Leaderboards 🏆`
   - To: `🏆 Leaderboards ⭐`

2. **Replace Christmas Decorations (Lines 35-39)**
   - Remove `animate-ornament-swing` animation
   - Replace 🎄 emojis with ✨ sparkle emojis
   - Use `animate-pulse` for subtle animation effect

3. **Update Tab Background Gradient (Line 43)**
   - From: `from-christmasGreen/20 to-christmasRed/20`
   - To: `from-blue-200/30 to-purple-200/30` (candy blue/purple theme)

4. **Update Medal Colors (Lines 82-85)**
   - From: `text-christmasGold`
   - To: `text-amber-500`

5. **Update Rank 1 Badge Gradient (Line 93)**
   - From: `from-christmasGold to-yellow-600`
   - To: `from-amber-400 to-yellow-500`

---

### Visual Result

The leaderboard will feature:
- **Title**: "🏆 Leaderboards ⭐" (trophy and star)
- **Decorations**: ✨⭐✨ with subtle pulse animation
- **Tab bar**: Blue/purple gradient background (candy theme)
- **Rank badges**: Amber/gold gradients (standard gold, not Christmas gold)
- **Overall styling**: Consistent with the app's candy-crush inspired design

---

### Technical Details

```jsx
// Before (Christmas)
title="🎄 Leaderboards 🏆"
<span className="animate-ornament-swing">🎄</span>
className="from-christmasGreen/20 to-christmasRed/20"
medalColor = "text-christmasGold"
className="from-christmasGold to-yellow-600"

// After (Candy)
title="🏆 Leaderboards ⭐"
<span className="animate-pulse">✨</span>
className="from-blue-200/30 to-purple-200/30"
medalColor = "text-amber-500"
className="from-amber-400 to-yellow-500"
```

