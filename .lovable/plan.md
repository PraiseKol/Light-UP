

# Plan: Add Offline Support with Graceful Offline Page

## Overview

Add a complete offline detection system that displays a graceful, themed page when users lose internet connection during gameplay, and automatically reconnects when back online.

---

## Current State

| Aspect | Current Status |
|--------|----------------|
| PWA Caching | Configured in `vite.config.js` with Workbox |
| Service Worker | Exists for push notifications only |
| Offline Detection | None - no `navigator.onLine` checks |
| Offline UI | None - users see failed requests with no explanation |

---

## Implementation

### 1. Create useOnlineStatus Hook (NEW)

A reusable React hook that monitors network connectivity.

**File:** `src/hooks/useOnlineStatus.js`

```javascript
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

**Features:**
- Uses `navigator.onLine` for initial state
- Listens to `online` and `offline` window events
- Returns boolean indicating current connectivity
- Lightweight and reusable across the app

---

### 2. Create OfflinePage Component (NEW)

A themed full-screen offline fallback page.

**File:** `src/components/OfflinePage.jsx`

```text
+-------------------------------------------+
|            Twinkling Stars                |
|                                           |
|     +-------------------------------+     |
|     |           📡                  |     |
|     |                               |     |
|     |   You're Offline              |     |
|     |                               |     |
|     |   Don't worry! Your progress  |     |
|     |   is saved. We'll reconnect   |     |
|     |   automatically when you're   |     |
|     |   back online.                |     |
|     |                               |     |
|     |   [Animated connection dots]  |     |
|     |                               |     |
|     +-------------------------------+     |
|                                           |
+-------------------------------------------+
```

**Features:**
- Themed gradient background with twinkling stars (matching app style)
- Glass-morphism card with pink borders (consistent with ErrorBoundary, NoQuizPage)
- Animated "searching for connection" indicator (pulsing dots)
- Friendly, reassuring message about progress being saved
- Uses `useTheme()` for consistent theming
- Automatically dismisses when connection is restored (no button needed)

---

### 3. Create OfflineWrapper Component (NEW)

A wrapper component that conditionally shows the offline page.

**File:** `src/components/OfflineWrapper.jsx`

This component wraps the main app content and:
- Uses the `useOnlineStatus` hook
- Shows `OfflinePage` when offline
- Shows children when online
- Includes optional toast notification when connection is restored

---

### 4. Update App.jsx (MODIFY)

Integrate the offline wrapper at the app level.

**Changes:**
- Import `OfflineWrapper`
- Wrap `AppContent` with `OfflineWrapper`

```javascript
import OfflineWrapper from '@/components/OfflineWrapper';

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Router>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <OfflineWrapper>
              <AppContent />
            </OfflineWrapper>
          </QueryClientProvider>
        </AuthProvider>
      </Router>
    </SessionContextProvider>
  );
}
```

---

## File Changes Summary

| File | Change | Description |
|------|--------|-------------|
| `src/hooks/useOnlineStatus.js` | **NEW** | Hook to monitor network connectivity |
| `src/components/OfflinePage.jsx` | **NEW** | Themed offline fallback page |
| `src/components/OfflineWrapper.jsx` | **NEW** | Wrapper that shows offline page when disconnected |
| `src/App.jsx` | **MODIFY** | Wrap AppContent with OfflineWrapper |

---

## User Experience Flow

```text
User Playing Game
       |
       v
Connection Lost ──────> OfflineWrapper detects (navigator.onLine = false)
       |
       v
Offline Page Displayed
  - Themed UI
  - Reassuring message
  - Animated indicator
       |
       v
Connection Restored ───> OfflineWrapper detects (online event)
       |
       v
App Content Returns
  - Optional toast: "You're back online!"
  - Game continues from where they left off
```

---

## Technical Details

### Why Use Both navigator.onLine AND Events?

- `navigator.onLine` provides **initial state** when component mounts
- `online`/`offline` events provide **real-time updates**
- Together they ensure accurate detection at all times

### Why Not Block Everything Offline?

The current approach:
- Shows offline page **over** the app content (not replacing it)
- When back online, the app is exactly where it was
- User doesn't lose context or navigation state

### Styling Consistency

The OfflinePage will follow the established design patterns:
- Gradient background from theme config
- Glass-morphism card (bg-white/95 backdrop-blur-xl)
- Pink border accent (border-pink-200)
- 3D candy-style elements where appropriate
- Twinkling star background animation

---

## OfflinePage Visual Design

```text
+-------------------------------------------+
|  [Stars twinkling in background]          |
|                                           |
|    +----------------------------------+   |
|    |  Glass card with pink border     |   |
|    |                                  |   |
|    |          📡                      |   |
|    |   (large wifi/signal emoji)      |   |
|    |                                  |   |
|    |   You're Offline                 |   |
|    |   (gradient text title)          |   |
|    |                                  |   |
|    |   Don't worry! Your progress     |   |
|    |   is saved. We'll reconnect      |   |
|    |   as soon as you're back online. |   |
|    |                                  |   |
|    |   [● ● ●] (pulsing dots)        |   |
|    |   Waiting for connection...      |   |
|    |                                  |   |
|    +----------------------------------+   |
|                                           |
+-------------------------------------------+
```

---

## Implementation Order

1. **useOnlineStatus.js** - Create the network detection hook
2. **OfflinePage.jsx** - Create the themed offline UI
3. **OfflineWrapper.jsx** - Create the wrapper component
4. **App.jsx** - Integrate the wrapper

