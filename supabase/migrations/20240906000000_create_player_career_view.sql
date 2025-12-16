create or replace view public.v_player_career_stats as
with player_season_summary as (
  select
    sr.player_id,
    sr.season_id,
    s.status,
    sr.season_team_id,
    sr.tier_id,
    coalesce(sum(se.points) filter (where se.is_voided = false), 0) as season_points,
    coalesce(count(se.*) filter (where se.is_voided = false), 0) as season_shots,
    max(se.taken_at) filter (where se.is_voided = false) as last_shot_at
  from season_roster sr
  join seasons s on s.season_id = sr.season_id
  left join shot_events se on se.season_roster_id = sr.season_roster_id
  group by sr.player_id, sr.season_id, s.status, sr.season_team_id, sr.tier_id
),
status_filters as (
  select 'completed'::text as scope, array['completed']::text[] as statuses
  union all
  select 'active_completed', array['active','completed']
  union all
  select 'non_cancelled', array['planned','active','completed']
),
aggregated_by_scope as (
  select
    pss.player_id,
    sf.scope,
    sum(pss.season_points) as total_points,
    sum(pss.season_shots) as total_shots,
    count(distinct pss.season_id) as seasons_played,
    max(pss.last_shot_at) as scoped_last_shot_at
  from player_season_summary pss
  join status_filters sf on pss.status = any(sf.statuses)
  group by pss.player_id, sf.scope
),
team_totals as (
  select
    pss.season_id,
    pss.status,
    coalesce(pss.season_team_id, -1) as season_team_key,
    sum(pss.season_points) as team_points
  from player_season_summary pss
  group by pss.season_id, pss.status, coalesce(pss.season_team_id, -1)
),
season_winners as (
  select
    tt.season_id,
    tt.status,
    tt.season_team_key,
    tt.team_points,
    tt.team_points = max(tt.team_points) over (partition by tt.season_id) as is_winner
  from team_totals tt
),
team_wins_by_scope as (
  select
    pss.player_id,
    sf.scope,
    count(distinct pss.season_id) filter (where sw.is_winner) as team_wins
  from player_season_summary pss
  join status_filters sf on pss.status = any(sf.statuses)
  left join season_winners sw on sw.season_id = pss.season_id and sw.status = pss.status and sw.season_team_key = coalesce(pss.season_team_id, -1)
  group by pss.player_id, sf.scope
),
season_mvps as (
  select
    pss.player_id,
    pss.season_id,
    pss.status,
    pss.season_points = max(pss.season_points) over (partition by pss.season_id) as is_mvp
  from player_season_summary pss
),
mvps_by_scope as (
  select
    pss.player_id,
    sf.scope,
    count(distinct pss.season_id) filter (where sm.is_mvp) as mvp_count
  from player_season_summary pss
  join status_filters sf on pss.status = any(sf.statuses)
  left join season_mvps sm on sm.season_id = pss.season_id and sm.player_id = pss.player_id
  group by pss.player_id, sf.scope
),
tier_breakdown_by_scope as (
  select
    pss.player_id,
    sf.scope,
    jsonb_agg(
      jsonb_build_object(
        'tier_id', t.tier_id,
        'tier_name', t.tier_name,
        'color', t.color,
        'seasons', count(distinct pss.season_id),
        'shots', coalesce(sum(pss.season_shots), 0),
        'points', coalesce(sum(pss.season_points), 0),
        'pps', case when coalesce(sum(pss.season_shots), 0) > 0 then round(sum(pss.season_points)::numeric / sum(pss.season_shots), 3) else 0 end
      )
      order by t.tier_name
    ) as tier_breakdown
  from player_season_summary pss
  join status_filters sf on pss.status = any(sf.statuses)
  join tiers t on t.tier_id = pss.tier_id
  group by pss.player_id, sf.scope
),
last_shots as (
  select player_id, max(last_shot_at) as last_shot_at
  from player_season_summary
  group by player_id
)
select
  p.player_id,
  p.name,
  p.is_hidden,
  coalesce(ab_completed.total_points, 0) as total_points_completed,
  coalesce(ab_completed.total_shots, 0) as total_shots_completed,
  case when coalesce(ab_completed.total_shots, 0) > 0 then round(ab_completed.total_points::numeric / ab_completed.total_shots, 3) else 0 end as points_per_shot_completed,
  coalesce(ab_completed.seasons_played, 0) as seasons_played_completed,
  coalesce(ab_active.total_points, 0) as total_points_active_completed,
  coalesce(ab_active.total_shots, 0) as total_shots_active_completed,
  case when coalesce(ab_active.total_shots, 0) > 0 then round(ab_active.total_points::numeric / ab_active.total_shots, 3) else 0 end as points_per_shot_active_completed,
  coalesce(ab_active.seasons_played, 0) as seasons_played_active_completed,
  coalesce(ab_non_cancelled.total_points, 0) as total_points_non_cancelled,
  coalesce(ab_non_cancelled.total_shots, 0) as total_shots_non_cancelled,
  case when coalesce(ab_non_cancelled.total_shots, 0) > 0 then round(ab_non_cancelled.total_points::numeric / ab_non_cancelled.total_shots, 3) else 0 end as points_per_shot_non_cancelled,
  coalesce(ab_non_cancelled.seasons_played, 0) as seasons_played_non_cancelled,
  coalesce(tw_completed.team_wins, 0) as team_wins_completed,
  coalesce(tw_active.team_wins, 0) as team_wins_active_completed,
  coalesce(tw_non_cancelled.team_wins, 0) as team_wins_non_cancelled,
  coalesce(mv_completed.mvp_count, 0) as mvps_completed,
  coalesce(mv_active.mvp_count, 0) as mvps_active_completed,
  coalesce(mv_non_cancelled.mvp_count, 0) as mvps_non_cancelled,
  coalesce(tb_completed.tier_breakdown, '[]'::jsonb) as tier_breakdown_completed,
  coalesce(tb_active.tier_breakdown, '[]'::jsonb) as tier_breakdown_active_completed,
  coalesce(tb_non_cancelled.tier_breakdown, '[]'::jsonb) as tier_breakdown_non_cancelled,
  ls.last_shot_at
