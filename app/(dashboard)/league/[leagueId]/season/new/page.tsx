"use client";

import { useMemo, useState } from "react";

type DraftPlayer = {
  display_name: string;
  short_name: string;
  team_name: string;
  tier_name: string;
  shots_cap_initial: number;
};

const defaultRules = {
  format: "team",
  is_ranked: false,
  is_official: true,
  season_shot_cap: 100,
  monthly_limit_enabled: false,
  monthly_shot_cap: 0,
  weekly_ceiling_decrease_enabled: false,
  weekly_ceiling_decrease_by: 0,
  monthly_ceiling_decrease_enabled: false,
  monthly_ceiling_decrease_by: 0,
  rules_json: "{}",
};

export default function NewSeasonPage({ params }: { params: { leagueId: string } }) {
  const [seasonName, setSeasonName] = useState("");
  const [teamsText, setTeamsText] = useState("Falcons\nSharks\nWolves");
  const [tiersText, setTiersText] = useState("A,1.25\nB,1\nC,0.75");
  const [playersText, setPlayersText] = useState("Jane Doe,JD,Falcons,A,100\nSam Kim,SK,Sharks,B,100");
  const [rules, setRules] = useState(defaultRules);
  const [status, setStatus] = useState<string>("");

  const parsedPreview = useMemo(() => {
    const teams = teamsText
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, is_free_agent: false }));

    const tiers = tiersText
      .split("\n")
      .map((line, i) => {
        const [name, multiplier] = line.split(",").map((v) => v.trim());
        return { name, sort_order: i, xp_multiplier: Number(multiplier || 1) };
      })
      .filter((tier) => tier.name);

    const players = playersText
      .split("\n")
      .map((line) => {
        const [display_name, short_name, team_name, tier_name, shotCap] = line.split(",").map((v) => v.trim());
        return {
          display_name,
          short_name,
          team_name,
          tier_name,
          shots_cap_initial: Number(shotCap || rules.season_shot_cap),
        } satisfies DraftPlayer;
      })
      .filter((player) => player.display_name && player.tier_name);

    return { teams, tiers, players };
  }, [playersText, rules.season_shot_cap, teamsText, tiersText]);

  async function submit() {
    setStatus("Creating season...");

    const res = await fetch("/api/seasons/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: params.leagueId,
        season_name: seasonName,
        season_rules: {
          format: rules.format,
          is_ranked: rules.is_ranked,
          is_official: rules.is_official,
          season_shot_cap: Number(rules.season_shot_cap),
          monthly_limit_enabled: rules.monthly_limit_enabled,
          monthly_shot_cap: rules.monthly_limit_enabled ? Number(rules.monthly_shot_cap) : null,
          weekly_ceiling_decrease_enabled: rules.weekly_ceiling_decrease_enabled,
          weekly_ceiling_decrease_by: rules.weekly_ceiling_decrease_enabled ? Number(rules.weekly_ceiling_decrease_by) : null,
          monthly_ceiling_decrease_enabled: rules.monthly_ceiling_decrease_enabled,
          monthly_ceiling_decrease_by: rules.monthly_ceiling_decrease_enabled ? Number(rules.monthly_ceiling_decrease_by) : null,
          rules_json: JSON.parse(rules.rules_json || "{}"),
        },
        teams: parsedPreview.teams,
        tiers: parsedPreview.tiers,
        players: parsedPreview.players,
      }),
    });

    const body = await res.json();
    setStatus(res.ok ? `Created! ${JSON.stringify(body.summary)}` : `Failed: ${JSON.stringify(body)}`);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Create Season (End-to-End)</h1>
      <p className="text-sm text-slate-300">Populate teams, tiers, players, and assignments in one submit.</p>

      <input
        className="w-full rounded bg-slate-800 p-2"
        placeholder="Season name"
        value={seasonName}
        onChange={(e) => setSeasonName(e.target.value)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Season shot cap</span>
          <input className="w-full rounded bg-slate-800 p-2" type="number" value={rules.season_shot_cap} onChange={(e) => setRules({ ...rules, season_shot_cap: Number(e.target.value) })} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Format</span>
          <select className="w-full rounded bg-slate-800 p-2" value={rules.format} onChange={(e) => setRules({ ...rules, format: e.target.value })}>
            <option value="team">team</option>
            <option value="ffa">ffa</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm">Teams (one per line)</span>
          <textarea className="h-40 w-full rounded bg-slate-800 p-2 text-sm" value={teamsText} onChange={(e) => setTeamsText(e.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm">Tiers (name,xp_multiplier)</span>
          <textarea className="h-40 w-full rounded bg-slate-800 p-2 text-sm" value={tiersText} onChange={(e) => setTiersText(e.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm">Players (display,short,team,tier,shot_cap)</span>
          <textarea className="h-40 w-full rounded bg-slate-800 p-2 text-sm" value={playersText} onChange={(e) => setPlayersText(e.target.value)} />
        </label>
      </div>

      <button className="rounded bg-emerald-600 px-3 py-2" onClick={submit}>Create Season Bundle</button>
      <p className="text-sm text-slate-200">{status}</p>

      <pre className="overflow-auto rounded border border-slate-800 p-3 text-xs">{JSON.stringify(parsedPreview, null, 2)}</pre>
    </section>
  );
}
