"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

type SeasonMeta = {
  season_id: number;
  season_name: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
};

type PlayerStandingRow = {
  season_id: number;
  player_id: number;
  player_name: string;
  season_team_id: number | null;
  team_name: string | null;
  tier_id: number | null;
  tier_name: string | null;
  tier_color: string | null;
  player_points: number;
  player_shots: number;
  points_per_shot: number;
  player_rank: number;
  player_is_hidden: boolean;
};

type TeamStandingRow = {
  season_id: number;
  season_team_id: number | null;
  team_name: string | null;
  sort_order: number | null;
  team_points: number;
  team_shots: number;
  points_per_shot: number;
  team_rank: number;
};

type AwardsRow = {
  season_id: number;
  mvp_player_ids: number[] | null;
  mvp_points: number | null;
  most_shots_player_ids: number[] | null;
  most_shots: number | null;
  best_pps_player_ids: number[] | null;
  best_pps: number | null;
};

type PlayerAward = {
  title: string;
  value: string;
  players: PlayerStandingRow[];
};

type DerivedSeasonData = {
  players: PlayerStandingRow[];
  teams: TeamStandingRow[];
  awards: AwardsRow | null;
};

const MIN_EFFICIENCY_SHOTS = 10;

function useSupabaseMemo() {
  return useMemo(() => getSupabaseClient(), []);
}

function formatDate(input: string | null) {
  if (!input) return "TBD";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(input));
}

function calculateAwards(players: PlayerStandingRow[]): PlayerAward[] {
  if (players.length === 0) return [];

  const maxPoints = Math.max(...players.map((p) => p.player_points));
  const maxShots = Math.max(...players.map((p) => p.player_shots));
  const eligibleForEfficiency = players.filter((p) => p.player_shots >= MIN_EFFICIENCY_SHOTS);
  const bestPps =
    eligibleForEfficiency.length === 0 ? null : Math.max(...eligibleForEfficiency.map((p) => Number(p.points_per_shot) || 0));

  const mvpPlayers = players.filter((p) => p.player_points === maxPoints);
  const volumeShooters = players.filter((p) => p.player_shots === maxShots);
  const efficientPlayers = bestPps === null ? [] : eligibleForEfficiency.filter((p) => Number(p.points_per_shot) === bestPps);

  return [
    {
      title: "MVP (Points)",
      value: `${maxPoints} pts`,
      players: mvpPlayers,
    },
    {
      title: "Most Shots",
      value: `${maxShots} shots`,
      players: volumeShooters,
    },
    {
      title: `Most Efficient (≥ ${MIN_EFFICIENCY_SHOTS} shots)`,
      value: bestPps === null ? "N/A" : `${bestPps.toFixed(2)} PPS`,
      players: efficientPlayers,
    },
  ];
}

function buildTeamStandings(baseTeams: TeamStandingRow[], players: PlayerStandingRow[]) {
  const teamsMap = new Map<string, TeamStandingRow>();

  baseTeams.forEach((team) => {
    const key = team.season_team_id === null ? "free" : team.season_team_id.toString();
    teamsMap.set(key, {
      ...team,
      team_points: 0,
      team_shots: 0,
      points_per_shot: 0,
    });
  });

  players.forEach((player) => {
    const key = player.season_team_id === null ? "free" : player.season_team_id.toString();
    const existing = teamsMap.get(key);

    if (!existing) {
      teamsMap.set(key, {
        season_id: player.season_id,
        season_team_id: player.season_team_id,
        team_name: player.team_name ?? "Free Agents",
        sort_order: null,
        team_points: player.player_points,
        team_shots: player.player_shots,
        points_per_shot: player.player_shots > 0 ? player.player_points / player.player_shots : 0,
        team_rank: 0,
      });
      return;
    }

    const updatedPoints = existing.team_points + player.player_points;
    const updatedShots = existing.team_shots + player.player_shots;

    teamsMap.set(key, {
      ...existing,
      team_points: updatedPoints,
      team_shots: updatedShots,
      points_per_shot: updatedShots > 0 ? updatedPoints / updatedShots : 0,
    });
  });

  const teams = Array.from(teamsMap.values()).sort((a, b) => {
    if (b.team_points === a.team_points) {
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    }
    return b.team_points - a.team_points;
  });

  let currentRank = 0;
  let previousPoints: number | null = null;

  return teams.map((team, index) => {
    if (previousPoints === null || team.team_points !== previousPoints) {
      currentRank = index + 1;
      previousPoints = team.team_points;
    }

    return {
      ...team,
      team_rank: currentRank,
      points_per_shot: team.team_shots > 0 ? team.team_points / team.team_shots : 0,
    };
  });
}

