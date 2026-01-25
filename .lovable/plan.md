
# Plan: Fix React Hooks Violation in WeeklyChallengeScreen and GameScreen

## Problem Summary

Users are seeing a **white screen** when trying to play the Weekend Challenge because of a critical React error: **hooks are being called after early return statements**.

In React, all hooks must be called at the **top level** of a component and in the **same order** on every render. When a component returns early (e.g., during loading), the hooks below that return are skipped. This causes React's internal hook tracking to break, resulting in a crash and white screen.

---

## Files Affected

| File | Issue |
|------|-------|
| `src/pages/WeeklyChallengeScreen.jsx` | `useTheme()` called at line 487, after 4 early return blocks |
| `src/components/GameScreen.jsx` | `useTheme()` and `useMemo()` called at lines 360-363, after 3 early return blocks |

---

## Fix Strategy

Move all hook calls (`useTheme()`, `useMemo()`) to the **top of the component**, before any conditional returns. The hook values can still be used in the later rendering logic.

---

## Changes Required

### 1. WeeklyChallengeScreen.jsx

**Current (broken):**
```javascript
// Lines 339-448: Multiple early returns
if (error) return ...
if (!questions) return ...
if (previousAttempt) return ...
if (isFinished) return ...

// Line 487: Hook called AFTER early returns (WRONG!)
const { config } = useTheme();

// Lines 490-498: useMemo for stars
const stars = useMemo(() => [...], []);
```

**Fixed:**
```javascript
// Move hooks to TOP, before any early returns
const { config } = useTheme();

const stars = useMemo(() => 
  [...Array(30)].map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 2}s`,
  })), []
);

// Now the early returns are safe
if (error) return ...
if (!questions) return ...
if (previousAttempt) return ...
if (isFinished) return ...

// Rest of component uses `config` and `stars`
return (
  <div className={`min-h-screen bg-gradient-to-b ${config.background.gradient} ...`}>
    {stars.map(...)}
  </div>
);
```

### 2. GameScreen.jsx

**Current (broken):**
```javascript
// Lines 202-252: Multiple early returns
if (!user) return ...
if (loadingQuestion || loadingGameUser) return ...
if (!questionData) return ...

// Lines 360-371: Hooks called AFTER early returns (WRONG!)
const { config } = useTheme();
const stars = useMemo(() => [...], []);
```

**Fixed:**
```javascript
// Move hooks to TOP of component, near other hooks
const { config } = useTheme();

const stars = useMemo(() => 
  [...Array(25)].map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 2}s`,
  })), []
);

// Early returns are now safe - hooks have already been called
if (!user) return ...
if (loadingQuestion || loadingGameUser) return ...
if (!questionData) return ...

// Main render uses `config` and `stars`
return (
  <div className={`h-[100dvh] flex flex-col bg-gradient-to-b ${config.background.gradient} ...`}>
    {stars.map(...)}
  </div>
);
```

---

## Technical Details

### Why This Fix Works

1. **Consistent Hook Order**: By calling `useTheme()` and `useMemo()` at the top of the component, they are executed on **every** render, regardless of which branch the component takes afterward.

2. **No Wasted Work**: Even though the hooks run during loading/error states, the overhead is minimal:
   - `useTheme()` just reads from context
   - `useMemo()` with `[]` dependency only runs once and caches the result

3. **Early Returns Still Work**: After the hooks are called, the component can safely return early for loading, error, or completion states without breaking React's hook tracking.

---

## Summary of Line Changes

### WeeklyChallengeScreen.jsx
- **Move** `const { config } = useTheme();` from line 487 to after the existing useState/useEffect hooks (around line 90)
- **Move** the `stars` useMemo block from lines 490-498 to the same location

### GameScreen.jsx  
- **Move** `const { config } = useTheme();` from line 360 to after the existing hooks (around line 90)
- **Move** the `stars` useMemo block from lines 363-371 to the same location

---

## Testing

After the fix:
1. Weekend Challenge should load without white screen
2. Main game should load without white screen
3. Theme should still apply correctly to all screens
4. Loading and error states should display properly
