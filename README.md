# Team Shot Scoring Management

Next.js App Router + Supabase app for leagues, seasons, teams, players, shot logging, analytics, and admin integrity workflows.

## Architecture & Folder Structure

- `app/(auth)` auth and onboarding routes.
- `app/(dashboard)` league, season, scoreboard, players, teams, admin routes.
- `app/api/*` mutation/query handlers (league create, shot write, admin writes).
- `src/lib/supabase/*` typed server/browser/service Supabase clients.
- `src/lib/data/*` server-side typed query layer.
- `src/lib/validation/*` Zod schemas for forms and API payload validation.
- `src/providers/*` client providers (TanStack Query).
- `src/types/database.ts` generated-like database shape for end-to-end typing.
- `docs/schema-to-product-map.md` schema-to-product mapping and role strategy.

## Page Map (Routes)

- `/` landing
- `/login` magic link sign-in
- `/onboarding` create first league/profile flow
- `/league/[leagueId]/dashboard` league command center
- `/league/[leagueId]/season/[seasonId]` season overview
- `/league/[leagueId]/season/[seasonId]/scoreboard` realtime-ish shot entry + scoreboard polling
- `/players/[playerId]` player detail (career + seasonal + XP)
- `/teams/[teamId]` team detail + season performance
- `/admin` admin tools index
- `/admin/data-integrity` full-table integrity workspace

## Data Fetching Strategy

- Protected reads are server-side by default using server Supabase client.
- Shot scoreboard uses TanStack Query polling (`refetchInterval`) for smooth updates.
- API routes enforce validation with Zod and season-status guardrails.

## Dev

```bash
npm install
npm run dev
npm run lint
```

Required env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional admin scripts)

## Database Utilization Report

| Table | Features/pages | CRUD |
|---|---|---|
| leagues | onboarding + league dashboard | C/R |
| profiles | auth profile bootstrap | C/R/U |
| league_memberships | onboarding + role checks + admin write tool | C/R/U/D*
| seasons | season pages/admin | C/R/U/D*
| teams | team pages/admin | C/R/U/D*
| tiers | season assignment/admin | C/R/U/D*
| players | player detail/admin | C/R/U/D*
| season_players | season roster, scoreboard | C/R/U/D*
| season_player_assignments | season query + admin correction tool | C/R/U/D*
| season_player_allowance_events | shot logging + allowance timeline | C/R/U/D*
| season_player_stats | scoreboard + season analytics | C/R/U*
| season_team_stats | team analytics | R/U*
| player_career_stats | player analytics | R/U*
| season_results | season outcomes | C/R/U/D*
| season_awards | season awards | C/R/U/D*
| player_xp_awards | player XP breakdown | C/R/U/D*
| season_teams | season setup | C/R/U/D*
| season_tiers | season setup | C/R/U/D*
| bottle_types | scoring config | C/R/U/D*
| dice_sets | scoring config | C/R/U/D*
| dice_set_faces | scoring config | C/R/U/D*
| shot_events | shot entry + scoreboard + history | C/R/U/D*

`*` Admin integrity workspace supports controlled inserts/corrections for those entities.
