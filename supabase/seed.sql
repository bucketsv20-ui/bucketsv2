-- Seed data for Buckets demo

insert into profiles (id, display_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Demo Admin', 'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;

insert into tiers (tier_name, color) values
  ('Pro', '#10b981'),
  ('Rookie', '#38bdf8')
on conflict (tier_name) do nothing;

insert into players (name, is_hidden) values
  ('Alex Rivers', false),
  ('Brooke Carter', false),
  ('Casey Jordan', false),
  ('Dev Patel', false),
  ('Emi Tanaka', false),
  ('Frankie Lopez', false)
on conflict do nothing;

with active as (
  insert into seasons (season_name, status, start_at, created_by)
  values ('Demo Season', 'active', now(), '11111111-1111-1111-1111-111111111111')
  returning season_id
),
teams as (
  insert into season_teams (season_id, team_name, sort_order)
  select season_id, team_name, sort_order
  from active
  cross join (values ('Lightning', 1), ('Thunder', 2)) as t(team_name, sort_order)
  returning season_team_id, team_name, season_id
),
roster as (
  insert into season_roster (season_id, player_id, season_team_id, tier_id)
  select
    (select season_id from active),
    p.player_id,
    case
      when p.name in ('Alex Rivers', 'Brooke Carter', 'Casey Jordan') then (select season_team_id from teams where team_name = 'Lightning')
      when p.name in ('Dev Patel', 'Emi Tanaka') then (select season_team_id from teams where team_name = 'Thunder')
      else null
    end,
    case
      when p.name in ('Alex Rivers', 'Dev Patel') then (select tier_id from tiers where tier_name = 'Pro')
      else (select tier_id from tiers where tier_name = 'Rookie')
    end
  from players p
  order by p.player_id
  limit 6
  returning season_roster_id, player_id
)
insert into shot_events (season_id, season_roster_id, base_value, multiplier, shot_index, points, recorded_by)
select
  (select season_id from active),
  r.season_roster_id,
  2,
  1,
  1,
  2,
  '11111111-1111-1111-1111-111111111111'
from roster r
where r.player_id in (select player_id from players order by player_id limit 2);
