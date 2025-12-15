# Buckets Scoreboard

Buckets is a minimal two-screen web app for recording TV-style basketball scoring. The admin page records shots via a Supabase RPC and the standings page shows a realtime leaderboard for the active season.

## Prerequisites
- Node.js 18+
- A Supabase project

## Set up the database
1. Open the Supabase SQL Editor.
2. Run `supabase/schema.sql` to create tables, functions, views, and RLS policies.
3. Run `supabase/seed.sql` to create a demo active season with teams, players, and a few shots.

## Configure the app
1. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon (publishable) key.
   ```bash
   cp .env.example .env.local
   ```
2. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Visit:
   - `/admin` to record shots (base 0/1/2, optional double, automatic moneyball every 10th shot).
   - `/standings` to show the TV view that refetches standings whenever `shot_events` change.

## Notes
- RLS allows public read access to standings data. Any user can insert new shots via `record_shot`, while only admins (profiles.role `admin` or `owner`) can update existing `shot_events` (e.g., voiding).
- The `record_shot` RPC computes shot_index, moneyball multiplier, and points atomically and validates that the roster belongs to an active season.
- The view `v_active_scoreboard_rows` powers the standings page and uses manual overrides when present.
