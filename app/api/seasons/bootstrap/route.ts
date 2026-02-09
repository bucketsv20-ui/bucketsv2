import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { seasonBootstrapSchema } from "@/src/lib/validation/schemas";

export async function POST(req: Request) {
  const parsed = seasonBootstrapSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { league_id, season_name, season_rules, teams, tiers, players } = parsed.data;
  const supabase = await getServerSupabaseClient();

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .insert({
      league_id,
      name: season_name,
      format: season_rules.format,
      is_ranked: season_rules.is_ranked,
      is_official: season_rules.is_official,
      season_shot_cap: season_rules.season_shot_cap,
      monthly_limit_enabled: season_rules.monthly_limit_enabled,
      monthly_shot_cap: season_rules.monthly_limit_enabled ? season_rules.monthly_shot_cap : null,
      weekly_ceiling_decrease_enabled: season_rules.weekly_ceiling_decrease_enabled,
      weekly_ceiling_decrease_by: season_rules.weekly_ceiling_decrease_enabled ? season_rules.weekly_ceiling_decrease_by : null,
      monthly_ceiling_decrease_enabled: season_rules.monthly_ceiling_decrease_enabled,
      monthly_ceiling_decrease_by: season_rules.monthly_ceiling_decrease_enabled ? season_rules.monthly_ceiling_decrease_by : null,
      rules_json: season_rules.rules_json,
    })
    .select("*")
    .single();

  if (seasonError || !season) {
    return NextResponse.json({ error: seasonError?.message ?? "Failed to create season" }, { status: 400 });
  }

  const { data: createdTeams, error: teamError } = await supabase
    .from("teams")
    .insert(teams.map((team) => ({ league_id, name: team.name, is_free_agent: team.is_free_agent })))
    .select("id,name");

  if (teamError || !createdTeams) return NextResponse.json({ error: teamError?.message ?? "Failed to create teams" }, { status: 400 });

  const { data: createdTiers, error: tierError } = await supabase
    .from("tiers")
    .insert(
      tiers.map((tier) => ({
        league_id,
        name: tier.name,
        sort_order: tier.sort_order,
        xp_multiplier: tier.xp_multiplier,
      })),
    )
    .select("id,name");

  if (tierError || !createdTiers) return NextResponse.json({ error: tierError?.message ?? "Failed to create tiers" }, { status: 400 });

  const teamMap = new Map(createdTeams.map((team) => [team.name.toLowerCase(), team.id]));
  const tierMap = new Map(createdTiers.map((tier) => [tier.name.toLowerCase(), tier.id]));

  const playerRows = players.map((player) => ({
    league_id,
    display_name: player.display_name,
    short_name: player.short_name ?? null,
    last_known_team_id: player.team_name ? teamMap.get(player.team_name.toLowerCase()) ?? null : null,
    last_known_tier_id: tierMap.get(player.tier_name.toLowerCase()) ?? null,
  }));

  const { data: createdPlayers, error: playerError } = await supabase
    .from("players")
    .insert(playerRows)
    .select("id,display_name");

  if (playerError || !createdPlayers) {
    return NextResponse.json({ error: playerError?.message ?? "Failed to create players" }, { status: 400 });
  }

  await supabase
    .from("season_teams")
    .insert(createdTeams.map((team) => ({ league_id, season_id: season.id, team_id: team.id })));

  await supabase
    .from("season_tiers")
    .insert(createdTiers.map((tier) => ({ league_id, season_id: season.id, tier_id: tier.id })));

  const playerByName = new Map(createdPlayers.map((player) => [player.display_name.toLowerCase(), player.id]));

  const seasonPlayerRows = players.map((player) => ({
    league_id,
    season_id: season.id,
    player_id: playerByName.get(player.display_name.toLowerCase())!,
    team_id: player.team_name ? teamMap.get(player.team_name.toLowerCase()) ?? null : null,
    tier_id: tierMap.get(player.tier_name.toLowerCase())!,
    shots_cap_initial: player.shots_cap_initial ?? season_rules.season_shot_cap,
    shots_remaining: player.shots_cap_initial ?? season_rules.season_shot_cap,
  }));

  const { data: seasonPlayers, error: seasonPlayersError } = await supabase
    .from("season_players")
    .insert(seasonPlayerRows)
    .select("id,player_id,team_id,tier_id");

  if (seasonPlayersError || !seasonPlayers) {
    return NextResponse.json({ error: seasonPlayersError?.message ?? "Failed to create season players" }, { status: 400 });
  }

  const assignments = seasonPlayers.map((sp) => ({
    league_id,
    season_player_id: sp.id,
    team_id: sp.team_id,
    tier_id: sp.tier_id,
  }));

  const { error: assignmentError } = await supabase.from("season_player_assignments").insert(assignments);
  if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 400 });

  return NextResponse.json({
    season,
    summary: {
      teams: createdTeams.length,
      tiers: createdTiers.length,
      players: createdPlayers.length,
      season_players: seasonPlayers.length,
    },
  });
}
