"use client";

import { useState } from "react";

const tables = ["leagues","profiles","league_memberships","seasons","teams","tiers","players","season_players","season_player_assignments","season_player_allowance_events","season_player_stats","season_team_stats","season_results","season_awards","player_xp_awards","player_career_stats","season_teams","season_tiers","bottle_types","dice_sets","dice_set_faces","shot_events"];

export default function DataIntegrityPage() {
  const [table, setTable] = useState("teams");
  const [payload, setPayload] = useState("{}");

  async function submit() {
    const res = await fetch("/api/admin/table-write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table, payload: JSON.parse(payload) }) });
    const data = await res.json();
    alert(JSON.stringify(data));
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Database Integrity Workspace</h1>
      <p className="text-sm text-slate-300">Use this page for controlled admin corrections across every table.</p>
      <div className="rounded border border-slate-800 p-4">
        <h2 className="mb-2 font-medium">Table Coverage</h2>
        <ul className="grid gap-1 text-xs md:grid-cols-2">
          {tables.map((t) => <li key={t}>• {t}</li>)}
        </ul>
      </div>
      <div className="space-y-2 rounded border border-slate-800 p-4">
        <select className="rounded bg-slate-800 p-2" value={table} onChange={(e) => setTable(e.target.value)}>{tables.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <textarea className="h-40 w-full rounded bg-slate-800 p-2 text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} />
        <button className="rounded bg-amber-600 px-3 py-2" onClick={submit}>Insert record</button>
      </div>
    </section>
  );
}
