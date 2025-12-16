-- Seed data for Buckets demo

insert into profiles (id, display_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Demo Admin', 'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;

insert into tiers (tier_name, color)
values
  ('Pro', '#10b981'),
  ('Rookie', '#38bdf8'),
  ('Veteran', '#f59e0b')
on conflict (tier_name) do update set color = excluded.color;

insert into players (player_id, name, is_hidden)
values
  (1, 'Alex Rivers', false),
  (2, 'Brooke Carter', false),
  (3, 'Casey Jordan', false),
  (4, 'Dev Patel', false),
  (5, 'Emi Tanaka', false),
  (6, 'Frankie Lopez', true),
  (7, 'Gabby Miles', false),
  (8, 'Harper Chen', false)
on conflict (player_id) do update set name = excluded.name, is_hidden = excluded.is_hidden;

insert into seasons (season_id, season_name, status, start_at, end_at, created_by)
values
  (101, '2023 Spring Classic', 'completed', '2023-03-01', '2023-05-01', '11111111-1111-1111-1111-111111111111'),
  (102, '2023 Summer Showdown', 'completed', '2023-06-01', '2023-08-01', '11111111-1111-1111-1111-111111111111'),
  (103, '2024 Winter Cup', 'active', '2024-01-10', null, '11111111-1111-1111-1111-111111111111')
on conflict (season_id) do update
set season_name = excluded.season_name,
    status = excluded.status,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    created_by = excluded.created_by;

with team_data as (
  select *
  from (values
    (101, 'Lightning', 1),
    (101, 'Thunder', 2),
    (101, 'Wolves', 3),
    (102, 'Comets', 1),
    (102, 'Orbit', 2),
    (102, 'Rangers', 3),
    (103, 'Frost', 1),
    (103, 'Aurora', 2),
    (103, 'Free Agents', 3)
  ) as v(season_id, team_name, sort_order)
), upserted_teams as (
  insert into season_teams (season_id, team_name, sort_order)
  select season_id, team_name, sort_order from team_data
  on conflict (season_id, team_name) do update set sort_order = excluded.sort_order
  returning season_team_id, season_id, team_name
), all_teams as (
  select season_team_id, season_id, team_name from upserted_teams
)
, roster_data as (
  select * from (values
    (101, 1, 'Lightning', 'Pro'),
    (101, 2, 'Lightning', 'Rookie'),
    (101, 7, 'Lightning', 'Rookie'),
    (101, 3, 'Thunder', 'Rookie'),
    (101, 4, 'Thunder', 'Pro'),
    (101, 5, 'Wolves', 'Rookie'),
    (101, 6, 'Wolves', 'Rookie'),
    (102, 1, 'Comets', 'Pro'),
    (102, 4, 'Comets', 'Veteran'),
    (102, 8, 'Comets', 'Rookie'),
    (102, 2, 'Orbit', 'Pro'),
    (102, 5, 'Orbit', 'Rookie'),
    (102, 3, 'Rangers', 'Veteran'),
    (102, 7, 'Rangers', 'Rookie'),
    (102, 6, 'Rangers', 'Rookie'),
    (103, 1, 'Frost', 'Pro'),
    (103, 4, 'Frost', 'Pro'),
    (103, 8, 'Frost', 'Rookie'),
    (103, 2, 'Aurora', 'Pro'),
    (103, 5, 'Aurora', 'Rookie'),
    (103, 3, 'Aurora', 'Veteran'),
    (103, 7, 'Aurora', 'Rookie'),
    (103, 6, 'Free Agents', 'Rookie')
  ) as v(season_id, player_id, team_name, tier_name)
), resolved_roster as (
  select
    rd.season_id,
    rd.player_id,
    st.season_team_id,
    t.tier_id
  from roster_data rd
  left join all_teams st on st.season_id = rd.season_id and st.team_name = rd.team_name
  left join tiers t on t.tier_name = rd.tier_name
), upsert_roster as (
  insert into season_roster (season_id, player_id, season_team_id, tier_id, is_active)
  select season_id, player_id, season_team_id, tier_id, true from resolved_roster
  on conflict (season_id, player_id) do update
    set season_team_id = excluded.season_team_id,
        tier_id = excluded.tier_id,
        is_active = excluded.is_active
  returning season_roster_id, season_id, player_id
), shot_seed as (
  select * from (values
    -- Spring Classic (completed)
    (101, 1, 1, 2, 2, 4, current_timestamp - interval '400 days'),
    (101, 1, 2, 2, 2, 4, current_timestamp - interval '399 days'),
    (101, 1, 3, 2, 2, 4, current_timestamp - interval '398 days'),
    (101, 1, 4, 2, 2, 4, current_timestamp - interval '397 days'),
    (101, 2, 1, 2, 2, 4, current_timestamp - interval '396 days'),
    (101, 2, 2, 2, 2, 4, current_timestamp - interval '395 days'),
    (101, 7, 1, 2, 1, 2, current_timestamp - interval '394 days'),
    (101, 7, 2, 2, 1, 2, current_timestamp - interval '393 days'),
    (101, 7, 3, 2, 1, 2, current_timestamp - interval '392 days'),
    (101, 3, 1, 2, 1, 2, current_timestamp - interval '391 days'),
    (101, 3, 2, 2, 1, 2, current_timestamp - interval '390 days'),
    (101, 3, 3, 2, 1, 2, current_timestamp - interval '389 days'),
    (101, 3, 4, 2, 1, 2, current_timestamp - interval '388 days'),
    (101, 3, 5, 2, 1, 2, current_timestamp - interval '387 days'),
    (101, 4, 1, 2, 2, 4, current_timestamp - interval '386 days'),
    (101, 4, 2, 2, 2, 4, current_timestamp - interval '385 days'),
    (101, 4, 3, 2, 2, 4, current_timestamp - interval '384 days'),
    (101, 4, 4, 2, 2, 4, current_timestamp - interval '383 days'),
    (101, 4, 5, 2, 2, 4, current_timestamp - interval '382 days'),
    (101, 5, 1, 2, 1, 2, current_timestamp - interval '381 days'),
    (101, 5, 2, 2, 1, 2, current_timestamp - interval '380 days'),
    (101, 5, 3, 2, 1, 2, current_timestamp - interval '379 days'),
    (101, 5, 4, 2, 1, 2, current_timestamp - interval '378 days'),
    (101, 6, 1, 2, 1, 2, current_timestamp - interval '377 days'),
    (101, 6, 2, 2, 1, 2, current_timestamp - interval '376 days'),

    -- Summer Showdown (completed)
    (102, 1, 1, 2, 2, 4, current_timestamp - interval '300 days'),
    (102, 1, 2, 2, 2, 4, current_timestamp - interval '299 days'),
    (102, 1, 3, 2, 2, 4, current_timestamp - interval '298 days'),
    (102, 4, 1, 2, 2, 4, current_timestamp - interval '297 days'),
    (102, 4, 2, 2, 2, 4, current_timestamp - interval '296 days'),
    (102, 4, 3, 2, 2, 4, current_timestamp - interval '295 days'),
    (102, 4, 4, 1, 2, 2, current_timestamp - interval '294 days'),
    (102, 8, 1, 2, 1, 2, current_timestamp - interval '293 days'),
    (102, 8, 2, 2, 1, 2, current_timestamp - interval '292 days'),
    (102, 8, 3, 2, 1, 2, current_timestamp - interval '291 days'),
    (102, 2, 1, 2, 1, 2, current_timestamp - interval '290 days'),
    (102, 2, 2, 2, 1, 2, current_timestamp - interval '289 days'),
    (102, 2, 3, 2, 1, 2, current_timestamp - interval '288 days'),
    (102, 2, 4, 2, 1, 2, current_timestamp - interval '287 days'),
    (102, 2, 5, 2, 1, 2, current_timestamp - interval '286 days'),
    (102, 5, 1, 2, 1, 2, current_timestamp - interval '285 days'),
    (102, 5, 2, 2, 1, 2, current_timestamp - interval '284 days'),
    (102, 5, 3, 2, 1, 2, current_timestamp - interval '283 days'),
    (102, 5, 4, 2, 1, 2, current_timestamp - interval '282 days'),
    (102, 5, 5, 2, 1, 2, current_timestamp - interval '281 days'),
    (102, 3, 1, 2, 1, 2, current_timestamp - interval '280 days'),
    (102, 3, 2, 2, 1, 2, current_timestamp - interval '279 days'),
    (102, 3, 3, 2, 1, 2, current_timestamp - interval '278 days'),
    (102, 3, 4, 2, 1, 2, current_timestamp - interval '277 days'),
    (102, 3, 5, 2, 1, 2, current_timestamp - interval '276 days'),
    (102, 3, 6, 2, 1, 2, current_timestamp - interval '275 days'),
    (102, 3, 7, 2, 1, 2, current_timestamp - interval '274 days'),
    (102, 7, 1, 2, 1, 2, current_timestamp - interval '273 days'),
    (102, 7, 2, 2, 1, 2, current_timestamp - interval '272 days'),
    (102, 7, 3, 2, 1, 2, current_timestamp - interval '271 days'),
    (102, 7, 4, 2, 1, 2, current_timestamp - interval '270 days'),
    (102, 6, 1, 2, 1, 2, current_timestamp - interval '269 days'),
    (102, 6, 2, 2, 1, 2, current_timestamp - interval '268 days'),
    (102, 6, 3, 2, 1, 2, current_timestamp - interval '267 days'),

    -- Winter Cup (active)
    (103, 1, 1, 2, 2, 4, current_timestamp - interval '30 days'),
    (103, 1, 2, 2, 2, 4, current_timestamp - interval '29 days'),
    (103, 4, 1, 2, 2, 4, current_timestamp - interval '28 days'),
    (103, 4, 2, 2, 2, 4, current_timestamp - interval '27 days'),
    (103, 8, 1, 2, 1, 2, current_timestamp - interval '26 days'),
    (103, 8, 2, 2, 1, 2, current_timestamp - interval '25 days'),
    (103, 2, 1, 2, 2, 4, current_timestamp - interval '24 days'),
    (103, 5, 1, 2, 1, 2, current_timestamp - interval '23 days'),
    (103, 5, 2, 2, 1, 2, current_timestamp - interval '22 days'),
    (103, 5, 3, 2, 1, 2, current_timestamp - interval '21 days'),
    (103, 3, 1, 2, 1, 2, current_timestamp - interval '20 days'),
    (103, 3, 2, 2, 1, 2, current_timestamp - interval '19 days'),
    (103, 7, 1, 2, 1, 2, current_timestamp - interval '18 days')
  ) as v(season_id, player_id, shot_index, base_value, multiplier, points, taken_at)
), shot_rows as (
  select
    ss.season_id,
    sr.season_roster_id,
    ss.base_value,
    ss.multiplier,
    ss.shot_index,
    ss.points,
    ss.taken_at
  from shot_seed ss
  join upsert_roster sr on sr.player_id = ss.player_id and sr.season_id = ss.season_id
)
insert into shot_events (season_id, season_roster_id, base_value, multiplier, shot_index, points, taken_at, recorded_by)
select
  season_id,
  season_roster_id,
  base_value,
  multiplier,
  shot_index,
  points,
  taken_at,
  '11111111-1111-1111-1111-111111111111'
from shot_rows
on conflict (season_roster_id, shot_index) do update
set base_value = excluded.base_value,
    multiplier = excluded.multiplier,
    points = excluded.points,
    taken_at = excluded.taken_at,
    recorded_by = excluded.recorded_by;
