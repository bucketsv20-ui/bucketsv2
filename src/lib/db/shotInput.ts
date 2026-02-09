import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type ActiveSeasonContext = {
  leagueId: string;
  seasonId: string;
  seasonName: string;
};

export type SeasonPlayerOption = {
  seasonPlayerId: string;
  playerId: string;
  displayName: string;
  teamId: string | null;
  tierId: string;
  shotsCapInitial: number;
  shotsRemaining: number;
};

export type DieFaceOption = {
  dieValue: number;
  bottleTypeId: string;
  bottleTypeName: string;
  baseScore: 1 | 2 | 4;
};

export type RecordShotInput = {
  seasonPlayerId: string;
  selectedDie: number;
  isDouble: boolean;
  isWaiver: boolean;
};

export type RecordShotResult = {
  shot: {
    id: string;
    shot_number: number;
    points_awarded: number;
    base_points: number;
    is_moneyball: boolean;
    is_double: boolean;
    is_waiver: boolean;
    occurred_at: string;
    bottle_type_id: string | null;
    team_id: string | null;
    tier_id: string;
  };
  season_player: {
    id: string;
    shots_remaining: number;
  };
  player_stats: {
    score_total: number;
    shots_taken: number;
    pps: number;
    moneyballs_made: number;
    doubles_made: number;
    current_shot_streak: number;
    high_shot_streak: number;
    current_point_streak: number;
    high_point_streak: number;
    xp_from_shots: number;
    xp_total: number;
    level: number;
  };
  team_stats?: {
    score_total: number;
    shots_taken: number;
    pps: number;
  } | null;
};

export async function loadActiveSeasonContext(client: SupabaseClient): Promise<{ context: ActiveSeasonContext | null; error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return { context: null, error: "You must be logged in." };
  }

  const { data: membership } = await client
    .from("league_memberships")
    .select("league_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership?.league_id) {
    return { context: null, error: "No active league membership found." };
  }

  const { data: season } = await client
    .from("seasons")
    .select("id, name")
    .eq("league_id", membership.league_id)
    .eq("status", "active")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!season?.id) {
    return { context: null, error: "No active season found for your league." };
  }

  return {
    context: {
      leagueId: membership.league_id,
      seasonId: season.id,
      seasonName: season.name,
    },
    error: null,
  };
}

export async function loadSeasonPlayers(client: SupabaseClient, seasonId: string) {
  const { data, error } = await client
    .from("season_players")
    .select("id, player_id, team_id, tier_id, shots_cap_initial, shots_remaining, players!inner(display_name)")
    .eq("season_id", seasonId)
    .eq("is_enabled", true)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [] as SeasonPlayerOption[], error };
  }

  const mapped: SeasonPlayerOption[] = (data ?? []).map((row) => ({
    seasonPlayerId: row.id,
    playerId: row.player_id,
    displayName: (row.players as { display_name: string } | null)?.display_name ?? "Player",
    teamId: row.team_id,
    tierId: row.tier_id,
    shotsCapInitial: row.shots_cap_initial,
    shotsRemaining: row.shots_remaining,
  }));

  return { data: mapped, error: null };
}

export async function loadActiveDiceFaces(client: SupabaseClient, leagueId: string, seasonId: string, occurredAt = new Date().toISOString()) {
  const { data: diceSet, error: diceSetError } = await client
    .from("dice_sets")
    .select("id")
    .eq("league_id", leagueId)
    .or(`season_id.eq.${seasonId},season_id.is.null`)
    .lte("effective_from", occurredAt)
    .or(`effective_to.is.null,effective_to.gt.${occurredAt}`)
    .order("season_id", { ascending: false })
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (diceSetError || !diceSet?.id) {
    return { data: [] as DieFaceOption[], error: diceSetError ?? new Error("No active dice set found.") };
  }

  const { data, error } = await client
    .from("dice_set_faces")
    .select("die_value, bottle_type_id, bottle_types!inner(name, base_score)")
    .eq("dice_set_id", diceSet.id)
    .order("die_value", { ascending: true });

  if (error) {
    return { data: [] as DieFaceOption[], error };
  }

  const mapped: DieFaceOption[] = (data ?? []).map((row) => ({
    dieValue: row.die_value,
    bottleTypeId: row.bottle_type_id,
    bottleTypeName: (row.bottle_types as { name: string }).name,
    baseScore: (row.bottle_types as { base_score: 1 | 2 | 4 }).base_score,
  }));

  return { data: mapped, error: null };
}

export async function recordShot(client: SupabaseClient, input: RecordShotInput): Promise<{ data: RecordShotResult | null; error: string | null }> {
  const { data, error } = await client.rpc("record_shot", {
    p_season_player_id: input.seasonPlayerId,
    p_selected_die: input.selectedDie,
    p_is_double: input.isDouble,
    p_is_waiver: input.isWaiver,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as RecordShotResult, error: null };
}

export async function loadRecentShots(client: SupabaseClient, seasonPlayerId: string) {
  return client
    .from("shot_events")
    .select("id, shot_number, selected_die, base_points, is_double, is_moneyball, is_waiver, points_awarded, occurred_at")
    .eq("season_player_id", seasonPlayerId)
    .eq("is_voided", false)
    .order("shot_number", { ascending: false })
    .limit(15);
}

export function subscribeToSeasonShotEvents(client: SupabaseClient, seasonId: string, onChange: () => void): RealtimeChannel {
  return client
    .channel(`shot-events-season-${seasonId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shot_events", filter: `season_id=eq.${seasonId}` },
      onChange,
    )
    .subscribe();
}
