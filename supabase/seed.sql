begin;

-- Optional cleanup (uncomment to reset seeded public data)
-- truncate table
--   public.shot_events,
--   public.player_xp_awards,
--   public.season_player_allowance_events,
--   public.season_awards,
--   public.season_results,
--   public.season_player_stats,
--   public.season_player_assignments,
--   public.season_players,
--   public.season_team_stats,
--   public.season_tiers,
--   public.season_teams,
--   public.dice_set_faces,
--   public.dice_sets,
--   public.bottle_types,
--   public.player_career_stats,
--   public.players,
--   public.teams,
--   public.tiers,
--   public.seasons,
--   public.league_memberships,
--   public.leagues,
--   public.profiles
-- cascade;

-- 1) auth + base entities
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@demo.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Casey Owner"}'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin@demo.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Alex Admin"}'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'member1@demo.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Jordan Player"}'),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'member2@demo.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Taylor Shooter"}')
on conflict (id) do nothing;

insert into public.profiles (user_id, display_name, avatar_url)
values
  ('00000000-0000-0000-0000-000000000001', 'Casey Owner', 'https://example.com/avatars/casey.png'),
  ('00000000-0000-0000-0000-000000000002', 'Alex Admin', 'https://example.com/avatars/alex.png'),
  ('00000000-0000-0000-0000-000000000003', 'Jordan Player', 'https://example.com/avatars/jordan.png'),
  ('00000000-0000-0000-0000-000000000004', 'Taylor Shooter', 'https://example.com/avatars/taylor.png')
on conflict (user_id) do update
set display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

