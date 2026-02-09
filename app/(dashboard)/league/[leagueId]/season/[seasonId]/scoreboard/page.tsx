"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

async function loadShots(seasonId: string) {
  const res = await fetch(`/api/onboarding?seasonId=${seasonId}`);
  return res.json();
}

export default function ScoreboardPage({ params }: { params: { seasonId: string; leagueId: string } }) {
  const [form, setForm] = useState({ season_player_id: "", tier_id: "", selected_die: 1, base_points: 1 });
  const shots = useQuery({ queryKey: ["shots", params.seasonId], queryFn: () => loadShots(params.seasonId), refetchInterval: 3000 });

  async function submitShot() {
    await fetch("/api/shot-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, league_id: params.leagueId, season_id: params.seasonId, is_double: false, is_moneyball: false }),
    });
    shots.refetch();
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Realtime Scoreboard</h1>
      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded bg-slate-800 p-2" placeholder="season_player_id" onChange={(e) => setForm({ ...form, season_player_id: e.target.value })} />
        <input className="rounded bg-slate-800 p-2" placeholder="tier_id" onChange={(e) => setForm({ ...form, tier_id: e.target.value })} />
        <input className="rounded bg-slate-800 p-2" type="number" min={1} max={6} onChange={(e) => setForm({ ...form, selected_die: Number(e.target.value) })} />
        <button className="rounded bg-emerald-600 px-3 py-2" onClick={submitShot}>Log Shot</button>
      </div>
      <pre className="overflow-auto rounded border border-slate-800 p-3 text-xs">{JSON.stringify(shots.data, null, 2)}</pre>
    </section>
  );
}