function buildPlayerStandings(players: PlayerStandingRow[]) {
  const sorted = [...players].sort((a, b) => {
    if (b.player_points === a.player_points) {
      return a.player_name.localeCompare(b.player_name);
    }
    return b.player_points - a.player_points;
  });

  let currentRank = 0;
  let previousPoints: number | null = null;

  return sorted.map((player, index) => {
    if (previousPoints === null || player.player_points !== previousPoints) {
      currentRank = index + 1;
      previousPoints = player.player_points;
    }

    return {
      ...player,
      player_rank: currentRank,
    };
  });
}

export default function SeasonHistoryPage() {
  const { client, error: envError } = useSupabaseMemo();
  const [seasons, setSeasons] = useState<SeasonMeta[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [seasonData, setSeasonData] = useState<DerivedSeasonData | null>(null);
  const [includeActiveSeasons, setIncludeActiveSeasons] = useState(false);
  const [includeHiddenPlayers, setIncludeHiddenPlayers] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadSeasons = useCallback(async () => {
    if (!client) return;
    setStatus("Loading seasons...");

    const allowedStatuses = includeActiveSeasons ? ["completed", "active"] : ["completed"];
    const { data, error } = await client
      .from("seasons")
      .select("season_id, season_name, status, start_at, end_at")
      .in("status", allowedStatuses)
      .order("end_at", { ascending: false, nullsLast: true })
      .order("start_at", { ascending: false });

    if (error || !data) {
      setStatus("Unable to load seasons.");
      setSeasons([]);
      return;
    }

    setSeasons(data as SeasonMeta[]);
    setStatus("");

    const mostRecentCompleted = (data as SeasonMeta[]).find((s) => s.status === "completed");
    const nextSelection = mostRecentCompleted?.season_id ?? (data[0]?.season_id ?? null);
    setSelectedSeasonId((current) => (current && data.some((s) => s.season_id === current) ? current : nextSelection));
  }, [client, includeActiveSeasons]);

  const loadSeasonData = useCallback(
    async (seasonId: number | null) => {
      if (!client || !seasonId) return;
      setLoading(true);
      setStatus("Loading season summary...");

      const [playerRes, teamRes, awardsRes] = await Promise.all([
        client
          .from("v_season_player_standings")
          .select(
            "season_id, player_id, player_name, season_team_id, team_name, tier_id, tier_name, tier_color, player_points, player_shots, points_per_shot, player_rank, player_is_hidden",
          )
          .eq("season_id", seasonId),
        client
          .from("v_season_team_standings")
          .select("season_id, season_team_id, team_name, sort_order, team_points, team_shots, points_per_shot, team_rank")
          .eq("season_id", seasonId),
        client.from("v_season_awards").select("*").eq("season_id", seasonId).maybeSingle(),
      ]);

      if (playerRes.error || teamRes.error) {
        setStatus("Unable to load season summary.");
        setLoading(false);
        setSeasonData(null);
        return;
      }

      const players = (playerRes.data ?? []).map((row) => ({
        ...row,
        player_points: Number(row.player_points ?? 0),
        player_shots: Number(row.player_shots ?? 0),
        points_per_shot: Number(row.points_per_shot ?? 0),
        player_is_hidden: Boolean(row.player_is_hidden),
      })) as PlayerStandingRow[];

      const teams = (teamRes.data ?? []).map((row) => ({
        ...row,
        team_points: Number(row.team_points ?? 0),
        team_shots: Number(row.team_shots ?? 0),
        points_per_shot: Number(row.points_per_shot ?? 0),
      })) as TeamStandingRow[];

      setSeasonData({
        players,
        teams,
        awards: (awardsRes.data as AwardsRow | null) ?? null,
      });
      setStatus("");
      setLoading(false);
    },
    [client],
  );

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    loadSeasonData(selectedSeasonId);
  }, [loadSeasonData, selectedSeasonId]);

  if (envError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-red-900/50 border border-red-500 text-red-50 rounded-xl p-6 max-w-xl w-full text-center">
          <p className="font-semibold">{envError}</p>
          <p className="mt-2 text-sm text-red-100">Update your .env.local and restart the dev server.</p>
        </div>
      </main>
    );
  }

  const selectedSeason = seasons.find((s) => s.season_id === selectedSeasonId) ?? null;

  const filteredPlayers =
    seasonData?.players.filter((p) => (includeHiddenPlayers ? true : !p.player_is_hidden)) ?? [];
  const playerStandings = buildPlayerStandings(filteredPlayers);
  const teamStandings = buildTeamStandings(seasonData?.teams ?? [], filteredPlayers);
  const awards = calculateAwards(playerStandings);

  const totalPoints = playerStandings.reduce((sum, p) => sum + p.player_points, 0);
  const totalShots = playerStandings.reduce((sum, p) => sum + p.player_shots, 0);
  const teamCount = teamStandings.filter((t) => t.season_team_id !== null).length;
  const playerCount = playerStandings.length;

  const desktopSeasonList = (
    <div className="hidden md:flex md:flex-col md:w-64 gap-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-emerald-200 uppercase tracking-wide">Season history</h2>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
            {includeActiveSeasons ? "Completed + Active" : "Completed"}
          </span>
        </div>
        <div className="space-y-2">
          {seasons.map((season) => (
            <button
              key={season.season_id}
              onClick={() => setSelectedSeasonId(season.season_id)}
              className={`w-full text-left rounded-xl px-3 py-2 transition ${
                selectedSeasonId === season.season_id
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-50"
                  : "bg-slate-900/60 border border-slate-800 text-slate-200 hover:border-emerald-500/40"
              }`}
            >
              <p className="font-semibold">{season.season_name}</p>
              <p className="text-xs text-slate-400">{season.status}</p>
            </button>
          ))}
          {seasons.length === 0 && <p className="text-sm text-slate-400">No seasons found.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
        <label className="flex items-center justify-between text-sm text-slate-200">
          Include active seasons
          <input
            type="checkbox"
            checked={includeActiveSeasons}
            onChange={(e) => setIncludeActiveSeasons(e.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
        </label>
        <label className="flex items-center justify-between text-sm text-slate-200">
          Include hidden players
          <input
            type="checkbox"
            checked={includeHiddenPlayers}
            onChange={(e) => setIncludeHiddenPlayers(e.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
        </label>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Season review</p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-50">Season history</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Explore completed seasons, compare teams, and spotlight standout players with quick awards and efficiency metrics.
            </p>
          </div>
          <Link
            href="/standings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-emerald-100 hover:border-emerald-400/50 transition"
          >
            View live standings
          </Link>
        </header>

        <div className="md:grid md:grid-cols-[260px,1fr] gap-6">
          {desktopSeasonList}

          <section className="space-y-5">
            <div className="md:hidden flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <label className="text-sm text-slate-300">Select season</label>
              <select
                value={selectedSeasonId ?? ""}
                onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                <option value="" disabled>
                  Choose a season
                </option>
                {seasons.map((season) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.season_name} ({season.status})
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>Include active seasons</span>
                <input
                  type="checkbox"
                  checked={includeActiveSeasons}
                  onChange={(e) => setIncludeActiveSeasons(e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>Include hidden players</span>
                <input
                  type="checkbox"
                  checked={includeHiddenPlayers}
                  onChange={(e) => setIncludeHiddenPlayers(e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Selected season</p>
                  <h2 className="text-2xl md:text-3xl font-semibold text-emerald-100">
                    {selectedSeason?.season_name ?? "No season chosen"}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {selectedSeason
                      ? `${selectedSeason.status.toUpperCase()} • ${formatDate(selectedSeason.start_at)} → ${formatDate(selectedSeason.end_at)}`
                      : "Pick a completed season to view results."}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-slate-400">{status}</p>
                  {loading && <p className="text-xs text-emerald-300">Loading data...</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-xs text-emerald-200 uppercase">Total points</p>
                  <p className="text-3xl font-bold text-emerald-100">{totalPoints}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-300 uppercase">Total shots</p>
                  <p className="text-3xl font-bold text-slate-50">{totalShots}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-300 uppercase">Teams</p>
                  <p className="text-3xl font-bold text-slate-50">{teamCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-300 uppercase">Players</p>
                  <p className="text-3xl font-bold text-slate-50">{playerCount}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {awards.map((award) => (
                  <div key={award.title} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <p className="text-xs uppercase text-slate-300">{award.title}</p>
                    <p className="text-2xl font-semibold text-emerald-100">{award.value}</p>
                    {award.players.length === 0 ? (
                      <p className="text-sm text-slate-400">No eligible players</p>
                    ) : (
                      <div className="space-y-1">
                        {award.players.map((player) => (
                          <p key={player.player_id} className="text-sm text-slate-200">
                            {player.player_name} {player.team_name ? `• ${player.team_name}` : "• Free Agent"}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Team standings</p>
                    <p className="text-sm text-slate-400">Ranked by points (ties share rank)</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
                  <div className="hidden md:grid grid-cols-[60px,1fr,120px,120px,120px] px-4 py-3 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
                    <span>Rank</span>
                    <span>Team</span>
                    <span className="text-right">Points</span>
                    <span className="text-right">Shots</span>
                    <span className="text-right">PPS</span>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {teamStandings.map((team) => {
                      const podiumClass =
                        team.team_rank === 1
                          ? "border-emerald-400/60 bg-emerald-500/10"
                          : team.team_rank === 2
                            ? "border-emerald-400/40 bg-emerald-500/5"
                            : team.team_rank === 3
                              ? "border-emerald-400/30 bg-emerald-500/0"
                              : "border-transparent";

                      return (
                        <div
                          key={`${team.season_team_id ?? "free"}-${team.team_rank}`}
                          className={`px-4 py-3 md:grid md:grid-cols-[60px,1fr,120px,120px,120px] items-center gap-3 border-l-4 ${podiumClass}`}
                        >
                          <div className="flex items-center gap-2 md:gap-0">
                            <span className="text-lg font-semibold text-emerald-200 w-10">{team.team_rank}</span>
                            <span className="md:hidden text-slate-300 text-sm">Rank</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-50">{team.team_name ?? "Free Agents"}</p>
                          </div>
                          <div className="text-right font-semibold text-slate-50">{team.team_points}</div>
                          <div className="text-right text-slate-200">{team.team_shots}</div>
                          <div className="text-right text-slate-200">{team.points_per_shot.toFixed(2)}</div>
                        </div>
                      );
                    })}
                    {teamStandings.length === 0 && (
                      <p className="px-4 py-6 text-slate-400 text-sm">No team standings available for this season.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Player performance</p>
                    <p className="text-sm text-slate-400">Ranked by total points. Toggle hidden players above.</p>
                  </div>
                </div>
                <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">Player</th>
                        <th className="px-4 py-3 text-left">Team</th>
                        <th className="px-4 py-3 text-left">Tier</th>
                        <th className="px-4 py-3 text-right">Points</th>
                        <th className="px-4 py-3 text-right">Shots</th>
                        <th className="px-4 py-3 text-right">PPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {playerStandings.map((player) => (
                        <tr key={`${player.player_id}-${player.player_rank}`} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-semibold text-emerald-200">{player.player_rank}</td>
                          <td className="px-4 py-3 text-slate-50">{player.player_name}</td>
                          <td className="px-4 py-3 text-slate-200">{player.team_name ?? "Free Agents"}</td>
                          <td className="px-4 py-3">
                            {player.tier_name ? (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold text-slate-950"
                                style={{ backgroundColor: player.tier_color ?? "#cbd5e1" }}
                              >
                                {player.tier_name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-50">{player.player_points}</td>
                          <td className="px-4 py-3 text-right text-slate-200">{player.player_shots}</td>
                          <td className="px-4 py-3 text-right text-slate-200">{player.points_per_shot.toFixed(2)}</td>
                        </tr>
                      ))}
                      {playerStandings.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-slate-400 text-sm" colSpan={7}>
                            No player data found. Try enabling hidden players or choose another season.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