insert into public.leagues (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000001', 'Downtown Bottle League', 'downtown-bottle-league'),
  ('10000000-0000-0000-0000-000000000002', 'Riverside Social League', 'riverside-social-league'),
  ('10000000-0000-0000-0000-000000000003', 'Weekend Warriors', 'weekend-warriors')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    updated_at = now();

insert into public.league_memberships (id, league_id, user_id, role, is_active)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner', true),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin', true),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member', true),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'member', true),
  ('11000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner', true),
  ('11000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'owner', true)
on conflict (id) do nothing;

-- 2) structure: teams, tiers, players
insert into public.teams (id, league_id, name, is_active, is_free_agent)
values
  ('12000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Metro Aces', true, false),
  ('12000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Skyline Snipers', true, false),
  ('12000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Free Agents', true, true),
  ('12000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'River Rats', true, false),
  ('12000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Weekend Heat', true, false)
on conflict (id) do update
set name = excluded.name,
    is_active = excluded.is_active,
    is_free_agent = excluded.is_free_agent,
    updated_at = now();

insert into public.tiers (id, league_id, name, sort_order, xp_multiplier, is_active)
values
  ('13000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Pro', 1, 1.50, true),
  ('13000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Challenger', 2, 1.20, true),
  ('13000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Rookie', 3, 1.00, true),
  ('13000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Social', 1, 1.00, true),
  ('13000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Weekend', 1, 1.10, true)
on conflict (id) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    xp_multiplier = excluded.xp_multiplier,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.players (id, league_id, display_name, short_name, linked_user_id, is_active, last_known_team_id, last_known_tier_id)
values
  ('14000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Casey Owner', 'CO', '00000000-0000-0000-0000-000000000001', true, '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001'),
  ('14000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Alex Admin', 'AA', '00000000-0000-0000-0000-000000000002', true, '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002'),
  ('14000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Jordan Player', 'JP', '00000000-0000-0000-0000-000000000003', true, '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002'),
  ('14000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Taylor Shooter', 'TS', '00000000-0000-0000-0000-000000000004', true, '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003'),
  ('14000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Riley River', 'RR', null, true, '12000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000004'),
  ('14000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Wes Weekend', 'WW', null, true, '12000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000005')
on conflict (id) do update
set display_name = excluded.display_name,
    short_name = excluded.short_name,
    linked_user_id = excluded.linked_user_id,
    is_active = excluded.is_active,
    last_known_team_id = excluded.last_known_team_id,
    last_known_tier_id = excluded.last_known_tier_id,
    updated_at = now();

insert into public.player_career_stats (
  id, league_id, player_id, official_score_total, official_shots_taken, official_pps, official_moneyballs_made,
  official_doubles_made, official_high_shot_streak, official_high_point_streak, official_xp_total, seasons_played, level
)
values
  ('15000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 48, 20, 2.4000, 3, 2, 5, 4, 122.50, 2, 3),
  ('15000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', 40, 19, 2.1053, 2, 1, 4, 3, 108.00, 2, 2),
  ('15000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', 55, 22, 2.5000, 4, 2, 6, 5, 131.75, 2, 4),
  ('15000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000004', 31, 18, 1.7222, 1, 1, 3, 2, 89.25, 1, 2),
  ('15000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000005', 17, 11, 1.5455, 0, 0, 2, 2, 41.00, 1, 1),
  ('15000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000006', 22, 12, 1.8333, 1, 0, 3, 2, 52.50, 1, 1)
on conflict (id) do update
set official_score_total = excluded.official_score_total,
    official_shots_taken = excluded.official_shots_taken,
    official_pps = excluded.official_pps,
    official_moneyballs_made = excluded.official_moneyballs_made,
    official_doubles_made = excluded.official_doubles_made,
    official_high_shot_streak = excluded.official_high_shot_streak,
    official_high_point_streak = excluded.official_high_point_streak,
    official_xp_total = excluded.official_xp_total,
    seasons_played = excluded.seasons_played,
    level = excluded.level,
    updated_at = now();

-- 3) seasons and league configuration
insert into public.seasons (
  id, league_id, name, status, format, is_ranked, is_official, started_at, ended_at, season_shot_cap,
  monthly_limit_enabled, monthly_shot_cap, weekly_ceiling_decrease_enabled, weekly_ceiling_decrease_by,
  monthly_ceiling_decrease_enabled, monthly_ceiling_decrease_by, rules_json
)
values
  ('16000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Spring 2026', 'active', 'team', true, true, now() - interval '20 days', null, 60, true, 25, true, 2, false, null, '{"mode":"regular","notes":"active team season"}'),
  ('16000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Winter 2025', 'closed', 'ffa', true, true, now() - interval '200 days', now() - interval '110 days', 50, false, null, false, null, false, null, '{"mode":"playoffs_complete","notes":"closed ffa season"}'),
  ('16000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Summer Social', 'draft', 'team', false, false, null, null, 30, false, null, false, null, false, null, '{"mode":"draft_setup"}')
on conflict (id) do update
set name = excluded.name,
    status = excluded.status,
    format = excluded.format,
    is_ranked = excluded.is_ranked,
    is_official = excluded.is_official,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    season_shot_cap = excluded.season_shot_cap,
    monthly_limit_enabled = excluded.monthly_limit_enabled,
    monthly_shot_cap = excluded.monthly_shot_cap,
    weekly_ceiling_decrease_enabled = excluded.weekly_ceiling_decrease_enabled,
    weekly_ceiling_decrease_by = excluded.weekly_ceiling_decrease_by,
    monthly_ceiling_decrease_enabled = excluded.monthly_ceiling_decrease_enabled,
    monthly_ceiling_decrease_by = excluded.monthly_ceiling_decrease_by,
    rules_json = excluded.rules_json,
    updated_at = now();

insert into public.season_tiers (id, league_id, season_id, tier_id, is_enabled)
values
  ('17000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', true),
  ('17000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', true),
  ('17000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', true),
  ('17000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000004', true)
on conflict (id) do nothing;

insert into public.season_teams (id, league_id, season_id, team_id, is_enabled)
values
  ('17100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', true),
  ('17100000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', true),
  ('17100000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', true),
  ('17100000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', true),
  ('17100000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000004', true)
on conflict (id) do nothing;

insert into public.bottle_types (id, league_id, name, is_active, is_moneyball)
values
  ('18000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Standard Bottle', true, false),
  ('18000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Moneyball Bottle', true, true),
  ('18000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Social Standard', true, false),
  ('18000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Weekend Premium', true, true)
on conflict (id) do update
set name = excluded.name,
    is_active = excluded.is_active,
    is_moneyball = excluded.is_moneyball,
    updated_at = now();

insert into public.dice_sets (id, league_id, season_id, name, effective_from, effective_to)
values
  ('18100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'Spring 2026 Main Dice', now() - interval '20 days', null),
  ('18100000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'Winter 2025 Dice', now() - interval '220 days', now() - interval '110 days'),
  ('18100000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', 'Social Draft Dice', now() - interval '5 days', null)
on conflict (id) do update
set name = excluded.name,
    effective_from = excluded.effective_from,
    effective_to = excluded.effective_to,
    updated_at = now();

insert into public.dice_set_faces (id, dice_set_id, die_value, bottle_type_id)
values
  ('18200000-0000-0000-0000-000000000001', '18100000-0000-0000-0000-000000000001', 1, '18000000-0000-0000-0000-000000000001'),
  ('18200000-0000-0000-0000-000000000002', '18100000-0000-0000-0000-000000000001', 2, '18000000-0000-0000-0000-000000000001'),
  ('18200000-0000-0000-0000-000000000003', '18100000-0000-0000-0000-000000000001', 3, '18000000-0000-0000-0000-000000000001'),
  ('18200000-0000-0000-0000-000000000004', '18100000-0000-0000-0000-000000000001', 4, '18000000-0000-0000-0000-000000000002'),
  ('18200000-0000-0000-0000-000000000005', '18100000-0000-0000-0000-000000000001', 5, '18000000-0000-0000-0000-000000000002'),
  ('18200000-0000-0000-0000-000000000006', '18100000-0000-0000-0000-000000000001', 6, '18000000-0000-0000-0000-000000000002'),
  ('18200000-0000-0000-0000-000000000007', '18100000-0000-0000-0000-000000000002', 1, '18000000-0000-0000-0000-000000000001'),
  ('18200000-0000-0000-0000-000000000008', '18100000-0000-0000-0000-000000000002', 2, '18000000-0000-0000-0000-000000000001'),
  ('18200000-0000-0000-0000-000000000009', '18100000-0000-0000-0000-000000000002', 3, '18000000-0000-0000-0000-000000000001'),
  ('18200000-0000-0000-0000-000000000010', '18100000-0000-0000-0000-000000000002', 4, '18000000-0000-0000-0000-000000000002'),
  ('18200000-0000-0000-0000-000000000011', '18100000-0000-0000-0000-000000000002', 5, '18000000-0000-0000-0000-000000000002'),
  ('18200000-0000-0000-0000-000000000012', '18100000-0000-0000-0000-000000000002', 6, '18000000-0000-0000-0000-000000000002'),
  ('18200000-0000-0000-0000-000000000013', '18100000-0000-0000-0000-000000000003', 1, '18000000-0000-0000-0000-000000000003'),
  ('18200000-0000-0000-0000-000000000014', '18100000-0000-0000-0000-000000000003', 2, '18000000-0000-0000-0000-000000000003'),
  ('18200000-0000-0000-0000-000000000015', '18100000-0000-0000-0000-000000000003', 3, '18000000-0000-0000-0000-000000000003'),
  ('18200000-0000-0000-0000-000000000016', '18100000-0000-0000-0000-000000000003', 4, '18000000-0000-0000-0000-000000000003'),
  ('18200000-0000-0000-0000-000000000017', '18100000-0000-0000-0000-000000000003', 5, '18000000-0000-0000-0000-000000000003'),
  ('18200000-0000-0000-0000-000000000018', '18100000-0000-0000-0000-000000000003', 6, '18000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- 4) season participants and assignments
insert into public.season_players (
  id, league_id, season_id, player_id, team_id, tier_id, is_enabled, shots_cap_initial, shots_remaining, stats_reset_at
)
values
  ('19000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', true, 60, 41, null),
  ('19000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', true, 60, 43, null),
  ('19000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', true, 60, 39, null),
  ('19000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', true, 60, 38, null),
  ('19000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000003', null, '13000000-0000-0000-0000-000000000003', true, 50, 0, now() - interval '110 days'),
  ('19000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000004', true, 30, 30, null)
on conflict (id) do update
set team_id = excluded.team_id,
    tier_id = excluded.tier_id,
    shots_cap_initial = excluded.shots_cap_initial,
    shots_remaining = excluded.shots_remaining,
    stats_reset_at = excluded.stats_reset_at,
    updated_at = now();

insert into public.season_player_assignments (id, league_id, season_player_id, team_id, tier_id, effective_from, effective_to, reset_stats)
values
  ('19100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', now() - interval '20 days', null, false),
  ('19100000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', now() - interval '20 days', null, false),
  ('19100000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', now() - interval '20 days', null, false),
  ('19100000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000003', now() - interval '20 days', now() - interval '10 days', true),
  ('19100000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', now() - interval '10 days', null, false),
  ('19100000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000004', now() - interval '5 days', null, false)
on conflict (id) do nothing;

insert into public.season_player_stats (
  id, league_id, season_id, season_player_id, score_total, shots_taken, pps, moneyballs_made, doubles_made,
  current_shot_streak, current_point_streak, high_shot_streak, high_point_streak, xp_from_shots, xp_bonus, xp_total, level
)
values
  ('19200000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 19, 8, 2.3750, 1, 1, 2, 2, 4, 3, 22.00, 5.00, 27.00, 2),
  ('19200000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000002', 15, 7, 2.1429, 1, 0, 1, 1, 3, 2, 18.50, 3.00, 21.50, 2),
  ('19200000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', 22, 9, 2.4444, 2, 1, 3, 3, 5, 4, 24.00, 4.00, 28.00, 3),
  ('19200000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000004', 11, 6, 1.8333, 0, 1, 1, 1, 2, 2, 14.00, 2.00, 16.00, 1),
  ('19200000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000005', 39, 20, 1.9500, 1, 2, 0, 0, 4, 4, 36.00, 8.00, 44.00, 3),
  ('19200000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', '19000000-0000-0000-0000-000000000006', 0, 0, 0.0000, 0, 0, 0, 0, 0, 0, 0.00, 0.00, 0.00, 0)
on conflict (id) do update
set score_total = excluded.score_total,
    shots_taken = excluded.shots_taken,
    pps = excluded.pps,
    moneyballs_made = excluded.moneyballs_made,
    doubles_made = excluded.doubles_made,
    current_shot_streak = excluded.current_shot_streak,
    current_point_streak = excluded.current_point_streak,
    high_shot_streak = excluded.high_shot_streak,
    high_point_streak = excluded.high_point_streak,
    xp_from_shots = excluded.xp_from_shots,
    xp_bonus = excluded.xp_bonus,
    xp_total = excluded.xp_total,
    level = excluded.level,
    updated_at = now();

insert into public.season_team_stats (id, league_id, season_id, team_id, score_total, shots_taken, pps, team_xp_from_shots, placement, team_mvp_season_player_id)
values
  ('19300000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 34, 15, 2.2667, 40.50, 1, '19000000-0000-0000-0000-000000000001'),
  ('19300000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', 33, 15, 2.2000, 38.00, 2, '19000000-0000-0000-0000-000000000003'),
  ('19300000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000004', 0, 0, 0.0000, 0.00, null, null)
on conflict (id) do update
set score_total = excluded.score_total,
    shots_taken = excluded.shots_taken,
    pps = excluded.pps,
    team_xp_from_shots = excluded.team_xp_from_shots,
    placement = excluded.placement,
    team_mvp_season_player_id = excluded.team_mvp_season_player_id,
    updated_at = now();

-- 5) gameplay events and outcomes
insert into public.shot_events (
  id, league_id, season_id, season_player_id, shot_number, occurred_at, is_waiver, rolled_dice, selected_die, dice_set_id,
  bottle_type_id, team_id, tier_id, base_points, is_double, is_moneyball, points_awarded, xp_awarded, shot_streak, point_streak,
  is_voided, voided_at, voided_by, void_reason
)
values
  ('19400000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 1, now() - interval '9 days', false, '{2,5}', 5, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 8, false, true, 8, 4.00, 1, 1, false, null, null, null),
  ('19400000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 2, now() - interval '8 days', false, '{3,3}', 3, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 4, true, false, 8, 5.00, 2, 2, false, null, null, null),
  ('19400000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000002', 1, now() - interval '7 days', false, '{1,6}', 1, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', 1, false, false, 1, 1.00, 1, 1, false, null, null, null),
  ('19400000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000002', 2, now() - interval '6 days', true, '{2,4}', 2, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', 2, false, false, 2, 1.50, 2, 2, false, null, null, null),
  ('19400000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', 1, now() - interval '5 days', false, '{4,5}', 4, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 8, false, true, 8, 4.00, 1, 1, false, null, null, null),
  ('19400000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', 2, now() - interval '4 days', false, '{2,2}', 2, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 2, true, false, 4, 2.50, 2, 2, false, null, null, null),
  ('19400000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000004', 1, now() - interval '3 days', false, '{1,3}', 1, '18100000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', 1, false, false, 1, 1.00, 1, 1, true, now() - interval '2 days', '00000000-0000-0000-0000-000000000002', 'score correction'),
  ('19400000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000005', 1, now() - interval '150 days', false, '{5,6}', 6, '18100000-0000-0000-0000-000000000002', '18000000-0000-0000-0000-000000000002', null, '13000000-0000-0000-0000-000000000003', 8, false, true, 8, 4.50, 1, 1, false, null, null, null)
on conflict (id) do nothing;

insert into public.season_player_allowance_events (id, league_id, season_player_id, delta_shots, reason, effective_at, created_by)
values
  ('19500000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', -1, 'shot_taken', now() - interval '9 days', '00000000-0000-0000-0000-000000000001'),
  ('19500000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 5, 'admin_adjustment', now() - interval '8 days', '00000000-0000-0000-0000-000000000002'),
  ('19500000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000002', -1, 'shot_taken', now() - interval '7 days', '00000000-0000-0000-0000-000000000002'),
  ('19500000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', -1, 'shot_taken', now() - interval '5 days', '00000000-0000-0000-0000-000000000003'),
  ('19500000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000004', -2, 'weekly_ceiling_decrease', now() - interval '4 days', '00000000-0000-0000-0000-000000000001'),
  ('19500000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000006', 30, 'monthly_limit', now() - interval '1 day', '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

insert into public.season_awards (id, league_id, season_id, award_key, winner_season_player_id, winner_team_id, metric_value, context_json)
values
  ('19600000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'league_mvp', '19000000-0000-0000-0000-000000000005', null, 39.0000, '{"note":"best overall scorer"}'),
  ('19600000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'most_doubles', '19000000-0000-0000-0000-000000000005', null, 2.0000, '{"doubles":2}'),
  ('19600000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'best_crush', null, '12000000-0000-0000-0000-000000000001', 34.0000, '{"team_pps":2.2667}')
on conflict (id) do update
set winner_season_player_id = excluded.winner_season_player_id,
    winner_team_id = excluded.winner_team_id,
    metric_value = excluded.metric_value,
    context_json = excluded.context_json,
    updated_at = now();

insert into public.player_xp_awards (id, league_id, season_id, season_player_id, award_type, placement, xp_awarded, created_by)
values
  ('19700000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000005', 'ffa_place_bonus', 1, 12.00, '00000000-0000-0000-0000-000000000002'),
  ('19700000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', '19000000-0000-0000-0000-000000000005', 'mvp_bonus', 2, 8.00, '00000000-0000-0000-0000-000000000001'),
  ('19700000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000001', 'team_win_bonus', 1, 6.00, '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.season_results (
  id, league_id, season_id, result_type, placement, team_id, season_player_id, score_total, shots_taken, pps
)
values
  ('19800000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'team', 1, '12000000-0000-0000-0000-000000000001', null, 34, 15, 2.2667),
  ('19800000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'team', 2, '12000000-0000-0000-0000-000000000002', null, 33, 15, 2.2000),
  ('19800000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'player', 1, null, '19000000-0000-0000-0000-000000000005', 39, 20, 1.9500),
  ('19800000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000002', 'player', 2, null, '19000000-0000-0000-0000-000000000003', 35, 20, 1.7500),
  ('19800000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'player', 3, null, '19000000-0000-0000-0000-000000000002', 15, 7, 2.1429),
  ('19800000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', 'team', 1, '12000000-0000-0000-0000-000000000004', null, 0, 0, 0.0000)
on conflict (id) do nothing;

-- 6) sanity checks
select 'profiles' as table_name, count(*) as row_count from public.profiles;
select 'leagues' as table_name, count(*) as row_count from public.leagues;
select 'league_memberships' as table_name, count(*) as row_count from public.league_memberships;
select 'teams' as table_name, count(*) as row_count from public.teams;
select 'tiers' as table_name, count(*) as row_count from public.tiers;
select 'players' as table_name, count(*) as row_count from public.players;
select 'player_career_stats' as table_name, count(*) as row_count from public.player_career_stats;
select 'seasons' as table_name, count(*) as row_count from public.seasons;
select 'season_teams' as table_name, count(*) as row_count from public.season_teams;
select 'season_tiers' as table_name, count(*) as row_count from public.season_tiers;
select 'season_players' as table_name, count(*) as row_count from public.season_players;
select 'season_player_assignments' as table_name, count(*) as row_count from public.season_player_assignments;
select 'season_player_stats' as table_name, count(*) as row_count from public.season_player_stats;
select 'bottle_types' as table_name, count(*) as row_count from public.bottle_types;
select 'dice_sets' as table_name, count(*) as row_count from public.dice_sets;
select 'dice_set_faces' as table_name, count(*) as row_count from public.dice_set_faces;
select 'shot_events' as table_name, count(*) as row_count from public.shot_events;
select 'season_player_allowance_events' as table_name, count(*) as row_count from public.season_player_allowance_events;
select 'season_team_stats' as table_name, count(*) as row_count from public.season_team_stats;
select 'season_results' as table_name, count(*) as row_count from public.season_results;
select 'season_awards' as table_name, count(*) as row_count from public.season_awards;
select 'player_xp_awards' as table_name, count(*) as row_count from public.player_xp_awards;

commit;
