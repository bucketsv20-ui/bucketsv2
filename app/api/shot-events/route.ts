import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { shotEventSchema } from "@/src/lib/validation/schemas";
import type { Database } from "@/src/types/database";

type ShotEvent = Database["public"]["Tables"]["shot_events"]["Row"];

type ShotMutationAction = "delete" | "undo";

async function recalculateShotState(shot: ShotEvent) {
  const supabase = await getServerSupabaseClient();
  const { data: activeShots, error: shotsError } = await supabase
    .from("shot_events")
    .select("*")
    .eq("season_player_id", shot.season_player_id)
    .eq("is_voided", false)
    .order("shot_number", { ascending: true });

  if (shotsError) throw new Error(shotsError.message);

  const playerShots = activeShots ?? [];
  const latestPlayerShot = playerShots.at(-1);
  const scoreTotal = playerShots.reduce((total, currentShot) => total + currentShot.points_awarded, 0);
  const shotsTaken = playerShots.length;
  const xpFromShots = playerShots.reduce((total, currentShot) => total + currentShot.xp_awarded, 0);
  const moneyballsMade = playerShots.filter((currentShot) => currentShot.is_moneyball).length;
  const doublesMade = playerShots.filter((currentShot) => currentShot.is_double).length;
  const highShotStreak = Math.max(0, ...playerShots.map((currentShot) => currentShot.shot_streak ?? 0));
  const highPointStreak = Math.max(0, ...playerShots.map((currentShot) => currentShot.point_streak ?? 0));

  const { data: existingPlayerStats, error: statsError } = await supabase
    .from("season_player_stats")
    .select("xp_bonus")
    .eq("season_player_id", shot.season_player_id)
    .maybeSingle();

  if (statsError) throw new Error(statsError.message);

  const xpBonus = existingPlayerStats?.xp_bonus ?? 0;
  const xpTotal = xpFromShots + xpBonus;
  const { error: playerStatsError } = await supabase.from("season_player_stats").upsert({
    league_id: shot.league_id,
    season_id: shot.season_id,
    season_player_id: shot.season_player_id,
    score_total: scoreTotal,
    shots_taken: shotsTaken,
    pps: shotsTaken > 0 ? Number((scoreTotal / shotsTaken).toFixed(4)) : 0,
    moneyballs_made: moneyballsMade,
    doubles_made: doublesMade,
    current_shot_streak: latestPlayerShot?.shot_streak ?? 0,
    current_point_streak: latestPlayerShot?.point_streak ?? 0,
    high_shot_streak: highShotStreak,
    high_point_streak: highPointStreak,
    xp_from_shots: xpFromShots,
    xp_bonus: xpBonus,
    xp_total: xpTotal,
    level: Math.floor(xpTotal / 40),
  }, { onConflict: "season_player_id" });

  if (playerStatsError) throw new Error(playerStatsError.message);

  const { data: seasonPlayer, error: seasonPlayerFetchError } = await supabase
    .from("season_players")
    .select("shots_remaining")
    .eq("id", shot.season_player_id)
    .single();

  if (seasonPlayerFetchError) throw new Error(seasonPlayerFetchError.message);

  const { error: seasonPlayerUpdateError } = await supabase
    .from("season_players")
    .update({ shots_remaining: (seasonPlayer?.shots_remaining ?? 0) + 1 })
    .eq("id", shot.season_player_id);

  if (seasonPlayerUpdateError) throw new Error(seasonPlayerUpdateError.message);

  if (shot.team_id) {
    const { data: teamShots, error: teamShotsError } = await supabase
      .from("shot_events")
      .select("points_awarded")
      .eq("season_id", shot.season_id)
      .eq("team_id", shot.team_id)
      .eq("is_voided", false);

    if (teamShotsError) throw new Error(teamShotsError.message);

    const teamScoreTotal = (teamShots ?? []).reduce((total, currentShot) => total + currentShot.points_awarded, 0);
    const teamShotsTaken = teamShots?.length ?? 0;
    const { error: teamStatsError } = await supabase.from("season_team_stats").upsert({
      league_id: shot.league_id,
      season_id: shot.season_id,
      team_id: shot.team_id,
      score_total: teamScoreTotal,
      shots_taken: teamShotsTaken,
      pps: teamShotsTaken > 0 ? Number((teamScoreTotal / teamShotsTaken).toFixed(4)) : 0,
    }, { onConflict: "season_id,team_id" });

    if (teamStatsError) throw new Error(teamStatsError.message);
  }
}

async function mutateLatestShot(req: Request, action: ShotMutationAction) {
  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Shot id is required." }, { status: 400 });
  }

  const supabase = await getServerSupabaseClient();
  const { data: shot, error: shotError } = await supabase
    .from("shot_events")
    .select("*")
    .eq("id", id)
    .eq("is_voided", false)
    .single();

  if (shotError || !shot) {
    return NextResponse.json({ error: shotError?.message ?? "Shot not found." }, { status: 404 });
  }

  const { data: latestShot, error: latestShotError } = await supabase
    .from("shot_events")
    .select("id")
    .eq("season_player_id", shot.season_player_id)
    .eq("is_voided", false)
    .order("shot_number", { ascending: false })
    .limit(1)
    .single();

  if (latestShotError) {
    return NextResponse.json({ error: latestShotError.message }, { status: 400 });
  }

  if (latestShot?.id !== shot.id) {
    return NextResponse.json({ error: "Only the latest shot for this player can be undone or deleted safely." }, { status: 409 });
  }

  if (action === "undo") {
    const { error: undoError } = await supabase
      .from("shot_events")
      .update({ is_voided: true, voided_at: new Date().toISOString(), void_reason: "undo_shot" })
      .eq("id", shot.id);

    if (undoError) return NextResponse.json({ error: undoError.message }, { status: 400 });
  } else {
    const { error: deleteError } = await supabase.from("shot_events").delete().eq("id", shot.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  try {
    await recalculateShotState(shot);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to recalculate shot state." }, { status: 400 });
  }

  return NextResponse.json({ shot, action });
}

export async function POST(req: Request) {
  const parsed = shotEventSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await getServerSupabaseClient();
  const { data: season } = await supabase.from("seasons").select("status").eq("id", parsed.data.season_id).single();
  if (!season || season.status === "archived" || season.status === "closed") {
    return NextResponse.json({ error: "Season does not allow shot entry" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("shot_events")
    .select("shot_number")
    .eq("season_player_id", parsed.data.season_player_id)
    .order("shot_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const shot_number = (existing?.shot_number ?? 0) + 1;
  const points_awarded = parsed.data.base_points * (parsed.data.is_double ? 2 : 1);

  const { data, error } = await supabase
    .from("shot_events")
    .insert({ ...parsed.data, shot_number, points_awarded, xp_awarded: points_awarded })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("season_player_allowance_events").insert({
    league_id: parsed.data.league_id,
    season_player_id: parsed.data.season_player_id,
    delta_shots: -1,
    reason: "shot_taken",
  });

  return NextResponse.json({ shot: data });
}

export async function PATCH(req: Request) {
  return mutateLatestShot(req, "undo");
}

export async function DELETE(req: Request) {
  return mutateLatestShot(req, "delete");
}
