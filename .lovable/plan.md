
# Plan: Add Error Boundary, Loading Skeleton, and No Quiz Page

## Overview

Implement three features to improve user experience when things go wrong or are not ready:
1. **Error Boundary** - Catch JavaScript errors in game screens and display a graceful fallback UI
2. **Loading Skeleton** - Themed, animated skeleton for Weekend Challenge loading state
3. **No Quiz Page** - Dedicated page for levels without quiz content

---

## Current State

| Issue | Current Behavior |
|-------|------------------|
| JavaScript errors in game screens | White screen crash |
| Weekend Challenge loading | Plain gray text "Loading Weekly Challenge..." |
| No quiz for a level | Basic centered message in GameScreen |

---

## Implementation

### 1. Error Boundary Component (NEW)

Create a reusable React class component that catches errors in child components.

**File:** `src/components/ErrorBoundary.jsx`

```text
+-------------------------------------------+
|                                           |
|              😢 Oops!                     |
|                                           |
|     Something went wrong                  |
|                                           |
|   Don't worry, your progress is saved.   |
|   Try refreshing or go back to the map.  |
|                                           |
|   [🔄 Try Again]  [🗺️ Back to Map]       |
|                                           |
+-------------------------------------------+
```

**Features:**
- Uses React's `componentDidCatch` and `getDerivedStateFromError` lifecycle methods
- Themed UI matching the app's Candy Crush style with gradient backgrounds
- "Try Again" button that resets the error state
- "Back to Map" button to safely navigate away
- Logs errors to console for debugging
- Uses `useTheme()` for consistent styling (via wrapper component pattern)

**Technical Note:** Since Error Boundaries must be class components but we want to use the `useTheme()` hook, we'll create a functional wrapper component that passes theme config as a prop.

---

### 2. Loading Skeleton for Weekend Challenge (NEW)

Create a themed loading skeleton that matches the Weekend Challenge UI.

**File:** `src/components/ui/WeeklyChallengeLoadingSkeleton.jsx`

```text
+-------------------------------------------+
|  ⏳ ---   Score: ---   Q --/--            |  <- Skeleton HUD
+-------------------------------------------+
|  [===========---------------------]       |  <- Skeleton progress bar
|                                           |
|  +-----------------------------------+    |
|  |                                   |    |
|  |    ✨ Lighting up your word...   |    |  <- Centered message
|  |                                   |    |
|  |    [~~~~~~~~~~~~~~~]              |    |  <- Skeleton question box
|  |    [~~~]  [~~~]  [~~~]  [~~~]    |    |  <- Skeleton options
|  |                                   |    |
|  +-----------------------------------+    |
|                                           |
|   ✅ Correct: --    ❌ Incorrect: --     |  <- Skeleton stats
+-------------------------------------------+
```

**Features:**
- Animated shimmer effect on skeleton elements
- Matches the actual Weekend Challenge layout (HUD, progress bar, question card, stats)
- Uses theme colors from `useTheme()`
- Twinkling star background matching the active game
- Spiritual loading messages: "Lighting up your word...", "Preparing your challenge..."

---

### 3. No Quiz Page Component (NEW)

Create a dedicated, themed page for levels without quiz content.

**File:** `src/components/NoQuizPage.jsx`

```text
+-------------------------------------------+
|              ✨ Stars background ✨       |
|                                           |
|     +-------------------------------+     |
|     |                               |     |
|     |           📖                  |     |
|     |                               |     |
|     |   Quiz Coming Soon!           |     |
|     |                               |     |
|     |   This level's quiz is being  |     |
|     |   prepared. Check back soon!  |     |
|     |                               |     |
|     |   [🗺️ Back to Map]           |     |
|     |                               |     |
|     +-------------------------------+     |
|                                           |
+-------------------------------------------+
```

**Features:**
- Full-screen themed background with twinkling stars
- Glass-morphism card with pink/purple borders (matching game style)
- Bible/scroll emoji for biblical theming
- Clear, friendly message explaining the quiz isn't ready
- 3D styled "Back to Map" button
- Uses `useTheme()` for consistent theming

---

## File Changes Summary

| File | Change | Description |
|------|--------|-------------|
| `src/components/ErrorBoundary.jsx` | **NEW** | Reusable error boundary component |
| `src/components/ui/WeeklyChallengeLoadingSkeleton.jsx` | **NEW** | Themed loading skeleton |
| `src/components/NoQuizPage.jsx` | **NEW** | Page for levels without quiz |
| `src/pages/WeeklyChallengeScreen.jsx` | **MODIFY** | Wrap with ErrorBoundary, use new skeleton |
| `src/components/GameScreen.jsx` | **MODIFY** | Wrap with ErrorBoundary, use NoQuizPage |
| `src/App.jsx` | **MODIFY** | Add ErrorBoundary wrapper around game routes |

---

## Integration Details

### Wrapping GameScreen with ErrorBoundary

In `src/App.jsx` or `src/pages/MapAndGame.jsx`, wrap the GameScreen:

```javascript
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary>
  <GameScreen {...props} />
</ErrorBoundary>
```

### Using NoQuizPage in GameScreen

Replace the current basic "No Question Yet" block (lines 248-266) with:

```javascript
import NoQuizPage from '@/components/NoQuizPage';

if (!questionData) {
  return <NoQuizPage />;
}
```

### Using LoadingSkeleton in WeeklyChallengeScreen

Replace the current loading state (lines 369-376) with:

```javascript
import WeeklyChallengeLoadingSkeleton from '@/components/ui/WeeklyChallengeLoadingSkeleton';

if (!questions) {
  return <WeeklyChallengeLoadingSkeleton />;
}
```

---

## Styling Approach

All new components will follow the established design system:
- **Background:** Themed gradient from `config.background.gradient`
- **Cards:** Glass-morphism with `bg-white/95 backdrop-blur-xl` and pink borders
- **Buttons:** 3D candy-style with `shadow-[0_3px_0_color]` and hover effects
- **Stars:** Same twinkling star animation pattern used in GameScreen
- **Typography:** Bold gradients for headings, friendly messaging

---

## Error Boundary Technical Details

Since React Error Boundaries require class components but our theme system uses hooks, we use this pattern:

```javascript
// Wrapper to pass theme to class component
function ErrorBoundaryWrapper({ children }) {
  const { config } = useTheme();
  return <ErrorBoundaryClass config={config}>{children}</ErrorBoundaryClass>;
}

// Class component with error catching
class ErrorBoundaryClass extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // Render themed fallback UI using this.props.config
    }
    return this.props.children;
  }
}
```

---

## Implementation Order

1. **ErrorBoundary.jsx** - Create the error boundary component first
2. **NoQuizPage.jsx** - Create the no quiz page
3. **WeeklyChallengeLoadingSkeleton.jsx** - Create the loading skeleton
4. **GameScreen.jsx** - Integrate NoQuizPage and wrap with ErrorBoundary
5. **WeeklyChallengeScreen.jsx** - Integrate skeleton and wrap with ErrorBoundary
6. **App.jsx** - Add top-level ErrorBoundary wrapper for safety