from players p
left join aggregated_by_scope ab_completed on ab_completed.player_id = p.player_id and ab_completed.scope = 'completed'
left join aggregated_by_scope ab_active on ab_active.player_id = p.player_id and ab_active.scope = 'active_completed'
left join aggregated_by_scope ab_non_cancelled on ab_non_cancelled.player_id = p.player_id and ab_non_cancelled.scope = 'non_cancelled'
left join team_wins_by_scope tw_completed on tw_completed.player_id = p.player_id and tw_completed.scope = 'completed'
left join team_wins_by_scope tw_active on tw_active.player_id = p.player_id and tw_active.scope = 'active_completed'
left join team_wins_by_scope tw_non_cancelled on tw_non_cancelled.player_id = p.player_id and tw_non_cancelled.scope = 'non_cancelled'
left join mvps_by_scope mv_completed on mv_completed.player_id = p.player_id and mv_completed.scope = 'completed'
left join mvps_by_scope mv_active on mv_active.player_id = p.player_id and mv_active.scope = 'active_completed'
left join mvps_by_scope mv_non_cancelled on mv_non_cancelled.player_id = p.player_id and mv_non_cancelled.scope = 'non_cancelled'
left join tier_breakdown_by_scope tb_completed on tb_completed.player_id = p.player_id and tb_completed.scope = 'completed'
left join tier_breakdown_by_scope tb_active on tb_active.player_id = p.player_id and tb_active.scope = 'active_completed'
left join tier_breakdown_by_scope tb_non_cancelled on tb_non_cancelled.player_id = p.player_id and tb_non_cancelled.scope = 'non_cancelled'
left join last_shots ls on ls.player_id = p.player_id;

grant select on public.v_player_career_stats to public;
