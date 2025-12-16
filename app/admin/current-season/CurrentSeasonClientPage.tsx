"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, RefreshCcw, Save, Trash, UserPlus } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

const defaultPointsRules = {
  base_values: [0, 1, 2],
  multipliers: [1, 2],
  moneyball_every: 10,
};

type Season = {
  season_id: number;
  season_name: string;
};

type Tier = {
  tier_id: number;
  tier_name: string;
  color: string;
};

type Player = {
  player_id: number;
  name: string;
  is_hidden: boolean;
};

type SeasonTeam = {
  season_team_id: number;
  season_id: number;
  team_name: string;
  sort_order: number | null;
};

type RosterRow = {
  season_roster_id: number;
  player_id: number;
  player_name: string;
  season_team_id: number | null;
  team_name: string | null;
  tier_id: number | null;
  tier_name: string | null;
  shot_limit: number | null;
  is_active: boolean;
};

type PointsRules = typeof defaultPointsRules;

type SupabaseRosterRow = {
  season_roster_id: number;
  player_id: number;
  season_team_id: number | null;
  tier_id: number | null;
  shot_limit: number | null;
  is_active: boolean;
  players?: { name?: string | null } | null;
  season_teams?: { team_name?: string | null } | null;
  tiers?: { tier_name?: string | null } | null;
};

function useSupabaseMemo() {
  return useMemo(() => getSupabaseClient(), []);
}

