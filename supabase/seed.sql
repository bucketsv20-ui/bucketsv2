-- Extensions (safe to run repeatedly)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- OPTIONAL (but recommended for local dev):
-- Create a deterministic demo login that your profiles row can FK to.
-- Email: demo.admin@buckets.local
-- Password: password123
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo.admin@buckets.local',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  raw_app_meta_data = excluded.raw_app_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'sub','11111111-1111-1111-1111-111111111111',
    'email','demo.admin@buckets.local'
  ),
  'email',
  now(),
  now(),
  now()
)
on conflict (id) do update set
  identity_data = excluded.identity_data,
  updated_at = now();


-- Profiles (now the FK will be satisfied locally)
insert into profiles (id, display_name, role)
values ('11111111-1111-1111-1111-111111111111', 'Demo Admin', 'admin')
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

insert into tiers (tier_id, tier_name, color) values
  (1, 'Pro', '#10b981'),
  (2, 'Rookie', '#38bdf8'),
  (3, 'Legends', '#f59e0b')
on conflict (tier_id) do update
set tier_name = excluded.tier_name,
    color = excluded.color;

insert into players (player_id, name, is_hidden) values
  (1, 'Alex Rivers', false),
  (2, 'Brooke Carter', false),
  (3, 'Casey Jordan', false),
  (4, 'Dev Patel', false),
  (5, 'Emi Tanaka', false),
  (6, 'Frankie Lopez', false),
  (7, 'Gaby Mills', false),
  (8, 'Hudson Lee', true)
on conflict (player_id) do update
set name = excluded.name,
    is_hidden = excluded.is_hidden;

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

insert into season_settings (season_id, points_rules)
values
  (1, jsonb_build_object('base_values', array[0,1,2], 'multipliers', array[1,2], 'moneyball_every', 10)),
  (2, jsonb_build_object('base_values', array[0,1,2], 'multipliers', array[1,2], 'moneyball_every', 10)),
  (3, jsonb_build_object('base_values', array[0,1,2], 'multipliers', array[1,2], 'moneyball_every', 10))
on conflict (season_id) do update
set points_rules = excluded.points_rules,
    updated_at = now();


-- ✅ MERGE RESOLUTION: keep the systematic IDs (100/200/300 blocks) and remove conflict markers
insert into season_teams (season_team_id, season_id, team_name, sort_order) values
  (100, 1, 'Lightning', 1),
  (101, 1, 'Thunder', 2),

  (200, 2, 'Hawks', 1),
  (201, 2, 'Owls', 2),
  (202, 2, 'Lynx', 3),

  (300, 3, 'Comets', 1),
  (301, 3, 'Waves', 2)
on conflict (season_team_id) do update
set season_id = excluded.season_id,
    team_name = excluded.team_name,
    sort_order = excluded.sort_order;


-- Roster (✅ removed player_id=9; ✅ is_active true only for active season 2)
insert into season_roster (season_roster_id, season_id, player_id, season_team_id, tier_id, is_active) values
  -- Season 1 (completed)
  (1000, 1, 1, 100, 1, false),
  (1001, 1, 2, 100, 2, false),
  (1002, 1, 3, 100, 2, false),
  (1003, 1, 4, 101, 1, false),
  (1004, 1, 5, 101, 2, false),
  (1005, 1, 6, null, 2, false),

  -- Season 2 (active)
  (2000, 2, 1, 200, 1, true),
  (2001, 2, 2, 200, 2, true),
  (2002, 2, 3, 200, 2, true),
  (2003, 2, 4, 201, 1, true),
  (2004, 2, 5, 201, 2, true),
  (2005, 2, 7, 202, 3, true),
  (2006, 2, 8, 202, 2, true),
  (2007, 2, 6, null, 2, true),

  -- Season 3 (planned)
  (3000, 3, 1, 300, 1, false),
  (3001, 3, 2, 300, 2, false),
  (3002, 3, 4, 301, 1, false),
  (3003, 3, 5, 301, 2, false),
  (3004, 3, 7, 301, 3, false)
on conflict (season_roster_id) do update
set season_id = excluded.season_id,
    player_id = excluded.player_id,
    season_team_id = excluded.season_team_id,
    tier_id = excluded.tier_id,
    is_active = excluded.is_active;


-- Shot events (✅ season_id now matches the roster's season_id; ✅ realistic timestamps)
insert into shot_events (shot_id, season_id, season_roster_id, base_value, multiplier, shot_index, points, recorded_by, taken_at) values
  -- Season 2 (active) - last ~2 weeks
  (1,  2, 2000, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '2 days'),
  (2,  2, 2000, 2, 2, 2, 8, '11111111-1111-1111-1111-111111111111', now() - interval '1 day'),
  (3,  2, 2003, 1, 1, 1, 1, '11111111-1111-1111-1111-111111111111', now() - interval '20 hours'),
  (4,  2, 2005, 2, 2, 1, 8, '11111111-1111-1111-1111-111111111111', now() - interval '18 hours'),
  (5,  2, 2006, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '12 hours'),

  -- Season 1 (completed) - ~110-100 days ago
  (100, 1, 1000, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '110 days'),
  (101, 1, 1000, 2, 2, 2, 8, '11111111-1111-1111-1111-111111111111', now() - interval '109 days'),
  (102, 1, 1001, 1, 2, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '108 days'),
  (103, 1, 1003, 2, 2, 1, 8, '11111111-1111-1111-1111-111111111111', now() - interval '107 days'),
  (104, 1, 1004, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '106 days'),
  (105, 1, 1005, 1, 2, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '105 days')
on conflict (shot_id) do update
set season_id = excluded.season_id,
    season_roster_id = excluded.season_roster_id,
    base_value = excluded.base_value,
    multiplier = excluded.multiplier,
    shot_index = excluded.shot_index,
    points = excluded.points,
    recorded_by = excluded.recorded_by,
    taken_at = excluded.taken_at;
