"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";
import {
  loadLeagueContext,
  loadSeasons,
  loadSeasonPlayers,
  loadShotEvents,
  loadTiers,
  type Season,
  type SeasonPlayer,
  type ShotEvent,
  type Tier,
} from "@/src/lib/db/gameLoop";

type PlayerWithTier = SeasonPlayer & {
  tier_name: string;
  tier_sort_order: number;
};

export default function AdminClientPage() {
  const { client, error: envError } = useMemo(() => getSupabaseClient(), []);

  const [status, setStatus] = useState("Loading admin page...");
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [players, setPlayers] = useState<PlayerWithTier[]>([]);
  const [shotEvents, setShotEvents] = useState<ShotEvent[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTier | null>(null);

  const toUserMessage = (errorText?: string | null) => {
    if (!errorText) return "Unable to load admin data.";
    if (errorText.toLowerCase().includes("failed to fetch") || errorText.toLowerCase().includes("typeerror")) {
      return "Unable to connect to Supabase right now. Check your NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and network access.";
    }
    return errorText;
  };

  const loadAdminData = useCallback(async () => {
    if (!client) return;

    try {
      const { data: leagueContext, error: leagueError } = await loadLeagueContext(client);
    if (leagueError || !leagueContext) {
      setStatus(toUserMessage(leagueError));
      return;
    }

    const [seasonsRes, seasonTiersRes] = await Promise.all([
      loadSeasons(client, leagueContext.leagueId),
      loadTiers(client, leagueContext.leagueId),
    ]);

    if (seasonsRes.error || seasonTiersRes.error) {
      setStatus(toUserMessage(seasonsRes.error?.message ?? seasonTiersRes.error?.message));
      return;
    }

    const seasons = (seasonsRes.data ?? []) as Season[];
    const active = seasons.find((season) => season.status === "active") ?? null;
    if (!active) {
      setActiveSeason(null);
      setPlayers([]);
      setShotEvents([]);
      setStatus("No active season found.");
      return;
    }

    const tiers = (seasonTiersRes.data ?? []) as Tier[];
    const tierById = new Map(tiers.map((tier) => [tier.id, tier]));

    const [seasonPlayersRes, shotEventsRes] = await Promise.all([
      loadSeasonPlayers(client, active.id),
      loadShotEvents(client, active.id),
    ]);

    if (seasonPlayersRes.error || shotEventsRes.error) {
      setStatus(toUserMessage(seasonPlayersRes.error?.message ?? shotEventsRes.error?.message));
      return;
    }

    const mappedPlayers: PlayerWithTier[] = (
      (seasonPlayersRes.data ?? []) as Array<{
        id: string;
        player_id: string;
        team_id: string | null;
        tier_id: string;
        shots_cap_initial: number;
        shots_remaining: number;
        is_enabled: boolean;
        players: { display_name: string | null } | { display_name: string | null }[];
      }>
    )
      .map((row) => {
        const player = Array.isArray(row.players) ? row.players[0] : row.players;
        const tier = tierById.get(row.tier_id);
        return {
          id: row.id,
          player_id: row.player_id,
          player_name: player?.display_name ?? "Player",
          team_id: row.team_id,
          tier_id: row.tier_id,
          shots_cap_initial: row.shots_cap_initial,
          shots_remaining: row.shots_remaining,
          is_enabled: row.is_enabled,
          tier_name: tier?.name ?? "Unknown tier",
          tier_sort_order: tier?.sort_order ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort(
        (a, b) =>
          a.tier_sort_order - b.tier_sort_order ||
          a.tier_name.localeCompare(b.tier_name) ||
          a.player_name.localeCompare(b.player_name),
      );

    setActiveSeason(active);
    setPlayers(mappedPlayers);
    setShotEvents((shotEventsRes.data ?? []) as ShotEvent[]);
    setStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load admin data.";
      setStatus(toUserMessage(message));
    }
  }, [client]);

  useEffect(() => {
    if (!client) return;
    void loadAdminData();
  }, [client, loadAdminData]);

  const selectedPlayerShots = useMemo(
    () => shotEvents.filter((shot) => shot.season_player_id === selectedPlayer?.id),
    [selectedPlayer, shotEvents],
  );

  if (envError) {
    return <section className="rounded-xl border border-red-500/40 bg-red-900/30 p-4 text-red-100">{envError}</section>;
  }

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-200">Admin</h1>
          <p className="text-sm text-slate-300">{activeSeason ? `Current season: ${activeSeason.name}` : "Current season unavailable"}</p>
        </div>
        <button type="button" onClick={() => void loadAdminData()} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800">Refresh</button>
      </header>

      {status && <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">{status}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-300">Recent shot history</h2>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70">
            <ul className="divide-y divide-slate-800 text-sm">
              {shotEvents.map((shot) => {
                const playerName = players.find((player) => player.id === shot.season_player_id)?.player_name ?? "Player";
                return (
                  <li key={shot.id} className="px-3 py-2 text-slate-200">
                    <span className="font-medium text-slate-100">{playerName}</span>
                    <span className="text-slate-400"> · Shot {shot.shot_number} · {shot.points_awarded} pts</span>
                  </li>
                );
              })}
              {shotEvents.length === 0 && <li className="px-3 py-4 text-slate-400">No shots yet.</li>}
            </ul>
          </div>
        </article>

        <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-300">Current players by tier</h2>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70">
            <ul className="divide-y divide-slate-800 text-sm">
              {players.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(player)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-800/70"
                  >
                    <span className="font-medium text-slate-100">{player.player_name}</span>
                    <span className="text-slate-400">{player.tier_name}</span>
                  </button>
                </li>
              ))}
              {players.length === 0 && <li className="px-3 py-4 text-slate-400">No active players in this season.</li>}
            </ul>
          </div>
        </article>
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-emerald-200">{selectedPlayer.player_name}</h3>
                <p className="text-sm text-slate-300">{selectedPlayer.tier_name} shooting history</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70">
              <ul className="divide-y divide-slate-800 text-sm">
                {selectedPlayerShots.map((shot) => (
                  <li key={shot.id} className="px-3 py-2 text-slate-200">
                    Shot {shot.shot_number} · {shot.points_awarded} pts
                    {shot.is_double ? " · double" : ""}
                    {shot.is_moneyball ? " · moneyball" : ""}
                  </li>
                ))}
                {selectedPlayerShots.length === 0 && <li className="px-3 py-4 text-slate-400">No shots recorded for this player.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
