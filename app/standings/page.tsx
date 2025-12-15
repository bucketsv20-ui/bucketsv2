"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

type ActiveSeason = {
  season_id: number;
  season_name: string;
};

type ScoreboardRow = {
  season_id: number;
  season_team_id: number | null;
  team_name: string | null;
  player_id: number;
  player_name: string;
  player_points: number;
  shots_taken: number;
  team_points: number;
};

function useSupabaseMemo() {
  return useMemo(() => getSupabaseClient(), []);
}

export default function StandingsPage() {
  const { client, error: envError } = useSupabaseMemo();
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [rows, setRows] = useState<ScoreboardRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const loadStandings = useCallback(
    async (seasonId: number) => {
      if (!client) return;
      const { data, error } = await client
        .from("v_active_scoreboard_rows")
        .select(
          "season_id, season_team_id, team_name, player_id, player_name, player_points, shots_taken, team_points",
        )
        .eq("season_id", seasonId);

      if (error || !data) {
        setStatus("Unable to load standings.");
        setRows([]);
        return;
      }

      setRows(data);
    },
    [client],
  );

  const loadActiveSeason = useCallback(async () => {
    if (!client) return;
    setStatus("Loading active season...");
    const { data, error } = await client
      .from("seasons")
      .select("season_id, season_name")
      .eq("status", "active")
      .order("start_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      setStatus("No active season is ready yet.");
      return;
    }

    setActiveSeason(data);
    setStatus("");
    await loadStandings(data.season_id);
  }, [client, loadStandings]);

  useEffect(() => {
    if (!client) return;
    loadActiveSeason();
  }, [client, loadActiveSeason]);

  useEffect(() => {
    if (!client || !activeSeason) return;

    const channel = client
      .channel("shot-events-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shot_events", filter: `season_id=eq.${activeSeason.season_id}` },
        () => {
          loadStandings(activeSeason.season_id);
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, activeSeason, loadStandings]);

  const groupedTeams = useMemo(() => {
    const map = new Map<string, { teamName: string; teamPoints: number; players: ScoreboardRow[] }>();
    for (const row of rows) {
      const key = row.season_team_id?.toString() ?? "free";
      if (!map.has(key)) {
        map.set(key, {
          teamName: row.team_name ?? "Free Agents",
          teamPoints: row.team_points,
          players: [],
        });
      }
      map.get(key)!.players.push(row);
    }

    return Array.from(map.values())
      .sort((a, b) => b.teamPoints - a.teamPoints)
      .map((team) => ({
        ...team,
        players: team.players.sort((a, b) => b.player_points - a.player_points || a.player_name.localeCompare(b.player_name)),
      }));
  }, [rows]);

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

  return (
    <main className="min-h-screen p-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-300">TV Standings</p>
            <h1 className="text-4xl font-bold text-emerald-100">Buckets leaderboard</h1>
            <p className="text-sm text-slate-300">Live updates whenever shots are recorded.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">Active season</p>
            <p className="text-xl font-semibold text-emerald-200">{activeSeason?.season_name ?? "Not set"}</p>
            {status && <p className="text-xs text-slate-400">{status}</p>}
          </div>
        </header>

        <div className="space-y-4">
          {groupedTeams.length === 0 ? (
            <p className="text-slate-200 text-lg">Waiting for an active season or standings data...</p>
          ) : (
            groupedTeams.map((team) => (
              <section
                key={team.teamName}
                className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 shadow-lg p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-400" aria-hidden />
                    <h2 className="text-2xl font-semibold text-emerald-100">{team.teamName}</h2>
                  </div>
                  <p className="text-3xl font-bold text-emerald-300">{team.teamPoints} pts</p>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {team.players.map((player) => (
                    <div
                      key={player.player_id}
                      className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3"
                    >
                      <div>
                        <p className="text-xl font-semibold text-slate-100">{player.player_name}</p>
                        <p className="text-xs text-slate-400">Shots taken: {player.shots_taken}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-200">{player.player_points}</p>
                        <p className="text-xs text-slate-400">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
