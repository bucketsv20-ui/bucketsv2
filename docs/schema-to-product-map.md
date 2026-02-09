# Schema-to-Product Map

## A) Table Coverage Plan

| Table | Product purpose | Key relationships | UI surfaces | CRUD coverage |
|---|---|---|---|---|
| leagues | Top-level organization | has many seasons/teams/players/memberships | Onboarding, league dashboard, admin | C: create league, R: dashboards, U: rename (admin), D: remove in admin tools |
| profiles | User profile identity | auth.users, memberships, audit created_by refs | onboarding/profile panel | C: ensure profile, R: account header, U: profile edit, D: via auth cascade |
| league_memberships | Role + access | leagues + profiles | onboarding join/create, admin membership manager | C: join/create owner, R: role checks/list, U: role/active toggle, D: deactivate/remove |
| seasons | Season configuration | belongs league, has season entities | season pages + admin season tools | C/R/U/D in season management |
| teams | Team directory | league, season_teams, season_players | teams pages, season setup | C/R/U/D |
| tiers | Skill/division + XP multiplier | league, season_tiers, players/shot_events | admin config, player assignment | C/R/U/D |
| players | Canonical player records | league, season_players, career stats | player directory, player detail | C/R/U/D |
| season_players | Player instance in season | links players/seasons/team/tier | roster management + shot entry | C/R/U/D |
| season_player_assignments | Historical assignment timeline | season_players -> teams/tiers | admin roster fixes | C/R/U/D |
| season_player_allowance_events | Shot allowance ledger | season_players | shot logging + admin adjustments | C on shot, R timeline, U/D admin corrections |
| season_player_stats | Materialized season player stats | season_players + seasons | scoreboard/player detail | R + admin upsert corrections |
| season_team_stats | Materialized season team stats | season/team | team detail + leaderboard | R + admin upsert corrections |
| player_career_stats | Materialized long-term stats | player | player detail | R + admin upsert corrections |
| season_results | Final placements | season/team/player | season historical results | C/R/U/D (admin) |
| season_awards | Season awards | season/team/player winner | season awards panel | C/R/U/D (admin) |
| player_xp_awards | XP bonus records | season_player | player detail + admin XP tools | C/R/U/D |
| season_teams | Active teams in season | season + team | season setup | C/R/U/D |
| season_tiers | Active tiers in season | season + tier | season setup | C/R/U/D |
| bottle_types | Scoring bottle categories | league, dice face | rules config | C/R/U/D |
| dice_sets | Active dice configuration | league/optional season | rules config + shot entry | C/R/U/D |
| dice_set_faces | Face-to-bottle mapping | dice_sets + bottle_types | rules config | C/R/U/D |
| shot_events | Source-of-truth shot log | season_player/team/tier etc | shot entry + timeline + scoreboard | C/R/U (void/edit)/D (admin purge) |

## B) Implied Roles + RLS-aware UX

- **Owner/Admin**: can mutate league-scoped tables (`is_league_admin`).
- **Member**: can read league data and perform member-safe operations (shot entry via API with server validation).
- **Anonymous**: only auth routes.

UX rules:
- Render mutation controls only when membership role is owner/admin.
- Guard server routes with membership checks; return 403 with contextual toast.
- Read views use empty-state language that explains whether absence is due to permissions vs no data.

## C) Suggested Index/Constraint Improvements

1. Add index on `shot_events(season_id, occurred_at)` to accelerate season timeline queries.
2. Add partial index `shot_events(season_player_id, is_voided)` where `is_voided=false` for live scoreboards.
3. Add uniqueness for `season_player_assignments(season_player_id, effective_from)` to prevent duplicate assignment start times.
4. Add check on `dice_sets`: `effective_to IS NULL OR effective_to > effective_from`.
5. Add check on `season_results`: one of `team_id`/`season_player_id` required based on `result_type`.
