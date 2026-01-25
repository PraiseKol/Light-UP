

# Plan: Fix Push Notifications, Competition Automation, and Service Worker

## Overview

This plan addresses the three identified issues to ensure the competition system and push notifications work reliably:

1. **Push Notification Edge Function** - Currently broken due to improper VAPID signing and Web Push encryption
2. **Competition Automation Reliability** - Currently depends on client-side timers which will fail if no clients are connected
3. **Service Worker Push Handler** - Missing custom handler to display notifications when app is in background

---

## Issue 1: Fix Push Notification Edge Function

### Problem

The current `send-push-notification` Edge Function has critical flaws:
- Line 105: VAPID JWT signature is a literal string `"signature"` instead of actual ECDSA-signed data
- Line 116: Payload is sent as plain text instead of being encrypted with AES-128-GCM
- This causes all push notifications to fail with 401/403 errors from push services

### Solution

Rewrite the Edge Function using the `web-push` npm package which handles all the complex cryptography automatically.

### Implementation

**File: `supabase/functions/send-push-notification/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds, notification } = await req.json();

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Configure web-push with VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    
    webpush.setVapidDetails(
      'mailto:support@lightup.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Fetch subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    if (userIds?.length > 0) {
      query = query.in('user_id', userIds);
    }
    const { data: subscriptions, error } = await query;

    if (error || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/logo192.jpg',
      badge: '/logo192.jpg',
      data: notification.data || {},
    });

    // Send notifications using web-push (handles encryption automatically)
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            payload
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (err) {
          // Remove invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions')
              .delete().eq('endpoint', sub.endpoint);
          }
          return { success: false, endpoint: sub.endpoint };
        }
      })
    );

    const sent = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Key changes:**
- Uses `npm:web-push@3.6.7` which handles ECDSA signing and AES-GCM encryption
- `webpush.setVapidDetails()` properly configures VAPID authentication
- `webpush.sendNotification()` encrypts payload correctly per Web Push protocol

---

## Issue 2: Add Server-Side Competition Automation

### Problem

Competition phase transitions currently rely on client-side timers calling `processPhaseTransition()`. If no clients are connected (e.g., all users close their browsers), the competition will stall.

### Solution

Use Supabase's `pg_cron` extension to schedule a job that calls the `competition-automation` Edge Function every 10 seconds during active competitions.

### Implementation

**Step 1: Run SQL to create cron job**

This SQL will be run via the database migration tool:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to check and trigger competition automation
CREATE OR REPLACE FUNCTION public.trigger_competition_automation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_comp RECORD;
BEGIN
  -- Find active competition that needs phase transition
  SELECT id INTO active_comp
  FROM public.competitions
  WHERE status != 'completed'
    AND phase IS NOT NULL
    AND phase NOT IN ('idle', 'grouped', 'completed')
    AND phase_ends_at IS NOT NULL
    AND phase_ends_at <= NOW()
  LIMIT 1;

  -- If found, call the edge function
  IF active_comp.id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://rhanvchqlilmzxmufode.supabase.co/functions/v1/competition-automation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYW52Y2hxbGlsbXp4bXVmb2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDg5MzIsImV4cCI6MjA2ODA4NDkzMn0.OQ2cN38ZpK-J9GBCFMbqgSWxZxhl229CcBTr6EYS_as'
      ),
      body := jsonb_build_object('competitionId', active_comp.id)
    );
  END IF;
END;
$$;

-- Schedule the job to run every 10 seconds
SELECT cron.schedule(
  'competition-automation-check',
  '*/10 * * * *',  -- Every 10 seconds approximated by minute-level cron
  $$SELECT public.trigger_competition_automation()$$
);
```

Note: Since `pg_cron` only supports minute-level granularity, we'll use a hybrid approach - the cron runs every minute but the Edge Function is also triggered by client timers for faster response. This ensures reliability even if no clients are connected.

**Alternative: 10-second polling via enhanced cron**

For true 10-second intervals, we can schedule 6 jobs offset by 10 seconds each:

```sql
-- Schedule 6 jobs at different second offsets for ~10s granularity
SELECT cron.schedule('comp-auto-0', '* * * * *', $$SELECT pg_sleep(0); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-10', '* * * * *', $$SELECT pg_sleep(10); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-20', '* * * * *', $$SELECT pg_sleep(20); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-30', '* * * * *', $$SELECT pg_sleep(30); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-40', '* * * * *', $$SELECT pg_sleep(40); SELECT public.trigger_competition_automation()$$);
SELECT cron.schedule('comp-auto-50', '* * * * *', $$SELECT pg_sleep(50); SELECT public.trigger_competition_automation()$$);
```

---

## Issue 3: Add Service Worker Push Event Handler

### Problem

The PWA uses `vite-plugin-pwa` which generates a service worker automatically, but it doesn't include a custom `push` event handler. Without this, incoming push notifications won't be displayed when the app is in the background.

### Solution

Create a custom service worker file that handles push events and configure vite-plugin-pwa to include it.

### Implementation

**Step 1: Create custom service worker**

**File: `public/sw-custom.js`**

```javascript
// Custom push notification handler
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/logo192.jpg',
      badge: data.badge || '/logo192.jpg',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        { action: 'open', title: 'Open App' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Light UP', options)
    );
  } catch (e) {
    console.error('Push event error:', e);
  }
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Otherwise open new window
        return clients.openWindow(urlToOpen);
      })
  );
});
```

**Step 2: Update vite.config.js to inject custom service worker**

**File: `vite.config.js`** - Update the VitePWA configuration:

```javascript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['logoo.png', 'logo192.jpg', 'logo512.png'],
  manifest: {
    // ... existing manifest config
  },
  workbox: {
    skipWaiting: true,
    clientsClaim: true,
    globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2,mp3,wav,m4a}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    // Import custom service worker code
    importScripts: ['/sw-custom.js'],
    runtimeCaching: [
      // ... existing runtime caching config
    ]
  }
})
```

The key addition is `importScripts: ['/sw-custom.js']` which tells Workbox to import our custom push handler into the generated service worker.

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Rewrite to use `web-push` npm package for proper VAPID signing and payload encryption |
| `public/sw-custom.js` | New file - Custom service worker with push and notificationclick handlers |
| `vite.config.js` | Add `importScripts` to include custom service worker |
| Database (via SQL Editor) | Add `pg_cron` jobs to trigger competition automation every ~10 seconds |

---

## Testing Plan

After implementation:

1. **Test Push Notifications:**
   - Subscribe to push notifications in the app
   - Use the Edge Function directly to send a test notification
   - Verify notification appears on device (both foreground and background)

2. **Test Competition Automation:**
   - Start a test competition with the admin panel
   - Close all browser windows
   - Verify phases still transition automatically via cron

3. **Test Service Worker:**
   - Install PWA on device
   - Send push notification while app is closed
   - Verify notification appears and clicking it opens the app

---

## Technical Notes

### Why web-push library?
The Web Push protocol requires:
- ECDSA signing of VAPID JWT with ES256 algorithm
- AES-128-GCM encryption of the payload using the subscription's p256dh and auth keys
- Proper HTTP headers including encrypted content

The `web-push` library handles all of this automatically and is the industry standard.

### Why pg_cron?
- Runs server-side regardless of client connections
- Built into Supabase (just needs enabling)
- Reliable for periodic tasks like competition phase transitions

