-- Seed data for Buckets demo

insert into profiles (id, display_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Demo Admin', 'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;

insert into tiers (tier_id, tier_name, color) values
  (1, 'Pro', '#10b981'),
  (2, 'Rookie', '#38bdf8'),
  (3, 'Legends', '#f59e0b')
on conflict (tier_id) do update set tier_name = excluded.tier_name, color = excluded.color;

insert into players (player_id, name, is_hidden) values
  (1, 'Alex Rivers', false),
  (2, 'Brooke Carter', false),
  (3, 'Casey Jordan', false),
  (4, 'Dev Patel', false),
  (5, 'Emi Tanaka', false),
  (6, 'Frankie Lopez', false),
  (7, 'Gaby Mills', false),
  (8, 'Hudson Lee', true)
on conflict (player_id) do update set name = excluded.name, is_hidden = excluded.is_hidden;

insert into seasons (season_id, season_name, status, start_at, end_at, created_by)
values
  (1, 'Spring Showdown', 'completed', now() - interval '120 days', now() - interval '100 days', '11111111-1111-1111-1111-111111111111'),
  (2, 'Demo Season', 'active', now() - interval '14 days', null, '11111111-1111-1111-1111-111111111111'),
  (3, 'Next Season Preview', 'planned', null, null, '11111111-1111-1111-1111-111111111111')
on conflict (season_id) do update
set season_name = excluded.season_name,
    status = excluded.status,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    created_by = excluded.created_by;

insert into season_teams (season_team_id, season_id, team_name, sort_order) values
  (101, 1, 'Cyclones', 1),
  (102, 1, 'Wave Riders', 2),
  (201, 2, 'Lightning', 1),
  (202, 2, 'Thunder', 2),
  (301, 3, 'Comets', 1),
  (302, 3, 'Orcas', 2)
on conflict (season_team_id) do update set
  season_id = excluded.season_id,
  team_name = excluded.team_name,
  sort_order = excluded.sort_order;

insert into season_roster (season_roster_id, season_id, player_id, season_team_id, tier_id, is_active) values
  (1001, 1, 1, 101, 1, false),
  (1002, 1, 2, 102, 2, false),
  (1003, 1, 3, null, 2, false),
  (2001, 2, 1, 201, 1, true),
  (2002, 2, 2, 201, 2, true),
  (2003, 2, 4, 202, 1, true),
  (2004, 2, 5, 202, 2, true),
  (3001, 3, 6, 301, 2, true),
  (3002, 3, 7, 302, 3, true),
  (3003, 3, 8, 301, 2, true)
on conflict (season_roster_id) do update set
  season_id = excluded.season_id,
  player_id = excluded.player_id,
  season_team_id = excluded.season_team_id,
  tier_id = excluded.tier_id,
  is_active = excluded.is_active;

insert into shot_events (shot_id, season_id, season_roster_id, base_value, multiplier, shot_index, points, recorded_by)
values
  (1, 2, 2001, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111'),
  (2, 2, 2002, 2, 2, 1, 4, '11111111-1111-1111-1111-111111111111'),
  (3, 2, 2003, 1, 1, 1, 1, '11111111-1111-1111-1111-111111111111')
on conflict (shot_id) do update set
  season_id = excluded.season_id,
  season_roster_id = excluded.season_roster_id,
  base_value = excluded.base_value,
  multiplier = excluded.multiplier,
  shot_index = excluded.shot_index,
  points = excluded.points,
  recorded_by = excluded.recorded_by;
