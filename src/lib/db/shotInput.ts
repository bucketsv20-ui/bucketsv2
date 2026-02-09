import type { SupabaseClient } from "@supabase/supabase-js";

export type ShotInputContext = {
  userId: string;
  leagueId: string;
  season: {
    id: string;
    name: string;
  };
  player: {
    id: string;
    displayName: string;
  };
  seasonPlayer: {
    id: string;
    teamId: string | null;
    tierId: string;
    shotsRemaining: number;
  };
};

export type ShotInsertPayload = {
  selectedDie: number;
  basePoints: 1 | 2 | 4 | 8;
  isDouble: boolean;
  isMoneyball: boolean;
};

export async function resolveShotInputContext(client: SupabaseClient): Promise<{ context: ShotInputContext | null; error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return { context: null, error: "You must be logged in to submit shots." };
  }

  const { data: membership } = await client
    .from("league_memberships")
    .select("league_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership?.league_id) {
    return { context: null, error: "No league membership found for this account." };
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

  const { data: player } = await client
    .from("players")
    .select("id, display_name")
    .eq("league_id", membership.league_id)
    .eq("linked_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!player?.id) {
    return { context: null, error: "No player linked to this user in the current league." };
  }

  const { data: seasonPlayer } = await client
    .from("season_players")
    .select("id, team_id, tier_id, shots_remaining")
    .eq("season_id", season.id)
    .eq("player_id", player.id)
    .eq("is_enabled", true)
    .limit(1)
    .maybeSingle();

  if (!seasonPlayer?.id) {
    return { context: null, error: "No enabled season player record found for the active season." };
  }

  return {
    context: {
      userId: user.id,
      leagueId: membership.league_id,
      season: {
        id: season.id,
        name: season.name,
      },
      player: {
        id: player.id,
        displayName: player.display_name,
      },
      seasonPlayer: {
        id: seasonPlayer.id,
        teamId: seasonPlayer.team_id,
        tierId: seasonPlayer.tier_id,
        shotsRemaining: seasonPlayer.shots_remaining,
      },
    },
    error: null,
  };
}

export async function submitShotEvent(client: SupabaseClient, context: ShotInputContext, payload: ShotInsertPayload) {
  if (context.seasonPlayer.shotsRemaining <= 0) {
    return { error: "No shots remaining for this season player." };
  }

  const { data: latestShot } = await client
    .from("shot_events")
    .select("shot_number")
    .eq("season_player_id", context.seasonPlayer.id)
    .order("shot_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextShotNumber = (latestShot?.shot_number ?? 0) + 1;
  const pointsAwarded = payload.basePoints * (payload.isDouble ? 2 : 1);

  const { error: insertError } = await client.from("shot_events").insert({
    league_id: context.leagueId,
    season_id: context.season.id,
    season_player_id: context.seasonPlayer.id,
    shot_number: nextShotNumber,
    selected_die: payload.selectedDie,
    tier_id: context.seasonPlayer.tierId,
    team_id: context.seasonPlayer.teamId,
    base_points: payload.basePoints,
    is_double: payload.isDouble,
    is_moneyball: payload.isMoneyball,
    points_awarded: pointsAwarded,
  });

  if (insertError) {
    return {
      error: `Unable to save shot: ${insertError.message}`,
    };
  }

  const nextRemaining = Math.max(0, context.seasonPlayer.shotsRemaining - 1);
  const { error: remainingError } = await client
    .from("season_players")
    .update({ shots_remaining: nextRemaining })
    .eq("id", context.seasonPlayer.id);

  if (remainingError) {
    return {
      error: `Shot saved, but failed to decrement shots_remaining: ${remainingError.message}`,
    };
  }

  return { error: null };
}

export async function loadRecentShots(client: SupabaseClient, seasonPlayerId: string) {
  return client
    .from("shot_events")
    .select("id, shot_number, selected_die, base_points, is_double, is_moneyball, points_awarded, occurred_at")
    .eq("season_player_id", seasonPlayerId)
    .order("shot_number", { ascending: false })
    .limit(15);
}
