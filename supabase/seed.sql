
insert into profiles (id, display_name, role)
values ('11111111-1111-1111-1111-111111111111', 'Demo Admin', 'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;

insert into tiers (tier_id, tier_name, color) values
  (1, 'Pro', '#10b981'),
  (2, 'Rookie', '#38bdf8')
on conflict (tier_id) do update set tier_name = excluded.tier_name, color = excluded.color;

insert into players (player_id, name, is_hidden) values
  (1, 'Alex Rivers', false),
  (2, 'Brooke Carter', false),
  (3, 'Casey Jordan', false),
  (4, 'Dev Patel', false),
  (5, 'Emi Tanaka', false),
  (6, 'Frankie Lopez', false),
  (7, 'Harper Gray', true),
  (8, 'Imani Fields', false),
  (9, 'Jordan Miles', false)
on conflict (player_id) do update set name = excluded.name, is_hidden = excluded.is_hidden;

insert into seasons (season_id, season_name, status, start_at, end_at, created_by) values
  (1, 'Demo Season', 'active', now() - interval '7 days', null, '11111111-1111-1111-1111-111111111111'),
  (2, 'Spring 2024 League', 'completed', now() - interval '120 days', now() - interval '90 days', '11111111-1111-1111-1111-111111111111'),
  (3, 'Fall 2023 League', 'completed', now() - interval '260 days', now() - interval '230 days', '11111111-1111-1111-1111-111111111111')
on conflict (season_id) do update
set season_name = excluded.season_name,
    status = excluded.status,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    created_by = excluded.created_by;

insert into season_teams (season_team_id, season_id, team_name, sort_order) values
  (100, 1, 'Lightning', 1),
  (101, 1, 'Thunder', 2),
  (200, 2, 'Hawks', 1),
  (201, 2, 'Owls', 2),
  (202, 2, 'Lynx', 3),
  (300, 3, 'Comets', 1),
  (301, 3, 'Waves', 2)
on conflict (season_team_id) do update
set team_name = excluded.team_name,
    sort_order = excluded.sort_order,
    season_id = excluded.season_id;

insert into season_roster (season_roster_id, season_id, player_id, season_team_id, tier_id, is_active) values
  (1000, 1, 1, 100, 1, true),
  (1001, 1, 2, 100, 2, true),
  (1002, 1, 3, 100, 2, true),
  (1003, 1, 4, 101, 1, true),
  (1004, 1, 5, 101, 2, true),
  (1005, 1, 6, null, 2, true),
  (2000, 2, 1, 200, 1, false),
  (2001, 2, 2, 200, 2, false),
  (2002, 2, 3, 200, 2, false),
  (2003, 2, 4, 201, 1, false),
  (2004, 2, 5, 201, 2, false),
  (2005, 2, 7, 202, 1, false),
  (2006, 2, 8, 202, 2, false),
  (2007, 2, 9, null, 2, false),
  (3000, 3, 1, 300, 1, false),
  (3001, 3, 2, 300, 2, false),
  (3002, 3, 4, 301, 1, false),
  (3003, 3, 5, 301, 2, false)
on conflict (season_roster_id) do update
set season_id = excluded.season_id,
    player_id = excluded.player_id,
    season_team_id = excluded.season_team_id,
    tier_id = excluded.tier_id,
    is_active = excluded.is_active;

insert into shot_events (shot_id, season_id, season_roster_id, base_value, multiplier, shot_index, points, recorded_by, taken_at) values
  -- Demo Season (active)
  (1, 1, 1000, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '1 days'),
  (2, 1, 1003, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '12 hours'),
  -- Spring 2024 League (completed)
  (100, 2, 2000, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '100 days'),
  (101, 2, 2000, 2, 2, 2, 8, '11111111-1111-1111-1111-111111111111', now() - interval '99 days'),
  (102, 2, 2001, 1, 2, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '98 days'),
  (103, 2, 2001, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '97 days'),
  (104, 2, 2002, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '96 days'),
  (105, 2, 2002, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '95 days'),
  (106, 2, 2003, 2, 2, 1, 8, '11111111-1111-1111-1111-111111111111', now() - interval '95 days'),
  (107, 2, 2003, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '94 days'),
  (108, 2, 2003, 1, 2, 3, 2, '11111111-1111-1111-1111-111111111111', now() - interval '93 days'),
  (109, 2, 2004, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '92 days'),
  (110, 2, 2004, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '91 days'),
  (111, 2, 2004, 2, 2, 3, 8, '11111111-1111-1111-1111-111111111111', now() - interval '90 days'),
  (112, 2, 2005, 2, 2, 1, 8, '11111111-1111-1111-1111-111111111111', now() - interval '97 days'),
  (113, 2, 2005, 1, 2, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '96 days'),
  (114, 2, 2006, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '95 days'),
  (115, 2, 2006, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '94 days'),
  (116, 2, 2006, 2, 2, 3, 8, '11111111-1111-1111-1111-111111111111', now() - interval '93 days'),
  (117, 2, 2007, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '92 days'),
  (118, 2, 2007, 1, 2, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '91 days'),
  (119, 2, 2007, 2, 2, 3, 8, '11111111-1111-1111-1111-111111111111', now() - interval '90 days'),
  -- Fall 2023 League (completed)
  (200, 3, 3000, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '240 days'),
  (201, 3, 3000, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '239 days'),
  (202, 3, 3000, 2, 2, 3, 8, '11111111-1111-1111-1111-111111111111', now() - interval '238 days'),
  (203, 3, 3001, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '237 days'),
  (204, 3, 3001, 2, 1, 2, 2, '11111111-1111-1111-1111-111111111111', now() - interval '236 days'),
  (205, 3, 3002, 1, 2, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '235 days'),
  (206, 3, 3002, 2, 2, 2, 8, '11111111-1111-1111-1111-111111111111', now() - interval '234 days'),
  (207, 3, 3002, 2, 1, 3, 2, '11111111-1111-1111-1111-111111111111', now() - interval '233 days'),
  (208, 3, 3003, 2, 1, 1, 2, '11111111-1111-1111-1111-111111111111', now() - interval '232 days'),
  (209, 3, 3003, 2, 2, 2, 8, '11111111-1111-1111-1111-111111111111', now() - interval '231 days')
on conflict (shot_id) do update
set season_id = excluded.season_id,
    season_roster_id = excluded.season_roster_id,
    base_value = excluded.base_value,
    multiplier = excluded.multiplier,
    shot_index = excluded.shot_index,
    points = excluded.points,
    recorded_by = excluded.recorded_by,
    taken_at = excluded.taken_at;
