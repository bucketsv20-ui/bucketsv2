"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Database } from "@/src/types/database";

type ShotEvent = Database["public"]["Tables"]["shot_events"]["Row"];
type OnboardingData = {
  shotEvents: ShotEvent[];
  seasonPlayers: Database["public"]["Tables"]["season_players"]["Row"][];
  playerStats: Database["public"]["Tables"]["season_player_stats"]["Row"][];
};

type ContextMenuState = {
  shot: ShotEvent;
  x: number;
  y: number;
} | null;

async function loadShots(seasonId: string): Promise<OnboardingData> {
  const res = await fetch(`/api/onboarding?seasonId=${seasonId}`);
  if (!res.ok) throw new Error("Failed to load shots.");
  return res.json();
}

export default function ScoreboardPage({ params }: { params: { seasonId: string; leagueId: string } }) {
  const [form, setForm] = useState({ season_player_id: "", tier_id: "", selected_die: 1, base_points: 1 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [shotToDelete, setShotToDelete] = useState<ShotEvent | null>(null);
  const [isMutatingShot, setIsMutatingShot] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const shots = useQuery({ queryKey: ["shots", params.seasonId], queryFn: () => loadShots(params.seasonId), refetchInterval: 3000 });

  async function submitShot() {
    await fetch("/api/shot-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, league_id: params.leagueId, season_id: params.seasonId, is_double: false, is_moneyball: false }),
    });
    shots.refetch();
  }

  async function mutateShot(shot: ShotEvent, method: "DELETE" | "PATCH") {
    setIsMutatingShot(true);
    setMutationError(null);

    const res = await fetch("/api/shot-events", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: shot.id }),
    });
    const payload = await res.json();

    if (!res.ok) {
      setMutationError(payload.error ?? "Failed to update shot.");
      setIsMutatingShot(false);
      return;
    }

    setContextMenu(null);
    setShotToDelete(null);
    await shots.refetch();
    setIsMutatingShot(false);
  }

  function openShotContextMenu(event: React.MouseEvent, shot: ShotEvent) {
    event.preventDefault();
    setMutationError(null);
    setContextMenu({ shot, x: event.clientX, y: event.clientY });
  }

  return (
    <section className="space-y-4" onClick={() => setContextMenu(null)}>
      <h1 className="text-2xl font-semibold">Realtime Scoreboard</h1>
      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded bg-slate-800 p-2" placeholder="season_player_id" onChange={(e) => setForm({ ...form, season_player_id: e.target.value })} />
        <input className="rounded bg-slate-800 p-2" placeholder="tier_id" onChange={(e) => setForm({ ...form, tier_id: e.target.value })} />
        <input className="rounded bg-slate-800 p-2" type="number" min={1} max={6} onChange={(e) => setForm({ ...form, selected_die: Number(e.target.value) })} />
        <button className="rounded bg-emerald-600 px-3 py-2" onClick={submitShot}>Log Shot</button>
      </div>

      {mutationError ? <div className="rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">{mutationError}</div> : null}

      <div className="rounded border border-slate-800">
        <div className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200">Shot History</div>
        <div className="divide-y divide-slate-800 text-sm">
          {shots.data?.shotEvents.map((shot) => (
            <div
              key={shot.id}
              className="grid cursor-context-menu grid-cols-2 gap-3 px-3 py-2 hover:bg-slate-800/70 md:grid-cols-6"
              onContextMenu={(event) => openShotContextMenu(event, shot)}
            >
              <span className="font-medium text-white">#{shot.shot_number}</span>
              <span>{shot.points_awarded} pts</span>
              <span>{shot.base_points > 1 ? "Make" : "Miss"}</span>
              <span>Shot streak: {shot.shot_streak ?? 0}</span>
              <span>Point streak: {shot.point_streak ?? 0}</span>
              <span className="text-slate-400">{new Date(shot.occurred_at).toLocaleString()}</span>
            </div>
          )) ?? <div className="px-3 py-2 text-slate-400">Loading shots...</div>}
        </div>
      </div>

      <pre className="overflow-auto rounded border border-slate-800 p-3 text-xs">{JSON.stringify(shots.data, null, 2)}</pre>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-36 overflow-hidden rounded border border-slate-700 bg-slate-950 py-1 text-sm shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="block w-full px-3 py-2 text-left text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isMutatingShot}
            onClick={() => mutateShot(contextMenu.shot, "PATCH")}
          >
            Undo shot
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-red-200 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isMutatingShot}
            onClick={() => {
              setShotToDelete(contextMenu.shot);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}

      {shotToDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded border border-slate-700 bg-slate-950 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Delete shot?</h2>
            <p className="mt-2 text-sm text-slate-300">
              This permanently deletes shot #{shotToDelete.shot_number} and recalculates the affected player and team totals.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded border border-slate-700 px-3 py-2 text-sm" disabled={isMutatingShot} onClick={() => setShotToDelete(null)}>
                Cancel
              </button>
              <button className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isMutatingShot} onClick={() => mutateShot(shotToDelete, "DELETE")}>
                {isMutatingShot ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
