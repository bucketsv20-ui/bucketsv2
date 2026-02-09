import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type AppBootstrap = {
  userId: string;
  leagueId: string;
};

export type Season = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed" | "archived";
  format: "team" | "ffa";
  season_shot_cap: number;
  created_at: string;
};

export type Player = {
  id: string;
  display_name: string;
  linked_user_id: string | null;
  is_active: boolean;
};

export type Tier = {
  id: string;
  name: string;
  sort_order: number;
};

export type SeasonTeam = {
  team_id: string;
  name: string;
};

export type SeasonPlayer = {
  id: string;
  player_id: string;
  player_name: string;
  team_id: string | null;
  tier_id: string;
  shots_cap_initial: number;
  shots_remaining: number;
  is_enabled: boolean;
};

export type ShotEvent = {
  id: string;
  season_player_id: string;
  team_id: string | null;
  shot_number: number;
  selected_die: number;
  rolled_dice: number[] | null;
  base_points: number;
  points_awarded: number;
  is_double: boolean;
  is_moneyball: boolean;
  occurred_at: string;
};

export async function loadBootstrap(client: SupabaseClient) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    return { data: null as AppBootstrap | null, error: "You must be logged in." };
  }

  const { data: membership, error: membershipError } = await client
    .from("league_memberships")
    .select("league_id")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return { data: null as AppBootstrap | null, error: membershipError.message };
  }

  if (!membership?.league_id) {
    return { data: null as AppBootstrap | null, error: "No active league membership found. Ask a league admin to add you." };
  }

  return { data: { userId: authData.user.id, leagueId: membership.league_id }, error: null as string | null };
}

export async function loadSeasons(client: SupabaseClient, leagueId: string) {
  return client
    .from("seasons")
    .select("id, name, status, format, season_shot_cap, created_at")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });
}

export async function createSeason(client: SupabaseClient, input: { leagueId: string; name: string; format: "team" | "ffa"; seasonShotCap: number }) {
  return client
    .from("seasons")
    .insert({
      league_id: input.leagueId,
      name: input.name,
      format: input.format,
      season_shot_cap: input.seasonShotCap,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function loadPlayers(client: SupabaseClient, leagueId: string) {
  return client
    .from("players")
    .select("id, display_name, linked_user_id, is_active")
    .eq("league_id", leagueId)
    .order("display_name", { ascending: true });
}

export async function createPlayer(client: SupabaseClient, input: { leagueId: string; displayName: string; linkedUserId: string | null }) {
  return client.from("players").insert({ league_id: input.leagueId, display_name: input.displayName, linked_user_id: input.linkedUserId });
}

export async function loadTiers(client: SupabaseClient, leagueId: string) {
  return client.from("tiers").select("id, name, sort_order").eq("league_id", leagueId).eq("is_active", true).order("sort_order", { ascending: true });
}

export async function createTier(client: SupabaseClient, input: { leagueId: string; name: string; sortOrder: number }) {
  return client.from("tiers").insert({ league_id: input.leagueId, name: input.name, sort_order: input.sortOrder, xp_multiplier: 1 });
}

export async function loadSeasonTeams(client: SupabaseClient, seasonId: string) {
  return client
    .from("season_teams")
    .select("team_id, teams!inner(id, name)")
    .eq("season_id", seasonId)
    .eq("is_enabled", true)
    .order("created_at", { ascending: true });
}

export async function createSeasonTeam(client: SupabaseClient, input: { leagueId: string; seasonId: string; teamName: string }) {
  const { data: team, error: teamError } = await client
    .from("teams")
    .insert({ league_id: input.leagueId, name: input.teamName })
    .select("id")
    .single();

  if (teamError || !team?.id) {
    return { error: teamError };
  }

  const { error } = await client.from("season_teams").insert({
    league_id: input.leagueId,
    season_id: input.seasonId,
    team_id: team.id,
  });

  return { error };
}

export async function loadSeasonPlayers(client: SupabaseClient, seasonId: string) {
  return client
    .from("season_players")
    .select("id, player_id, team_id, tier_id, shots_cap_initial, shots_remaining, is_enabled, players!inner(display_name)")
    .eq("season_id", seasonId)
    .order("created_at", { ascending: true });
}

export async function upsertSeasonPlayer(client: SupabaseClient, input: {
  leagueId: string;
  seasonId: string;
  playerId: string;
  tierId: string;
  teamId: string | null;
  shotsCap: number;
}) {
  return client.from("season_players").upsert(
    {
      league_id: input.leagueId,
      season_id: input.seasonId,
      player_id: input.playerId,
      tier_id: input.tierId,
      team_id: input.teamId,
      shots_cap_initial: input.shotsCap,
      shots_remaining: input.shotsCap,
      is_enabled: true,
    },
    { onConflict: "season_id,player_id" },
  );
}


export async function loadShotEvents(client: SupabaseClient, seasonId: string) {
  return client
    .from("shot_events")
    .select("id, season_player_id, team_id, shot_number, selected_die, rolled_dice, base_points, points_awarded, is_double, is_moneyball, occurred_at")
    .eq("season_id", seasonId)
    .eq("is_voided", false)
    .order("occurred_at", { ascending: false })
    .limit(50);
}

export async function createShot(client: SupabaseClient, input: {
  leagueId: string;
  seasonId: string;
  seasonPlayer: SeasonPlayer;
  selectedDie: number;
  rolledDice: [number, number] | null;
  basePoints: 1 | 2;
  isDouble: boolean;
  isMoneyball: boolean;
}) {
  const pointsAwarded = input.basePoints * (input.isDouble ? 2 : 1);

  if (input.selectedDie < 1 || input.selectedDie > 6) {
    return { error: "Selected die must be between 1 and 6." };
  }

  if (input.rolledDice && !input.rolledDice.includes(input.selectedDie)) {
    return { error: "Selected die must match one of the rolled dice values." };
  }

  if (input.seasonPlayer.shots_remaining <= 0) {
    return { error: "No shots remaining for this player." };
  }

  const { data: latestShot, error: latestError } = await client
    .from("shot_events")
    .select("shot_number")
    .eq("season_player_id", input.seasonPlayer.id)
    .order("shot_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return { error: latestError.message };
  }

  const shotNumber = (latestShot?.shot_number ?? 0) + 1;

  const { error: insertError } = await client.from("shot_events").insert({
    league_id: input.leagueId,
    season_id: input.seasonId,
    season_player_id: input.seasonPlayer.id,
    team_id: input.seasonPlayer.team_id,
    tier_id: input.seasonPlayer.tier_id,
    shot_number: shotNumber,
    selected_die: input.selectedDie,
    rolled_dice: input.rolledDice,
    base_points: input.basePoints,
    is_double: input.isDouble,
    is_moneyball: input.isMoneyball,
    points_awarded: pointsAwarded,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  const { error: updateError } = await client
    .from("season_players")
    .update({ shots_remaining: input.seasonPlayer.shots_remaining - 1 })
    .eq("id", input.seasonPlayer.id)
    .gt("shots_remaining", 0);

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null as string | null };
}

export function subscribeToSeasonRealtime(client: SupabaseClient, seasonId: string, onChange: () => void): RealtimeChannel {
  return client
    .channel(`season-${seasonId}-shot-events`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "shot_events", filter: `season_id=eq.${seasonId}` }, onChange)
    .subscribe();
}