export default function CurrentSeasonClientPage() {
  const { client, error: envError } = useSupabaseMemo();
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [pointsRules, setPointsRules] = useState<PointsRules>(defaultPointsRules);

  const [statusMessage, setStatusMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"roster" | "teams" | "tiers" | "points">("roster");

  const [rosterPlayerId, setRosterPlayerId] = useState<number | "">("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [rosterTeamId, setRosterTeamId] = useState<number | "">("");
  const [rosterTierId, setRosterTierId] = useState<number | "">("");
  const [rosterShotLimit, setRosterShotLimit] = useState<number | "">("");

  const [newTeamName, setNewTeamName] = useState("");

  const [tierEdits, setTierEdits] = useState<Record<number, { name: string; color: string }>>({});

  const [baseValuesInput, setBaseValuesInput] = useState("0,1,2");
  const [multipliersInput, setMultipliersInput] = useState("1,2");
  const [moneyballInput, setMoneyballInput] = useState("10");

  const loadTiers = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client.from("tiers").select("tier_id, tier_name, color").order("tier_id", { ascending: true });
    if (!error && data) {
      setTiers(data as Tier[]);
      const edits: Record<number, { name: string; color: string }> = {};
      (data as Tier[]).forEach((tier) => {
        edits[tier.tier_id] = { name: tier.tier_name, color: tier.color };
      });
      setTierEdits(edits);
    }
  }, [client]);

  const loadPlayers = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client
      .from("players")
      .select("player_id, name, is_hidden")
      .order("player_id", { ascending: true });

    if (!error && data) {
      setPlayers(data as Player[]);
    }
  }, [client]);

  const loadTeams = useCallback(
    async (seasonId: number) => {
      if (!client) return;
      const { data, error } = await client
        .from("season_teams")
        .select("season_team_id, season_id, team_name, sort_order")
        .eq("season_id", seasonId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("team_name", { ascending: true });

      if (!error && data) {
        setSeasonTeams(data as SeasonTeam[]);
      }
    },
    [client],
  );

  const loadRoster = useCallback(
    async (seasonId: number) => {
      if (!client) return;
      const { data, error } = await client
        .from("season_roster")
        .select(
          "season_roster_id, player_id, season_team_id, tier_id, shot_limit, is_active, players(name), season_teams(team_name), tiers(tier_name)",
        )
        .eq("season_id", seasonId)
        .order("season_roster_id", { ascending: true });

      if (!error && data) {
        const mapped = (data as SupabaseRosterRow[]).map((row) => ({
          season_roster_id: row.season_roster_id,
          player_id: row.player_id,
          season_team_id: row.season_team_id,
          tier_id: row.tier_id,
          shot_limit: row.shot_limit,
          is_active: row.is_active,
          player_name: row.players?.name ?? "Player",
          team_name: row.season_teams?.team_name ?? null,
          tier_name: row.tiers?.tier_name ?? null,
        }));
        setRoster(mapped);
      }
    },
    [client],
  );

  const refreshSeasonSettings = useCallback(
    async (seasonId: number) => {
      if (!client) return;
      const { data, error } = await client
        .from("season_settings")
        .select("points_rules")
        .eq("season_id", seasonId)
        .maybeSingle();

      if (error || !data || !data.points_rules) {
        setPointsRules(defaultPointsRules);
        setBaseValuesInput(defaultPointsRules.base_values.join(","));
        setMultipliersInput(defaultPointsRules.multipliers.join(","));
        setMoneyballInput((defaultPointsRules.moneyball_every ?? 10).toString());
        return;
      }

      const rules = data.points_rules as PointsRules;
      const allowedBaseValues = rules.base_values?.filter((value) => [0, 1, 2].includes(value));
      const allowedMultipliers = rules.multipliers?.filter((value) => [1, 2].includes(value));

      setPointsRules({
        base_values: allowedBaseValues?.length ? allowedBaseValues : defaultPointsRules.base_values,
        multipliers: allowedMultipliers?.length ? allowedMultipliers : defaultPointsRules.multipliers,
        moneyball_every: rules.moneyball_every ?? defaultPointsRules.moneyball_every,
      });
      setBaseValuesInput((allowedBaseValues?.length ? allowedBaseValues : defaultPointsRules.base_values).join(","));
      setMultipliersInput((allowedMultipliers?.length ? allowedMultipliers : defaultPointsRules.multipliers).join(","));
      setMoneyballInput((rules.moneyball_every ?? defaultPointsRules.moneyball_every).toString());
    },
    [client],
  );

  const loadActiveSeason = useCallback(async () => {
    if (!client) return;
    setStatusMessage("Loading active season...");
    const { data, error } = await client
      .from("seasons")
      .select("season_id, season_name")
      .eq("status", "active")
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setActiveSeason(null);
      setStatusMessage("No active season found. Configure one in Next Season Settings.");
      return;
    }

    setActiveSeason(data as Season);
    setStatusMessage("");
    await Promise.all([
      loadTiers(),
      loadPlayers(),
      loadTeams(data.season_id),
      loadRoster(data.season_id),
      refreshSeasonSettings(data.season_id),
    ]);
  }, [client, loadPlayers, loadRoster, loadTeams, loadTiers, refreshSeasonSettings]);

  useEffect(() => {
    if (!client) return;
    loadActiveSeason();
  }, [client, loadActiveSeason]);

  useEffect(() => {
    if (players.length > 0 && rosterPlayerId === "") {
      setRosterPlayerId(players[0].player_id);
    }
  }, [players, rosterPlayerId]);

  useEffect(() => {
    if (tiers.length > 0 && rosterTierId === "") {
      setRosterTierId(tiers[0].tier_id);
    }
  }, [tiers, rosterTierId]);

  useEffect(() => {
    if (seasonTeams.length > 0 && rosterTeamId === "") {
      setRosterTeamId(seasonTeams[0].season_team_id);
    }
  }, [seasonTeams, rosterTeamId]);

  const handleAddPlayerToSeason = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !activeSeason) return;

    const shotLimitValue = rosterShotLimit === "" ? null : Number(rosterShotLimit);
    let playerId: number | null = rosterPlayerId === "" ? null : Number(rosterPlayerId);

    setLoading(true);
    setStatusMessage("Saving roster entry...");

    if (!playerId && newPlayerName.trim()) {
      const { data: newPlayer, error: playerError } = await client
        .from("players")
        .insert({ name: newPlayerName.trim(), is_hidden: false })
        .select("player_id")
        .single();

      if (playerError || !newPlayer) {
        setStatusMessage(playerError?.message ?? "Unable to create player.");
        setLoading(false);
        return;
      }
      playerId = newPlayer.player_id;
      await loadPlayers();
    }

    if (!playerId) {
      setStatusMessage("Select or create a player first.");
      setLoading(false);
      return;
    }

    const { error } = await client.from("season_roster").upsert(
      {
        season_id: activeSeason.season_id,
        player_id: playerId,
        season_team_id: rosterTeamId === "" ? null : Number(rosterTeamId),
        tier_id: rosterTierId === "" ? null : Number(rosterTierId),
        shot_limit: shotLimitValue,
        is_active: true,
      },
      { onConflict: "season_id,player_id" },
    );

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Roster entry saved.");
      setNewPlayerName("");
      await loadRoster(activeSeason.season_id);
    }
    setLoading(false);
  };

  const updateRosterEntry = useCallback(
    async (seasonRosterId: number, updates: Partial<Pick<RosterRow, "season_team_id" | "tier_id" | "shot_limit" | "is_active">>) => {
      if (!client) return;
      const { error } = await client.from("season_roster").update(updates).eq("season_roster_id", seasonRosterId);
      if (error) {
        setStatusMessage(error.message);
      }
    },
    [client],
  );

  const handleDeleteTeam = async (teamId: number) => {
    if (!client || !activeSeason) return;
    const { count, error: countError } = await client
      .from("season_roster")
      .select("season_roster_id", { count: "exact", head: true })
      .eq("season_id", activeSeason.season_id)
      .eq("season_team_id", teamId);

    if (countError) {
      setStatusMessage(countError.message);
      return;
    }

    if ((count ?? 0) > 0) {
      setStatusMessage("Cannot delete a team with assigned players. Move them first.");
      return;
    }

    const { error } = await client.from("season_teams").delete().eq("season_team_id", teamId);
    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Team deleted.");
      await loadTeams(activeSeason.season_id);
    }
  };

  const handleAddTeam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !activeSeason || !newTeamName.trim()) return;
    setLoading(true);
    const nextSort = seasonTeams.reduce((max, team) => Math.max(max, team.sort_order ?? 0), 0) + 1;
    const { error } = await client.from("season_teams").insert({
      season_id: activeSeason.season_id,
      team_name: newTeamName.trim(),
      sort_order: nextSort,
    });

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Team added.");
      setNewTeamName("");
      await loadTeams(activeSeason.season_id);
    }
    setLoading(false);
  };

  const handleRenameTeam = async (teamId: number, name: string) => {
    if (!client) return;
    const { error } = await client.from("season_teams").update({ team_name: name }).eq("season_team_id", teamId);
    if (error) {
      setStatusMessage(error.message);
    } else if (activeSeason) {
      await loadTeams(activeSeason.season_id);
    }
  };

  const persistTeamOrder = useCallback(
    async (ordered: SeasonTeam[]) => {
      if (!client) return;
      await Promise.all(
        ordered.map((team, index) =>
          client.from("season_teams").update({ sort_order: index + 1 }).eq("season_team_id", team.season_team_id),
        ),
      );
    },
    [client],
  );

  const moveTeam = async (teamId: number, direction: "up" | "down") => {
    const currentIndex = seasonTeams.findIndex((team) => team.season_team_id === teamId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= seasonTeams.length) return;

    const next = [...seasonTeams];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistTeamOrder(next);
    setSeasonTeams(next);
  };

  const handleTierChange = (tierId: number, field: "name" | "color", value: string) => {
    setTierEdits((prev) => ({
      ...prev,
      [tierId]: {
        name: field === "name" ? value : prev[tierId]?.name ?? "",
        color: field === "color" ? value : prev[tierId]?.color ?? "#10b981",
      },
    }));
  };

  const handleSaveTier = async (tierId?: number) => {
    if (!client) return;
    const payload = tierId ? tierEdits[tierId] : { name: tierEdits[-1]?.name ?? "", color: tierEdits[-1]?.color ?? "#10b981" };
    const tierName = payload?.name?.trim();
    const tierColor = payload?.color?.trim() || "#10b981";

    if (!tierName) {
      setStatusMessage("Tier name is required.");
      return;
    }

    const builder = client.from("tiers");
    const { error } = tierId
      ? await builder.update({ tier_name: tierName, color: tierColor }).eq("tier_id", tierId)
      : await builder.insert({ tier_name: tierName, color: tierColor });

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Tier saved.");
      await loadTiers();
    }
  };

  const handleSavePointsRules = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !activeSeason) return;

    const parseNumberList = (value: string) =>
      value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((num) => !Number.isNaN(num));

    const baseValues = parseNumberList(baseValuesInput).filter((value) => [0, 1, 2].includes(value));
    const multipliers = parseNumberList(multipliersInput).filter((value) => [1, 2].includes(value));
    const moneyballEvery = Number(moneyballInput) || null;

    const rules: PointsRules = {
      base_values: baseValues.length ? baseValues : defaultPointsRules.base_values,
      multipliers: multipliers.length ? multipliers : defaultPointsRules.multipliers,
      moneyball_every: moneyballEvery ?? defaultPointsRules.moneyball_every,
    };

    setLoading(true);
    const { error } = await client.from("season_settings").upsert(
      {
        season_id: activeSeason.season_id,
        points_rules: rules,
      },
      { onConflict: "season_id" },
    );

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Scoring configuration saved for this season.");
      setPointsRules(rules);
    }

    setLoading(false);
  };

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

  if (!activeSeason) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold text-emerald-100">No active season</h1>
          <p className="text-sm text-slate-200">
            Create or activate a season in the Next Season Settings page to start managing the current roster, teams, and scoring.
          </p>
          <Link
            href="/admin/next-season"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Go to Next Season Settings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-300">Current Season</p>
            <h1 className="text-3xl font-bold text-emerald-100">Manage active season</h1>
            <p className="text-sm text-slate-300">Update roster, teams, tiers, and scoring defaults for the active season.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-slate-800"
            >
              Back to Admin
            </Link>
            <button
              type="button"
              onClick={loadActiveSeason}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        {statusMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </div>
        )}

        <section className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-emerald-300">Active season</p>
              <h2 className="text-2xl font-semibold text-emerald-100">{activeSeason.season_name}</h2>
              <p className="text-sm text-slate-300">Roster entries: {roster.length}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {[
              { id: "roster", label: "Players / Roster" },
              { id: "teams", label: "Teams" },
              { id: "tiers", label: "Tiers" },
              { id: "points", label: "Points / Scoring" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`rounded-lg px-4 py-2 text-sm font-semibold border transition ${
                  selectedTab === tab.id
                    ? "border-emerald-400 bg-emerald-500 text-slate-950"
                    : "border-slate-700 bg-slate-900 text-emerald-100"
                }`}
                onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {selectedTab === "roster" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-300">Players / Roster</p>
                  <h3 className="text-xl font-semibold text-emerald-100">Manage who is in this season</h3>
                  <p className="text-sm text-slate-300">Add players, assign teams and tiers, or deactivate entries.</p>
                </div>
              </div>

              <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleAddPlayerToSeason}>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Select existing player</label>
                  <select
                    className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                    value={rosterPlayerId}
                    onChange={(e) => setRosterPlayerId(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">Choose a player</option>
                    {players.map((player) => (
                      <option key={player.player_id} value={player.player_id}>
                        {player.name} {player.is_hidden ? "(hidden)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Or create new player</label>
                  <input
                    className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                    placeholder="New player name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Team</label>
                  <select
                    className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                    value={rosterTeamId}
                    onChange={(e) => setRosterTeamId(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">Free agent</option>
                    {seasonTeams.map((team) => (
                      <option key={team.season_team_id} value={team.season_team_id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Tier</label>
                  <select
                    className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                    value={rosterTierId}
                    onChange={(e) => setRosterTierId(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">No tier</option>
                    {tiers.map((tier) => (
                      <option key={tier.tier_id} value={tier.tier_id}>
                        {tier.tier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Shot limit (optional)</label>
                  <input
                    className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                    type="number"
                    value={rosterShotLimit}
                    onChange={(e) => setRosterShotLimit(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 20"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add player to season
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-950/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-emerald-200">Player</th>
                      <th className="px-3 py-2 text-left text-emerald-200">Team</th>
                      <th className="px-3 py-2 text-left text-emerald-200">Tier</th>
                      <th className="px-3 py-2 text-left text-emerald-200">Shot limit</th>
                      <th className="px-3 py-2 text-left text-emerald-200">Active</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {roster.map((entry) => (
                      <tr key={entry.season_roster_id} className={entry.is_active ? "" : "opacity-50"}>
                        <td className="px-3 py-2 text-emerald-100">{entry.player_name}</td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full rounded-lg bg-slate-100 p-2 text-slate-900"
                            value={entry.season_team_id ?? ""}
                            onChange={async (e) => {
                              const teamId = e.target.value === "" ? null : Number(e.target.value);
                              await updateRosterEntry(entry.season_roster_id, { season_team_id: teamId });
                              if (activeSeason) await loadRoster(activeSeason.season_id);
                            }}
                          >
                            <option value="">Free agent</option>
                            {seasonTeams.map((team) => (
                              <option key={team.season_team_id} value={team.season_team_id}>
                                {team.team_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full rounded-lg bg-slate-100 p-2 text-slate-900"
                            value={entry.tier_id ?? ""}
                            onChange={async (e) => {
                              const tierId = e.target.value === "" ? null : Number(e.target.value);
                              await updateRosterEntry(entry.season_roster_id, { tier_id: tierId });
                              if (activeSeason) await loadRoster(activeSeason.season_id);
                            }}
                          >
                            <option value="">No tier</option>
                            {tiers.map((tier) => (
                              <option key={tier.tier_id} value={tier.tier_id}>
                                {tier.tier_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-28 rounded-lg bg-slate-100 p-2 text-slate-900"
                            value={entry.shot_limit ?? ""}
                            onChange={async (e) => {
                              const value = e.target.value === "" ? null : Number(e.target.value);
                              await updateRosterEntry(entry.season_roster_id, { shot_limit: value });
                              if (activeSeason) await loadRoster(activeSeason.season_id);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={entry.is_active}
                            onChange={async (e) => {
                              await updateRosterEntry(entry.season_roster_id, { is_active: e.target.checked });
                              if (activeSeason) await loadRoster(activeSeason.season_id);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-red-400/60 px-3 py-2 text-sm text-red-100 hover:bg-red-500/10"
                            onClick={async () => {
                              await updateRosterEntry(entry.season_roster_id, { is_active: false });
                              if (activeSeason) await loadRoster(activeSeason.season_id);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === "teams" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-300">Teams</p>
                  <h3 className="text-xl font-semibold text-emerald-100">Manage active season teams</h3>
                  <p className="text-sm text-slate-300">Add, rename, reorder, or remove teams not in use.</p>
                </div>
              </div>

              <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleAddTeam}>
                <input
                  className="rounded-lg bg-slate-100 p-3 text-slate-900"
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Add team
                </button>
              </form>

              <div className="space-y-3">
                {seasonTeams.map((team, index) => (
                  <div
                    key={team.season_team_id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <input
                        className="w-full rounded-lg bg-slate-100 p-2 text-slate-900"
                        value={team.team_name}
                        onChange={(e) => handleRenameTeam(team.season_team_id, e.target.value)}
                      />
                      <p className="text-xs text-slate-400">Sort order: {team.sort_order ?? index + 1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveTeam(team.season_team_id, "up")}
                        className="rounded-lg border border-slate-700 p-2 text-emerald-200 hover:bg-slate-800"
                        aria-label="Move team up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTeam(team.season_team_id, "down")}
                        className="rounded-lg border border-slate-700 p-2 text-emerald-200 hover:bg-slate-800"
                        aria-label="Move team down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.season_team_id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-400/60 px-3 py-2 text-sm text-red-100 hover:bg-red-500/10"
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === "tiers" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-300">Tiers</p>
                  <h3 className="text-xl font-semibold text-emerald-100">Global tiers used by the roster</h3>
                  <p className="text-sm text-slate-300">Edit tier names and colors. Changes apply everywhere.</p>
                </div>
              </div>

              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div
                    key={tier.tier_id}
                    className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto] items-center rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <input
                      className="rounded-lg bg-slate-100 p-2 text-slate-900"
                      value={tierEdits[tier.tier_id]?.name ?? tier.tier_name}
                      onChange={(e) => handleTierChange(tier.tier_id, "name", e.target.value)}
                    />
                    <input
                      type="color"
                      className="h-11 rounded-lg"
                      value={tierEdits[tier.tier_id]?.color ?? tier.color}
                      onChange={(e) => handleTierChange(tier.tier_id, "color", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTier(tier.tier_id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-100">Add tier</p>
                <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto] items-center">
                  <input
                    className="rounded-lg bg-slate-100 p-2 text-slate-900"
                    placeholder="Tier name"
                    value={tierEdits[-1]?.name ?? ""}
                    onChange={(e) => handleTierChange(-1, "name", e.target.value)}
                  />
                  <input
                    type="color"
                    className="h-11 rounded-lg"
                    value={tierEdits[-1]?.color ?? "#10b981"}
                    onChange={(e) => handleTierChange(-1, "color", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveTier()}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    <Save className="h-4 w-4" />
                    Add tier
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedTab === "points" && (
            <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-300">Points / Scoring Configuration</p>
                  <h3 className="text-xl font-semibold text-emerald-100">Defaults for the admin shot entry</h3>
                  <p className="text-sm text-slate-300">
                    These values guide the admin shot entry UI for this active season. Base values must stay within 0, 1, or 2 to
                    satisfy the existing database constraint.
                  </p>
                </div>
              </div>

              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSavePointsRules}>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Allowed base values (comma separated)</label>
                  <input
                    className="w-full rounded-lg bg-slate-100 p-3 text-slate-900"
                    value={baseValuesInput}
                    onChange={(e) => setBaseValuesInput(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Limited to 0, 1, and 2 to match scoring constraints.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Allowed multipliers (comma separated)</label>
                  <input
                    className="w-full rounded-lg bg-slate-100 p-3 text-slate-900"
                    value={multipliersInput}
                    onChange={(e) => setMultipliersInput(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Example: 1 for normal, 2 for doubles.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">Moneyball every Nth shot</label>
                  <input
                    className="w-full rounded-lg bg-slate-100 p-3 text-slate-900"
                    type="number"
                    min={1}
                    value={moneyballInput}
                    onChange={(e) => setMoneyballInput(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Defaults to every 10th shot if left blank.</p>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save scoring defaults
                  </button>
                </div>
              </form>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-emerald-100">
                <p className="font-semibold">Current defaults</p>
                <p>Base values: {pointsRules.base_values.join(", ")}</p>
                <p>Multipliers: {pointsRules.multipliers.join(", ")}</p>
                <p>Moneyball every {pointsRules.moneyball_every ?? "10"} shots</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
