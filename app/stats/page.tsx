"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

type Scope = "completed" | "active_completed" | "non_cancelled";

type TierBreakdown = {
  tier_id: number;
  tier_name: string;
  color: string;
  seasons: number;
  shots: number;
  points: number;
  pps: number | string;
};

type CareerStatsRow = {
  player_id: number;
  name: string;
  is_hidden: boolean;
  total_points_completed: number | null;
  total_shots_completed: number | null;
  points_per_shot_completed: number | string | null;
  seasons_played_completed: number | null;
  total_points_active_completed: number | null;
  total_shots_active_completed: number | null;
  points_per_shot_active_completed: number | string | null;
  seasons_played_active_completed: number | null;
  total_points_non_cancelled: number | null;
  total_shots_non_cancelled: number | null;
  points_per_shot_non_cancelled: number | string | null;
  seasons_played_non_cancelled: number | null;
  team_wins_completed: number | null;
  team_wins_active_completed: number | null;
  team_wins_non_cancelled: number | null;
  mvps_completed: number | null;
  mvps_active_completed: number | null;
  mvps_non_cancelled: number | null;
  tier_breakdown_completed: TierBreakdown[] | null;
  tier_breakdown_active_completed: TierBreakdown[] | null;
  tier_breakdown_non_cancelled: TierBreakdown[] | null;
  last_shot_at: string | null;
};

type ScopedMetrics = {
  totalPoints: number;
  totalShots: number;
  pointsPerShot: number;
  seasonsPlayed: number;
  teamWins: number;
  mvpCount: number;
  tierBreakdown: TierBreakdown[];
};

type ScopeConfig = {
  label: string;
  value: Scope;
  description: string;
};

const scopeOptions: ScopeConfig[] = [
  {
    label: "Completed",
    value: "completed",
    description: "Only completed seasons",
  },
  {
    label: "Active + Completed",
    value: "active_completed",
    description: "Include in-progress seasons",
  },
  {
    label: "All (non-cancelled)",
    value: "non_cancelled",
    description: "Exclude cancelled seasons only",
  },
];

function useSupabaseMemo() {
  return useMemo(() => getSupabaseClient(), []);
}

function scopedMetrics(row: CareerStatsRow, scope: Scope): ScopedMetrics {
  if (scope === "completed") {
    return {
      totalPoints: Number(row.total_points_completed ?? 0),
      totalShots: Number(row.total_shots_completed ?? 0),
      pointsPerShot: Number(row.points_per_shot_completed ?? 0),
      seasonsPlayed: Number(row.seasons_played_completed ?? 0),
      teamWins: Number(row.team_wins_completed ?? 0),
      mvpCount: Number(row.mvps_completed ?? 0),
      tierBreakdown: row.tier_breakdown_completed ?? [],
    };
  }

  if (scope === "active_completed") {
    return {
      totalPoints: Number(row.total_points_active_completed ?? 0),
      totalShots: Number(row.total_shots_active_completed ?? 0),
      pointsPerShot: Number(row.points_per_shot_active_completed ?? 0),
      seasonsPlayed: Number(row.seasons_played_active_completed ?? 0),
      teamWins: Number(row.team_wins_active_completed ?? 0),
      mvpCount: Number(row.mvps_active_completed ?? 0),
      tierBreakdown: row.tier_breakdown_active_completed ?? [],
    };
  }

  return {
    totalPoints: Number(row.total_points_non_cancelled ?? 0),
    totalShots: Number(row.total_shots_non_cancelled ?? 0),
    pointsPerShot: Number(row.points_per_shot_non_cancelled ?? 0),
    seasonsPlayed: Number(row.seasons_played_non_cancelled ?? 0),
    teamWins: Number(row.team_wins_non_cancelled ?? 0),
    mvpCount: Number(row.mvps_non_cancelled ?? 0),
    tierBreakdown: row.tier_breakdown_non_cancelled ?? [],
  };
}

function sortRows(rows: CareerStatsRow[], scope: Scope) {
  return [...rows].sort((a, b) => {
    const aMetrics = scopedMetrics(a, scope);
    const bMetrics = scopedMetrics(b, scope);
    if (bMetrics.totalPoints !== aMetrics.totalPoints) {
      return bMetrics.totalPoints - aMetrics.totalPoints;
    }

    if (bMetrics.pointsPerShot !== aMetrics.pointsPerShot) {
      return bMetrics.pointsPerShot - aMetrics.pointsPerShot;
    }

    return a.name.localeCompare(b.name);
  });
}

