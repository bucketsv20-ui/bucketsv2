"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";
import {
  loadActiveDiceFaces,
  loadActiveSeasonContext,
  loadRecentShots,
  loadSeasonPlayers,
  recordShot,
  subscribeToSeasonShotEvents,
  type ActiveSeasonContext,
  type DieFaceOption,
  type SeasonPlayerOption,
} from "@/src/lib/db/shotInput";

type RecentShot = {
  id: string;
  shot_number: number;
  selected_die: number;
  base_points: number;
  is_double: boolean;
  is_moneyball: boolean;
  is_waiver: boolean;
  points_awarded: number;
  occurred_at: string;
};

export default function AdminClientPage() {
  const { client, error: envError } = useMemo(() => getSupabaseClient(), []);
  const [context, setContext] = useState<ActiveSeasonContext | null>(null);
  const [seasonPlayers, setSeasonPlayers] = useState<SeasonPlayerOption[]>([]);
  const [selectedSeasonPlayerId, setSelectedSeasonPlayerId] = useState<string>("");
  const [diceFaces, setDiceFaces] = useState<DieFaceOption[]>([]);
  const [selectedDie, setSelectedDie] = useState(1);
  const [isDouble, setIsDouble] = useState(false);
  const [isWaiver, setIsWaiver] = useState(false);
  const [recentShots, setRecentShots] = useState<RecentShot[]>([]);
  const [status, setStatus] = useState("Loading shot input...");
  const [saving, setSaving] = useState(false);

  const selectedSeasonPlayer = seasonPlayers.find((row) => row.seasonPlayerId === selectedSeasonPlayerId) ?? null;
  const shotNumber = selectedSeasonPlayer ? selectedSeasonPlayer.shotsCapInitial - selectedSeasonPlayer.shotsRemaining + 1 : 1;
  const isMoneyball = shotNumber % 10 === 0;
  const selectedFace = diceFaces.find((face) => face.dieValue === selectedDie) ?? null;
  const basePoints = selectedFace ? selectedFace.baseScore * (isMoneyball ? 2 : 1) : 1;
  const calculatedScore = basePoints * (isDouble ? 2 : 1);

  const refresh = useCallback(async () => {
    if (!client) return;

    const { context: nextContext, error: contextError } = await loadActiveSeasonContext(client);
    if (contextError || !nextContext) {
      setContext(null);
      setSeasonPlayers([]);
      setSelectedSeasonPlayerId("");
      setStatus(contextError ?? "Unable to load season context.");
      return;
    }

    setContext(nextContext);

    const [{ data: players, error: playersError }, { data: faces, error: facesError }] = await Promise.all([
      loadSeasonPlayers(client, nextContext.seasonId),
      loadActiveDiceFaces(client, nextContext.leagueId, nextContext.seasonId),
    ]);

    if (playersError) {
      setStatus(`Failed to load season players: ${playersError.message}`);
      return;
    }
    if (facesError) {
      setStatus(`Failed to load dice mapping: ${facesError.message}`);
      return;
    }

    setSeasonPlayers(players);
    setDiceFaces(faces);
    setSelectedSeasonPlayerId((prev) => prev || players[0]?.seasonPlayerId || "");
    setSelectedDie((prev) => (faces.some((face) => face.dieValue === prev) ? prev : faces[0]?.dieValue ?? 1));
    setStatus("");
  }, [client]);

  const refreshRecentShots = useCallback(async () => {
    if (!client || !selectedSeasonPlayerId) return;
    const { data, error } = await loadRecentShots(client, selectedSeasonPlayerId);
    if (error) {
      setStatus(`Failed to load recent shots: ${error.message}`);
      return;
    }
    setRecentShots((data ?? []) as RecentShot[]);
  }, [client, selectedSeasonPlayerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshRecentShots();
  }, [refreshRecentShots]);

  useEffect(() => {
    if (!client || !context) return;

    const channel = subscribeToSeasonShotEvents(client, context.seasonId, () => {
      void refresh();
      void refreshRecentShots();
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, context, refresh, refreshRecentShots]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !selectedSeasonPlayer) return;

    setSaving(true);
    setStatus("Submitting shot...");

    const { error } = await recordShot(client, {
      seasonPlayerId: selectedSeasonPlayer.seasonPlayerId,
      selectedDie,
      isDouble,
      isWaiver,
    });

    if (error) {
      setStatus(error.includes("No shots remaining") ? "No shots remaining for this player." : error);
      setSaving(false);
      return;
    }

    setStatus("Shot recorded.");
    setSaving(false);
    await refresh();
    await refreshRecentShots();
  }

  if (envError) {
    return <div className="rounded-lg border border-red-500 p-4 text-red-200">{envError}</div>;
  }

  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-emerald-200">Shot Input</h1>
        <p className="text-sm text-slate-300">Submit one shot at a time for the active season. Moneyball auto-applies every 10th shot.</p>
      </header>

      <form onSubmit={onSubmit} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Player</span>
            <select
              className="w-full rounded border border-slate-700 bg-slate-900 p-2"
              value={selectedSeasonPlayerId}
              onChange={(e) => setSelectedSeasonPlayerId(e.target.value)}
            >
              {seasonPlayers.map((player) => (
                <option key={player.seasonPlayerId} value={player.seasonPlayerId}>
                  {player.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Die roll</span>
            <select className="w-full rounded border border-slate-700 bg-slate-900 p-2" value={selectedDie} onChange={(e) => setSelectedDie(Number(e.target.value))}>
              {diceFaces.map((face) => (
                <option key={face.dieValue} value={face.dieValue}>
                  {face.dieValue}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded border border-slate-800 p-3 text-sm text-slate-200">
          <div>
            <p className="text-slate-400">Shot #</p>
            <p className="font-semibold">{shotNumber}</p>
          </div>
          <div>
            <p className="text-slate-400">Moneyball</p>
            <p className="font-semibold">{isMoneyball ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-slate-400">Bottle</p>
            <p className="font-semibold">{selectedFace?.bottleTypeName ?? "-"}</p>
          </div>
          <div>
            <p className="text-slate-400">Base score</p>
            <p className="font-semibold">{selectedFace?.baseScore ?? "-"}</p>
          </div>
        </div>

        <div className="flex gap-4 text-sm text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isDouble} onChange={(e) => setIsDouble(e.target.checked)} /> Double
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isWaiver} onChange={(e) => setIsWaiver(e.target.checked)} /> Dash (Waiver)
          </label>
        </div>

        <p className="text-sm text-emerald-200">Calculated Score: {calculatedScore}</p>

        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600"
          disabled={!selectedSeasonPlayer || saving || selectedSeasonPlayer.shotsRemaining <= 0 || !selectedFace}
        >
          {saving ? "Saving..." : "Submit shot"}
        </button>
      </form>

      {context && selectedSeasonPlayer && (
        <p className="text-sm text-slate-300">
          Season: {context.seasonName} · Shots remaining: {selectedSeasonPlayer.shotsRemaining}
        </p>
      )}

      {status && <p className="text-sm text-slate-300">{status}</p>}

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <h2 className="font-medium text-emerald-200">Recent shots</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {recentShots.map((shot) => (
            <li key={shot.id} className="rounded border border-slate-700 p-2">
              #{shot.shot_number} • die {shot.selected_die} • {shot.base_points}
              {shot.is_double ? " x2" : ""} = {shot.points_awarded} pts
              {shot.is_moneyball ? " • moneyball" : ""}
              {shot.is_waiver ? " • waiver" : ""}
            </li>
          ))}
          {recentShots.length === 0 && <li className="text-slate-400">No shots yet.</li>}
        </ul>
      </section>
    </main>
  );
}
