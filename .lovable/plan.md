

# Plan: Weekly Email Notification System

## Overview

Implement a scheduled email notification system that sends:
1. **Friday 11:00 AM UTC** - Weekly Challenge opening reminder
2. **Tuesday 10:00 AM UTC** - Mid-week engagement reminder with a Bible question

---

## Prerequisites: Email Service Setup

Since this project uses an external Supabase project (not Lovable Cloud), you'll need to set up **Resend** for email delivery.

### Steps to Set Up Resend:

1. Go to [resend.com](https://resend.com) and create an account
2. Add and verify your email domain at [resend.com/domains](https://resend.com/domains)
   - This is required to send emails (you cannot send from unverified domains)
   - Follow Resend's DNS verification instructions
3. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
4. Once ready, I'll help you securely store the API key in Supabase secrets

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    pg_cron (Supabase)                           │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │ Friday 11:00 AM UTC │    │ Tuesday 10:00 AM UTC│             │
│  │ (cron: 0 11 * * 5)  │    │ (cron: 0 10 * * 2)  │             │
│  └──────────┬──────────┘    └──────────┬──────────┘             │
│             │                          │                        │
│             ▼                          ▼                        │
│      ┌──────────────────────────────────────────┐               │
│      │  send-scheduled-emails Edge Function     │               │
│      │                                          │               │
│      │  1. Fetch users with notifications on    │               │
│      │  2. Get user emails from auth.users      │               │
│      │  3. Send emails via Resend               │               │
│      │  4. Log results                          │               │
│      └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. New Edge Function: `send-scheduled-emails`

**File:** `supabase/functions/send-scheduled-emails/index.ts`

This function handles both notification types based on a `type` parameter:

| Type | Schedule | Message |
|------|----------|---------|
| `challenge_open` | Friday 11:00 AM UTC | "Weekly Challenge starts in 1 hour! Get ready to test your faith!" |
| `midweek_reminder` | Tuesday 10:00 AM UTC | Bible question + reminder to play |

**Features:**
- Fetches users from `game_users` where `notify_challenge_open = true` (for Friday) or general users (for Tuesday)
- Gets email addresses by joining with `auth.users`
- Sends personalized emails using Resend's batch API
- Logs success/failure counts
- Includes beautiful HTML email templates with Bible-themed styling

**Email Template Design:**
- Matches the app's candy/spiritual aesthetic
- Gradient header with app logo
- Clear call-to-action button
- Mobile-responsive design

---

### 2. pg_cron Jobs (2 jobs)

Create two scheduled jobs in Supabase:

**Job 1: Friday Challenge Opening (11:00 AM UTC)**
```sql
SELECT cron.schedule(
  'weekly-challenge-email-friday',
  '0 11 * * 5',  -- Every Friday at 11:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://rhanvchqlilmzxmufode.supabase.co/functions/v1/send-scheduled-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"type": "challenge_open"}'::jsonb
  ) AS request_id;
  $$
);
```

**Job 2: Tuesday Mid-week Reminder (10:00 AM UTC)**
```sql
SELECT cron.schedule(
  'weekly-reminder-email-tuesday',
  '0 10 * * 2',  -- Every Tuesday at 10:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://rhanvchqlilmzxmufode.supabase.co/functions/v1/send-scheduled-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"type": "midweek_reminder"}'::jsonb
  ) AS request_id;
  $$
);
```

---

### 3. Bible Questions for Tuesday Reminders

Store a collection of engaging Bible questions in the edge function:

```text
Examples:
- "Who built the ark? 🚢 Come play and find out!"
- "How many days did Jesus fast in the wilderness? Test your knowledge!"
- "Which book comes after Genesis? Light up your Bible knowledge!"
- "Who was swallowed by a big fish? Play now to learn more!"
```

---

### 4. Update config.toml

Add the new edge function configuration:

```toml
[functions.send-scheduled-emails]
verify_jwt = false
```

---

## Email Templates

### Friday - Challenge Opening

```text
Subject: ✨ Weekly Challenge Starts in 1 Hour!

┌─────────────────────────────────────┐
│  🔥 Light Up Bible Trivia 🔥       │
│  (gradient header)                  │
├─────────────────────────────────────┤
│                                     │
│  Hey [Player Name]!                 │
│                                     │
│  The Weekly Challenge opens in      │
│  just 1 HOUR (12:00 PM UTC)!        │
│                                     │
│  🏆 Compete for the top spot        │
│  💡 Test your Bible knowledge       │
│  ⏰ Open until Monday midnight      │
│                                     │
│  [ PLAY NOW → ]                     │
│                                     │
└─────────────────────────────────────┘
```

### Tuesday - Mid-week Reminder

```text
Subject: 📖 Quick Question: [Random Bible Question]

┌─────────────────────────────────────┐
│  🔥 Light Up Bible Trivia 🔥       │
│  (gradient header)                  │
├─────────────────────────────────────┤
│                                     │
│  Hey [Player Name]!                 │
│                                     │
│  Quick question for you:            │
│                                     │
│  "Who defeated Goliath with a       │
│   sling and a stone?"               │
│                                     │
│  Think you know? Come play and      │
│  test your Bible knowledge!         │
│                                     │
│  [ LIGHT UP NOW → ]                 │
│                                     │
└─────────────────────────────────────┘
```

---

## File Changes Summary

| File | Change | Description |
|------|--------|-------------|
| `supabase/functions/send-scheduled-emails/index.ts` | **NEW** | Edge function for sending scheduled emails |
| `supabase/config.toml` | **MODIFY** | Add new function configuration |
| Supabase SQL (via tool) | **NEW** | Create 2 pg_cron jobs for Friday and Tuesday |

---

## Required Secret

Before implementing, you'll need to provide the **RESEND_API_KEY**:

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain at [resend.com/domains](https://resend.com/domains)
3. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
4. Share the API key when prompted (it will be stored securely in Supabase secrets)

---

## Notification Preference Respect

The system respects existing user preferences:
- Uses `notify_challenge_open` column for Friday notifications
- Tuesday reminders can optionally use a new column or send to all users

---

## Next Steps After Approval

1. Confirm you have a Resend account and verified domain
2. I'll request the RESEND_API_KEY to store securely
3. Create the edge function
4. Set up the pg_cron jobs
5. Test the email delivery

