"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";
import { loadRecentShots, resolveShotInputContext, submitShotEvent, type ShotInputContext } from "@/src/lib/db/shotInput";

type RecentShot = {
  id: string;
  shot_number: number;
  selected_die: number;
  base_points: number;
  is_double: boolean;
  is_moneyball: boolean;
  points_awarded: number;
  occurred_at: string;
};

export default function AdminClientPage() {
  const { client, error: envError } = useMemo(() => getSupabaseClient(), []);
  const [context, setContext] = useState<ShotInputContext | null>(null);
  const [selectedDie, setSelectedDie] = useState(1);
  const [basePoints, setBasePoints] = useState<1 | 2 | 4 | 8>(1);
  const [isDouble, setIsDouble] = useState(false);
  const [isMoneyball, setIsMoneyball] = useState(false);
  const [recentShots, setRecentShots] = useState<RecentShot[]>([]);
  const [status, setStatus] = useState("Loading current context...");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!client) return;

    const { context: nextContext, error } = await resolveShotInputContext(client);
    if (error || !nextContext) {
      setContext(null);
      setRecentShots([]);
      setStatus(error ?? "Unable to resolve current shot context.");
      return;
    }

    setContext(nextContext);
    const { data: shotRows, error: shotsError } = await loadRecentShots(client, nextContext.seasonPlayer.id);
    if (shotsError) {
      setStatus(`Context loaded, but failed to load recent shots: ${shotsError.message}`);
      return;
    }

    setRecentShots((shotRows ?? []) as RecentShot[]);
    setStatus("");
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!client || !context) return;

    const channel = client
      .channel(`shot-input-${context.seasonPlayer.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shot_events",
          filter: `season_player_id=eq.${context.seasonPlayer.id}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, context, refresh]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !context) return;

    setSaving(true);
    setStatus("Saving shot...");

    const { error } = await submitShotEvent(client, context, {
      selectedDie,
      basePoints,
      isDouble,
      isMoneyball,
    });

    if (error) {
      setStatus(error);
      setSaving(false);
      return;
    }

    setStatus("Shot saved.");
    setSaving(false);
    await refresh();
  }

  if (envError) {
    return <div className="rounded-lg border border-red-500 p-4 text-red-200">{envError}</div>;
  }

  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-emerald-200">Shot Input</h1>
        <p className="text-sm text-slate-300">Minimal v2 flow for submitting a shot into the new schema.</p>
        <p className="text-xs text-slate-400">
          Next steps: season setup, standings, stats, and history will build on this shared context pattern.
        </p>
      </header>

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-200">
        <h2 className="font-medium text-emerald-200">Current context</h2>
        {context ? (
          <ul className="mt-2 space-y-1">
            <li>League: {context.leagueId}</li>
            <li>Season: {context.season.name}</li>
            <li>Player: {context.player.displayName}</li>
            <li>Shots remaining: {context.seasonPlayer.shotsRemaining}</li>
          </ul>
        ) : (
          <p className="mt-2 text-amber-300">{status || "No context loaded."}</p>
        )}
      </section>

      <form onSubmit={onSubmit} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Selected die</span>
            <select className="w-full rounded border border-slate-700 bg-slate-900 p-2" value={selectedDie} onChange={(e) => setSelectedDie(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((die) => (
                <option key={die} value={die}>
                  {die}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Base points</span>
            <select className="w-full rounded border border-slate-700 bg-slate-900 p-2" value={basePoints} onChange={(e) => setBasePoints(Number(e.target.value) as 1 | 2 | 4 | 8)}>
              {[1, 2, 4, 8].map((points) => (
                <option key={points} value={points}>
                  {points}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-4 text-sm text-slate-300">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isDouble} onChange={(e) => setIsDouble(e.target.checked)} /> Double
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isMoneyball} onChange={(e) => setIsMoneyball(e.target.checked)} /> Moneyball
          </label>
        </div>

        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600"
          disabled={!context || saving || context.seasonPlayer.shotsRemaining <= 0}
        >
          {saving ? "Saving..." : "Submit shot"}
        </button>
      </form>

      {status && <p className="text-sm text-slate-300">{status}</p>}

      <section className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <h2 className="font-medium text-emerald-200">Recent shots</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {recentShots.map((shot) => (
            <li key={shot.id} className="rounded border border-slate-700 p-2">
              #{shot.shot_number} • die {shot.selected_die} • {shot.base_points}
              {shot.is_double ? " x2" : ""} = {shot.points_awarded} pts{shot.is_moneyball ? " • moneyball" : ""}
            </li>
          ))}
          {recentShots.length === 0 && <li className="text-slate-400">No shots yet.</li>}
        </ul>
      </section>

      <div className="flex gap-3 text-sm">
        <Link href="/standings" className="text-emerald-300 underline">
          Standings (existing page)
        </Link>
        <Link href="/history" className="text-emerald-300 underline">
          History (existing page)
        </Link>
      </div>
    </main>
  );
}
