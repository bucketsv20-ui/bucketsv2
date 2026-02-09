import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export async function getLeagueDashboardData(leagueId: string): Promise<any> {
  const supabase = await getServerSupabaseClient();
  const [leagues, seasons, teams, tiers, players, members, bottles, diceSets] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase.from("seasons").select("*").eq("league_id", leagueId).order("created_at", { ascending: false }),
    supabase.from("teams").select("*").eq("league_id", leagueId),
    supabase.from("tiers").select("*").eq("league_id", leagueId),
    supabase.from("players").select("*").eq("league_id", leagueId),
    supabase.from("league_memberships").select("*").eq("league_id", leagueId),
    supabase.from("bottle_types").select("*").eq("league_id", leagueId),
    supabase.from("dice_sets").select("*").eq("league_id", leagueId),
  ]);

  return {
    league: leagues.data,
    seasons: seasons.data ?? [],
    teams: teams.data ?? [],
    tiers: tiers.data ?? [],
    players: players.data ?? [],
    memberships: members.data ?? [],
    bottleTypes: bottles.data ?? [],
    diceSets: diceSets.data ?? [],
  };
}

export async function getSeasonData(leagueId: string, seasonId: string): Promise<any> {
  const supabase = await getServerSupabaseClient();
  const [season, seasonPlayers, seasonTeams, seasonTiers, playerStats, teamStats, seasonAwards, seasonResults, xpAwards, shotEvents, allowances, assignments] = await Promise.all([
    supabase.from("seasons").select("*").eq("id", seasonId).single(),
    supabase.from("season_players").select("*").eq("season_id", seasonId),
    supabase.from("season_teams").select("*").eq("season_id", seasonId),
    supabase.from("season_tiers").select("*").eq("season_id", seasonId),
    supabase.from("season_player_stats").select("*").eq("season_id", seasonId),
    supabase.from("season_team_stats").select("*").eq("season_id", seasonId),
    supabase.from("season_awards").select("*").eq("season_id", seasonId),
    supabase.from("season_results").select("*").eq("season_id", seasonId),
    supabase.from("player_xp_awards").select("*").eq("season_id", seasonId),
    supabase.from("shot_events").select("*").eq("season_id", seasonId).order("occurred_at", { ascending: false }).limit(30),
    supabase.from("season_player_allowance_events").select("*").eq("league_id", leagueId).order("effective_at", { ascending: false }).limit(30),
    supabase.from("season_player_assignments").select("*").eq("league_id", leagueId).order("effective_from", { ascending: false }).limit(30),
  ]);

  return { season: season.data, seasonPlayers: seasonPlayers.data ?? [], seasonTeams: seasonTeams.data ?? [], seasonTiers: seasonTiers.data ?? [], playerStats: playerStats.data ?? [], teamStats: teamStats.data ?? [], seasonAwards: seasonAwards.data ?? [], seasonResults: seasonResults.data ?? [], xpAwards: xpAwards.data ?? [], recentShots: shotEvents.data ?? [], allowanceEvents: allowances.data ?? [], assignments: assignments.data ?? [] };
}