export default function StatsPage() {
  const { client, error: envError } = useSupabaseMemo();
  const [rows, setRows] = useState<CareerStatsRow[]>([]);
  const [statusScope, setStatusScope] = useState<Scope>("active_completed");
  const [searchTerm, setSearchTerm] = useState("");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const fetchStats = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setStatus("Loading stats...");

    let query = client.from("v_player_career_stats").select("*");
    if (!includeHidden) {
      query = query.eq("is_hidden", false);
    }
    if (searchTerm.trim()) {
      query = query.ilike("name", `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      setStatus("Unable to load player analytics. Check Supabase credentials and RLS policies.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(sortRows(data as CareerStatsRow[], statusScope));
    setStatus("");
    setLoading(false);
  }, [client, includeHidden, searchTerm, statusScope]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setRows((current) => sortRows(current, statusScope));
  }, [statusScope]);

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
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-300">Player analytics</p>
            <h1 className="text-4xl font-bold text-emerald-100">Cross-season stats</h1>
            <p className="text-sm text-slate-300">
              Totals, efficiency, wins, MVPs, and tier history across completed and active seasons.
            </p>
          </div>
          <div className="text-right text-slate-200">
            <p className="text-xs uppercase text-emerald-300">Scope</p>
            <p className="text-sm text-slate-300">
              {scopeOptions.find((option) => option.value === statusScope)?.description ?? "All seasons"}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300" htmlFor="player-search">
              Search by player name
            </label>
            <input
              id="player-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Start typing..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              type="text"
            />
            <p className="text-xs text-slate-500">Filters apply server-side to avoid large payloads.</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-slate-300">Season status scope</span>
            <div className="flex gap-2">
              {scopeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusScope(option.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition
                    ${
                      statusScope === option.value
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                        : "border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400/40"
                    }`}
                  type="button"
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-slate-400">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 justify-end">
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-400"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
              />
              Include hidden players
            </label>
            <p className="text-xs text-slate-500">Default view hides players flagged as hidden.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/60 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm text-slate-300">
            <div>{loading ? "Loading player stats..." : status || `${rows.length} players`}</div>
            <div className="text-xs text-slate-500">Voided shots are automatically excluded.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Player</th>
                  <th className="px-4 py-3 text-left font-semibold">Total Points</th>
                  <th className="px-4 py-3 text-left font-semibold">Total Shots</th>
                  <th className="px-4 py-3 text-left font-semibold">PPS</th>
                  <th className="px-4 py-3 text-left font-semibold">Seasons</th>
                  <th className="px-4 py-3 text-left font-semibold">Team Wins</th>
                  <th className="px-4 py-3 text-left font-semibold">MVPs</th>
                  <th className="px-4 py-3 text-left font-semibold">Tier Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-300">
                      No players found for the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const metrics = scopedMetrics(row, statusScope);
                    return (
                      <tr key={row.player_id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-emerald-100">{row.name}</span>
                            {row.is_hidden && <span className="text-xs text-yellow-400">Hidden</span>}
                            {row.last_shot_at && (
                              <span className="text-xs text-slate-500">Last shot: {new Date(row.last_shot_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-100">{metrics.totalPoints}</td>
                        <td className="px-4 py-3 text-slate-200">{metrics.totalShots}</td>
                        <td className="px-4 py-3 text-slate-200">{metrics.pointsPerShot.toFixed(3)}</td>
                        <td className="px-4 py-3 text-slate-200">{metrics.seasonsPlayed}</td>
                        <td className="px-4 py-3 text-slate-200">{metrics.teamWins}</td>
                        <td className="px-4 py-3 text-slate-200">{metrics.mvpCount}</td>
                        <td className="px-4 py-3 text-slate-100">
                          <div className="flex flex-wrap gap-2">
                            {metrics.tierBreakdown.length === 0 ? (
                              <span className="text-xs text-slate-500">No tier history</span>
                            ) : (
                              metrics.tierBreakdown.map((tier) => (
                                <span
                                  key={`${row.player_id}-${tier.tier_id}-${tier.tier_name}`}
                                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                                  style={{
                                    borderColor: tier.color,
                                    color: tier.color,
                                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                                  }}
                                >
                                  <span className="font-semibold">{tier.tier_name}</span>
                                  <span className="text-slate-200" style={{ color: "inherit" }}>
                                    {tier.points} pts / {tier.shots} shots ({Number(tier.pps ?? 0).toFixed(2)})
                                  </span>
                                  <span className="text-slate-400" style={{ color: "inherit" }}>
                                    {tier.seasons} season{tier.seasons === 1 ? "" : "s"}
                                  </span>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
