create or replace function public.record_shot(
  p_season_player_id uuid,
  p_selected_die smallint,
  p_rolled_dice smallint[] default null,
  p_is_double boolean default false,
  p_is_waiver boolean default false,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season_player public.season_players%rowtype;
  v_season public.seasons%rowtype;
  v_assignment record;
  v_team_id uuid;
  v_tier_id uuid;
  v_dice_set_id uuid;
  v_bottle_type_id uuid;
  v_base_score smallint;
  v_shot_number integer;
  v_is_moneyball boolean;
  v_base_points smallint;
  v_points_awarded smallint;
  v_tier_multiplier numeric(6,2);
  v_xp_awarded numeric(12,2);
  v_last_shot record;
  v_shot_streak integer;
  v_point_streak integer;
  v_shot_id uuid;
  v_shots_remaining integer;
  v_player_stats public.season_player_stats%rowtype;
  v_team_stats public.season_team_stats%rowtype;
  v_current_shot_streak integer;
  v_current_point_streak integer;
  v_new_pps numeric(12,4);
  v_team_pps numeric(12,4);
  v_rolls smallint[];
begin
  if p_selected_die < 1 or p_selected_die > 6 then
    raise exception 'Selected die must be between 1 and 6.';
  end if;

  if p_rolled_dice is not null then
    if array_length(p_rolled_dice, 1) <> 2 then
      raise exception 'Rolled dice must contain exactly two values.';
    end if;

    if exists (
      select 1
      from unnest(p_rolled_dice) as die_value
      where die_value < 1 or die_value > 6
    ) then
      raise exception 'Each rolled die must be between 1 and 6.';
    end if;

    if not (p_selected_die = any (p_rolled_dice)) then
      raise exception 'Selected die must match one of the rolled dice.';
    end if;

    v_rolls := p_rolled_dice;
  else
    v_rolls := array[p_selected_die]::smallint[];
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_season_player_id::text, 0));

  select sp.*, s.*
  into v_season_player, v_season
  from public.season_players sp
  join public.seasons s on s.id = sp.season_id
  where sp.id = p_season_player_id
  for update;

  if not found then
    raise exception 'Season player not found.';
  end if;

  if not public.is_league_member(v_season_player.league_id) then
    raise exception 'You are not a member of this league.';
  end if;

  if v_season.status <> 'active' then
    raise exception 'Shots can only be recorded in an active season.';
  end if;

  if v_season_player.shots_remaining <= 0 then
    raise exception 'No shots remaining.';
  end if;

  select spa.team_id, spa.tier_id
  into v_assignment
  from public.season_player_assignments spa
  where spa.season_player_id = p_season_player_id
    and spa.effective_from <= p_occurred_at
    and (spa.effective_to is null or spa.effective_to > p_occurred_at)
  order by spa.effective_from desc
  limit 1;

  v_team_id := coalesce(v_assignment.team_id, v_season_player.team_id);
  v_tier_id := coalesce(v_assignment.tier_id, v_season_player.tier_id);

  select ds.id
  into v_dice_set_id
  from public.dice_sets ds
  where ds.league_id = v_season_player.league_id
    and (ds.season_id = v_season_player.season_id or ds.season_id is null)
    and ds.effective_from <= p_occurred_at
    and (ds.effective_to is null or ds.effective_to > p_occurred_at)
  order by case when ds.season_id = v_season_player.season_id then 0 else 1 end,
           ds.effective_from desc
  limit 1;

  if v_dice_set_id is null then
    raise exception 'No active dice set configured.';
  end if;

  select dsf.bottle_type_id, bt.base_score
  into v_bottle_type_id, v_base_score
  from public.dice_set_faces dsf
  join public.bottle_types bt on bt.id = dsf.bottle_type_id
  where dsf.dice_set_id = v_dice_set_id
    and dsf.die_value = p_selected_die
  limit 1;

  if v_bottle_type_id is null or v_base_score is null then
    raise exception 'No bottle mapping found for die value %.', p_selected_die;
  end if;

  select coalesce(max(se.shot_number), 0) + 1
  into v_shot_number
  from public.shot_events se
  where se.season_player_id = p_season_player_id;

  v_is_moneyball := (v_shot_number % 10 = 0);
  v_base_points := (v_base_score * case when v_is_moneyball then 2 else 1 end)::smallint;
  v_points_awarded := (v_base_points * case when p_is_double then 2 else 1 end)::smallint;

  if p_is_waiver and v_base_points = 1 then
    raise exception 'Waiver shots cannot have base score of 1.';
  end if;

  if v_season.is_official then
    select t.xp_multiplier into v_tier_multiplier from public.tiers t where t.id = v_tier_id;
    v_xp_awarded := coalesce(v_tier_multiplier, 1) * v_points_awarded;
  else
    v_xp_awarded := 0;
  end if;

  select se.shot_streak, se.point_streak
  into v_last_shot
  from public.shot_events se
  where se.season_player_id = p_season_player_id
    and se.is_voided = false
  order by se.shot_number desc
  limit 1;

  if (not p_is_waiver) and v_base_points > 1 then
    v_shot_streak := coalesce(v_last_shot.shot_streak, 0) + 1;
    v_point_streak := coalesce(v_last_shot.point_streak, 0) + 1;
  else
    v_shot_streak := null;
    v_point_streak := null;
  end if;

  insert into public.shot_events (
    league_id,
    season_id,
    season_player_id,
    shot_number,
    occurred_at,
    is_waiver,
    rolled_dice,
    selected_die,
    dice_set_id,
    bottle_type_id,
    team_id,
    tier_id,
    base_points,
    is_double,
    is_moneyball,
    points_awarded,
    xp_awarded,
    shot_streak,
    point_streak
  ) values (
    v_season_player.league_id,
    v_season_player.season_id,
    p_season_player_id,
    v_shot_number,
    p_occurred_at,
    p_is_waiver,
    v_rolls,
    p_selected_die,
    v_dice_set_id,
    v_bottle_type_id,
    v_team_id,
    v_tier_id,
    v_base_points,
    p_is_double,
    v_is_moneyball,
    v_points_awarded,
    v_xp_awarded,
    v_shot_streak,
    v_point_streak
  ) returning id into v_shot_id;

  update public.season_players sp
  set shots_remaining = sp.shots_remaining - 1
  where sp.id = p_season_player_id
    and sp.shots_remaining > 0
  returning sp.shots_remaining into v_shots_remaining;

  if not found then
    raise exception 'No shots remaining.';
  end if;

  insert into public.season_player_allowance_events (
    league_id,
    season_player_id,
    delta_shots,
    reason,
    effective_at,
    created_by
  ) values (
    v_season_player.league_id,
    p_season_player_id,
    -1,
    'shot_taken',
    p_occurred_at,
    auth.uid()
  );

  insert into public.season_player_stats (league_id, season_id, season_player_id)
  values (v_season_player.league_id, v_season_player.season_id, p_season_player_id)
  on conflict (season_player_id) do nothing;

  select * into v_player_stats
  from public.season_player_stats sps
  where sps.season_player_id = p_season_player_id
  for update;

  select coalesce(max(se.shot_streak), 0), coalesce(max(se.point_streak), 0)
  into v_current_shot_streak, v_current_point_streak
  from public.shot_events se
  where se.season_player_id = p_season_player_id
    and se.is_voided = false;

  v_new_pps := case
    when (coalesce(v_player_stats.shots_taken, 0) + 1) = 0 then 0
    else round((coalesce(v_player_stats.score_total, 0)::numeric + v_points_awarded) / (coalesce(v_player_stats.shots_taken, 0) + 1), 4)
  end;

  update public.season_player_stats sps
  set score_total = coalesce(sps.score_total, 0) + v_points_awarded,
      shots_taken = coalesce(sps.shots_taken, 0) + 1,
      pps = v_new_pps,
      moneyballs_made = coalesce(sps.moneyballs_made, 0) + case when v_is_moneyball then 1 else 0 end,
      doubles_made = coalesce(sps.doubles_made, 0) + case when p_is_double then 1 else 0 end,
      current_shot_streak = case when v_shot_streak is null then 0 else v_shot_streak end,
      high_shot_streak = greatest(coalesce(sps.high_shot_streak, 0), coalesce(v_shot_streak, 0), v_current_shot_streak),
      current_point_streak = case when v_point_streak is null then 0 else v_point_streak end,
      high_point_streak = greatest(coalesce(sps.high_point_streak, 0), coalesce(v_point_streak, 0), v_current_point_streak),
      xp_from_shots = coalesce(sps.xp_from_shots, 0) + v_xp_awarded,
      xp_total = coalesce(sps.xp_total, 0) + v_xp_awarded,
      level = floor(greatest(0, coalesce(sps.xp_total, 0) + v_xp_awarded) / 1000)::integer + 1
  where sps.season_player_id = p_season_player_id
  returning * into v_player_stats;

  if v_team_id is not null then
    insert into public.season_team_stats (league_id, season_id, team_id)
    values (v_season_player.league_id, v_season_player.season_id, v_team_id)
    on conflict (season_id, team_id) do nothing;

    select * into v_team_stats
    from public.season_team_stats sts
    where sts.season_id = v_season_player.season_id
      and sts.team_id = v_team_id
    for update;

    v_team_pps := case
      when (coalesce(v_team_stats.shots_taken, 0) + 1) = 0 then 0
      else round((coalesce(v_team_stats.score_total, 0)::numeric + v_points_awarded) / (coalesce(v_team_stats.shots_taken, 0) + 1), 4)
    end;

    update public.season_team_stats sts
    set score_total = coalesce(sts.score_total, 0) + v_points_awarded,
        shots_taken = coalesce(sts.shots_taken, 0) + 1,
        pps = v_team_pps
    where sts.season_id = v_season_player.season_id
      and sts.team_id = v_team_id
    returning * into v_team_stats;
  end if;

  return jsonb_build_object(
    'shot', (
      select to_jsonb(se)
      from (
        select id, shot_number, points_awarded, base_points, is_moneyball, is_double, is_waiver, occurred_at, bottle_type_id, team_id, tier_id
        from public.shot_events
        where id = v_shot_id
      ) se
    ),
    'season_player', jsonb_build_object(
      'id', v_season_player.id,
      'shots_remaining', v_shots_remaining
    ),
    'player_stats', to_jsonb(v_player_stats),
    'team_stats', case when v_team_stats is null then null else to_jsonb(v_team_stats) end
  );
end;
$$;
