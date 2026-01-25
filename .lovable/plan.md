

# Plan: Send Push Notifications When Admin Groups Players

## Overview
Add push notification functionality to alert the 24 selected players when the admin clicks "Group Players". The existing `send-push-notification` Edge Function will be used.

---

## Current State

### Competition Button
The **"Compete" button already exists** in both desktop and mobile footers:
- Red 🏆 trophy button labeled "Compete"
- Navigates to `/competition`
- Located at lines 1052-1066 (desktop) and 1206-1220 (mobile) in `MapAndGame.jsx`

No additional UI entry point is needed.

### Push Notification Timing
Currently: No notifications are sent for competitions
Required: Notify players when admin clicks "Group Players" (before competition starts)

---

## Implementation

### File to Modify

**`src/admin/CompetitionManager.jsx`** - Add push notification call after successful grouping

### Changes Required

Update the `handleGroupPlayers()` function (currently lines 238-246):

```javascript
async function handleGroupPlayers() {
  const success = await groupPlayersForCompetition(activeCompetition.id);
  if (success) {
    toast.success('Players grouped into A & B! Ready to start.');
    
    // Send push notifications to all grouped players
    const playerUserIds = activeCompetition.competition_players
      .map(p => p.user_id);
    
    try {
      await fetch(
        `https://rhanvchqlilmzxmufode.supabase.co/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            userIds: playerUserIds,
            notification: {
              title: '🏆 Competition Alert!',
              body: 'You have been selected for the 24-player tournament! Open the app to get ready.',
              data: { 
                type: 'competition_grouped',
                url: '/competition' 
              }
            }
          })
        }
      );
      console.log('Push notifications sent to players');
    } catch (error) {
      console.error('Failed to send push notifications:', error);
      // Don't fail the grouping if notifications fail
    }
    
    loadData();
  } else {
    toast.error('Failed to group players');
  }
}
```

### Additional Helper

Add the Supabase URL and anon key import (if not already available):

```javascript
// At top of file, import the supabase client config
import { supabase } from '@/lib/supabaseClient';

// In the function, use the project URL
const supabaseUrl = 'https://rhanvchqlilmzxmufode.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // the anon key
```

---

## Notification Flow

```text
Admin Dashboard
     │
     ▼
[Admin clicks "Group Players"]
     │
     ▼
groupPlayersForCompetition() assigns A/B groups
     │
     ▼
On success → Send push notification to 24 players
     │
     ▼
Players receive: "🏆 Competition Alert! You have been selected..."
     │
     ▼
[Admin then clicks "Start Competition"]
```

---

## Technical Details

### Edge Function Call Format

The `send-push-notification` Edge Function accepts:

```javascript
{
  userIds: string[],         // Array of user UUIDs to notify
  notification: {
    title: string,           // Notification title
    body: string,            // Notification body text
    icon?: string,           // Optional icon (defaults to /logo192.jpg)
    badge?: string,          // Optional badge
    data?: object            // Optional data payload (e.g., { url: '/competition' })
  }
}
```

### Error Handling

- Push notification failures should NOT prevent grouping from succeeding
- Log errors for debugging but continue with the flow
- The grouping success toast appears regardless of notification status

---

## Files Changed

| File | Change |
|------|--------|
| `src/admin/CompetitionManager.jsx` | Add push notification call in `handleGroupPlayers()` function |

---

## Summary

This is a minimal change that:
1. Uses the **existing** Edge Function for push notifications
2. Triggers notifications when admin clicks **"Group Players"** (as requested)
3. Targets only the **24 selected players**
4. Includes a compelling message with competition context
5. Gracefully handles notification failures without blocking the workflow

