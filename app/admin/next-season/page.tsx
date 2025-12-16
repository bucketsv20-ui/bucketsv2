"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PlayCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

type SeasonSummary = {
  season_id: number;
  season_name: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
  teams_count: number;
  roster_count: number;
  shot_count: number;
  point_total: number;
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
};

type SupabaseRosterRow = {
  season_roster_id: number;
  player_id: number;
  season_team_id: number | null;
  tier_id: number | null;
  shot_limit: number | null;
  players?: { name?: string | null } | null;
  season_teams?: { team_name?: string | null } | null;
  tiers?: { tier_name?: string | null } | null;
};

function useSupabaseMemo() {
  return useMemo(() => getSupabaseClient(), []);
}

export default function NextSeasonSettingsPage() {
  const { client, error: envError } = useSupabaseMemo();
  const [authStatus, setAuthStatus] = useState<"checking" | "denied" | "allowed">("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeSeason, setActiveSeason] = useState<SeasonSummary | null>(null);
  const [plannedSeason, setPlannedSeason] = useState<SeasonSummary | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);

  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonStart, setNewSeasonStart] = useState("");
  const [tierName, setTierName] = useState("");
  const [tierColor, setTierColor] = useState("#10b981");
  const [playerName, setPlayerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [rosterPlayerId, setRosterPlayerId] = useState<number | "">("");
  const [rosterTeamId, setRosterTeamId] = useState<number | "">("");
  const [rosterTierId, setRosterTierId] = useState<number | "">("");
  const [shotLimit, setShotLimit] = useState<number | "">("");

  const formatDate = (value: string | null) => {
    if (!value) return "Not set";
    const date = new Date(value);
    return date.toLocaleString();
  };

  const loadSeasonByStatus = useCallback(
    async (status: "active" | "planned") => {
      if (!client) return null;

      const { data, error } = await client
        .from("seasons")
        .select("season_id, season_name, start_at, end_at, status")
        .eq("status", status)
        .order("start_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const { data: overview } = await client.rpc("get_season_overview", { p_season_id: data.season_id });

      return {
        ...data,
        teams_count: overview?.teams_count ?? 0,
        roster_count: overview?.roster_count ?? 0,
        shot_count: overview?.shot_count ?? 0,
        point_total: overview?.point_total ?? 0,
      } satisfies SeasonSummary;
    },
    [client],
  );

  const loadTiers = useCallback(async () => {
    if (!client) return;
    const { data, error } = await client.from("tiers").select("tier_id, tier_name, color").order("tier_id", { ascending: true });
    if (!error && data) {
      setTiers(data as Tier[]);
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
          "season_roster_id, player_id, season_team_id, tier_id, shot_limit, players(name), season_teams(team_name), tiers(tier_name)",
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
          player_name: row.players?.name ?? "Player",
          team_name: row.season_teams?.team_name ?? null,
          tier_name: row.tiers?.tier_name ?? null,
        }));
        setRoster(mapped);
      }
    },
    [client],
  );

  const refreshAll = useCallback(async () => {
    setStatusMessage("Refreshing season data...");
    const [active, planned] = await Promise.all([loadSeasonByStatus("active"), loadSeasonByStatus("planned")]);
    await Promise.all([loadTiers(), loadPlayers()]);

    setActiveSeason(active);
    setPlannedSeason(planned);

    if (planned) {
      await Promise.all([loadTeams(planned.season_id), loadRoster(planned.season_id)]);
    } else {
      setSeasonTeams([]);
      setRoster([]);
    }
    setStatusMessage("");
  }, [loadSeasonByStatus, loadRoster, loadTeams, loadPlayers, loadTiers]);

  const fetchAdminProfile = useCallback(async () => {
    if (!client) return;
    setStatusMessage("Checking admin permissions...");
    const { data: userData, error } = await client.auth.getUser();

    if (error || !userData?.user) {
      setAuthStatus("denied");
      setStatusMessage("Sign in as an admin or owner to manage seasons.");
      return;
    }

    setUserId(userData.user.id);

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, display_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile || !["admin", "owner"].includes(profile.role)) {
      setAuthStatus("denied");
      setStatusMessage("Only admin or owner profiles can manage seasons.");
      return;
    }

    setAuthStatus("allowed");
    setStatusMessage("");
  }, [client]);

  useEffect(() => {
    if (!client) return;
    fetchAdminProfile();
  }, [client, fetchAdminProfile]);

  useEffect(() => {
    if (!client || authStatus !== "allowed") return;
    refreshAll();
  }, [client, authStatus, refreshAll]);

  useEffect(() => {
    if (players.length > 0 && rosterPlayerId === "") {
      setRosterPlayerId(players[0].player_id);
    }
  }, [players, rosterPlayerId]);

  useEffect(() => {
    if (seasonTeams.length > 0 && rosterTeamId === "") {
      setRosterTeamId(seasonTeams[0].season_team_id);
    }
  }, [seasonTeams, rosterTeamId]);

  useEffect(() => {
    if (tiers.length > 0 && rosterTierId === "") {
      setRosterTierId(tiers[0].tier_id);
    }
  }, [tiers, rosterTierId]);

  const handleCreateSeason = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    if (!newSeasonName.trim()) {
      setStatusMessage("Season name is required.");
      return;
    }

    setLoading(true);
    const { data, error } = await client
      .from("seasons")
      .insert({
        season_name: newSeasonName.trim(),
        status: "planned",
        start_at: newSeasonStart ? new Date(newSeasonStart).toISOString() : null,
        created_by: userId,
      })
      .select("season_id, season_name, start_at, end_at, status")
      .single();

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Planned season created.");
      setNewSeasonName("");
      setNewSeasonStart("");
      setPlannedSeason({
        ...data,
        teams_count: 0,
        roster_count: 0,
        shot_count: 0,
        point_total: 0,
      });
      await refreshAll();
    }
    setLoading(false);
  };

  const handleAddTier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !tierName.trim()) return;
    setLoading(true);
    const { error } = await client.from("tiers").insert({
      tier_name: tierName.trim(),
      color: tierColor.trim() || "#10b981",
    });

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Tier added.");
      setTierName("");
      await loadTiers();
    }
    setLoading(false);
  };

  const handleAddPlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !playerName.trim()) return;
    setLoading(true);
    const { error } = await client.from("players").insert({
      name: playerName.trim(),
      is_hidden: false,
    });

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Player added.");
      setPlayerName("");
      await loadPlayers();
    }
    setLoading(false);
  };

  const handleToggleHidden = async (playerId: number, nextHidden: boolean) => {
    if (!client) return;
    setLoading(true);
    const { error } = await client.from("players").update({ is_hidden: nextHidden }).eq("player_id", playerId);

    if (error) {
      setStatusMessage(error.message);
    } else {
      await loadPlayers();
      setStatusMessage("Player visibility updated.");
    }
    setLoading(false);
  };

  const handleAddTeam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !plannedSeason || !teamName.trim()) return;
    setLoading(true);
    const nextSort = seasonTeams.reduce((max, team) => Math.max(max, team.sort_order ?? 0), 0) + 1;

    const { error } = await client.from("season_teams").insert({
      season_id: plannedSeason.season_id,
      team_name: teamName.trim(),
      sort_order: nextSort,
    });

    if (error) {
      setStatusMessage(error.message);
    } else {
      setTeamName("");
      setStatusMessage("Team added to planned season.");
      await loadTeams(plannedSeason.season_id);
    }
    setLoading(false);
  };

  const handleAddRoster = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !plannedSeason || rosterPlayerId === "") return;
    const teamId = rosterTeamId === "" ? null : Number(rosterTeamId);
    const tierId = rosterTierId === "" ? null : Number(rosterTierId);
    const shotLimitValue = shotLimit === "" ? null : Number(shotLimit);

    setLoading(true);
    const { error } = await client.from("season_roster").upsert(
      {
        season_id: plannedSeason.season_id,
        player_id: Number(rosterPlayerId),
        season_team_id: teamId,
        tier_id: tierId,
        shot_limit: shotLimitValue,
      },
      { onConflict: "season_id,player_id" },
    );

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Roster entry saved.");
      await loadRoster(plannedSeason.season_id);
    }
    setLoading(false);
  };

  const handleEndSeason = async () => {
    if (!client || !activeSeason) return;
    const confirm = window.confirm(`End the active season "${activeSeason.season_name}"?`);
    if (!confirm) return;

    setLoading(true);
    const { error } = await client.rpc("end_season", { p_season_id: activeSeason.season_id });
    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Season ended.");
      await refreshAll();
    }
    setLoading(false);
  };

  const handleActivateSeason = async () => {
    if (!client || !plannedSeason) return;

    if (seasonTeams.length < 1) {
      setStatusMessage("Add at least one team before starting the season.");
      return;
    }

    if (roster.length < 1) {
      setStatusMessage("Add roster entries before starting the season.");
      return;
    }

    setLoading(true);
    const { error } = await client.rpc("activate_season", { p_season_id: plannedSeason.season_id });

    if (error) {
      setStatusMessage(error.message);
    } else {
      setStatusMessage("Season activated.");
      await refreshAll();
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

  if (authStatus === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-slate-900/70 px-6 py-4 text-emerald-100">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Verifying permissions...</p>
        </div>
      </main>
    );
  }

  if (authStatus === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-slate-900/70 border border-amber-500/40 text-amber-100 rounded-xl p-6 max-w-xl w-full text-center space-y-3">
          <ShieldAlert className="h-10 w-10 mx-auto text-amber-300" />
          <h1 className="text-2xl font-semibold">Restricted</h1>
          <p className="text-sm text-amber-200">Only admin or owner accounts can manage the next season settings.</p>
          {statusMessage && <p className="text-xs text-amber-200">{statusMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-300">Next Season</p>
            <h1 className="text-3xl font-bold text-emerald-100">Season management</h1>
            <p className="text-sm text-slate-300">End the current season, configure the next one, and activate it.</p>
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
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh data
            </button>
          </div>
        </header>

        {statusMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </div>
        )}

        <section className="grid gap-4">
          <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-widest text-emerald-300">Current Season</p>
                <h2 className="text-2xl font-semibold text-emerald-100">
                  {activeSeason ? activeSeason.season_name : "No active season"}
                </h2>
                <p className="text-sm text-slate-300">Start date: {activeSeason ? formatDate(activeSeason.start_at) : "N/A"}</p>
                {activeSeason && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-200">
                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase text-slate-400">Teams</p>
                      <p className="text-xl font-bold text-emerald-200">{activeSeason.teams_count}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase text-slate-400">Roster</p>
                      <p className="text-xl font-bold text-emerald-200">{activeSeason.roster_count}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase text-slate-400">Shots</p>
                      <p className="text-xl font-bold text-emerald-200">{activeSeason.shot_count}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                      <p className="text-xs uppercase text-slate-400">Points</p>
                      <p className="text-xl font-bold text-emerald-200">{activeSeason.point_total}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <button
                  type="button"
                  onClick={handleEndSeason}
                  disabled={!activeSeason || loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/60 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                >
                  <ShieldAlert className="h-4 w-4" />
                  End Current Season
                </button>
                <p className="text-xs text-slate-400">
                  Ending sets status to completed and deactivates the roster.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-5 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-emerald-300">Next Season Setup</p>
              <h2 className="text-2xl font-semibold text-emerald-100">
                {plannedSeason ? plannedSeason.season_name : "No planned season yet"}
              </h2>
              {plannedSeason && (
                <p className="text-xs text-slate-400">
                  Planned start: {plannedSeason.start_at ? formatDate(plannedSeason.start_at) : "Set when activated"}
                </p>
              )}
            </div>
            {plannedSeason && (
              <div className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Planned
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-emerald-100">Step 1 — Create planned season</h3>
              </div>
              <form className="space-y-3" onSubmit={handleCreateSeason}>
                <div className="space-y-1">
                  <label className="text-sm text-slate-200">Season name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                    placeholder="e.g. Summer League"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-200">Optional start date</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                    value={newSeasonStart}
                    onChange={(e) => setNewSeasonStart(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !!plannedSeason}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Create planned season
                </button>
                {plannedSeason && (
                  <p className="text-xs text-slate-400">A planned season already exists. End or activate before adding another.</p>
                )}
              </form>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-emerald-100">Step 2 — Manage tiers</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {tiers.map((tier) => (
                  <span
                    key={tier.tier_id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-sm"
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: tier.color }} />
                    {tier.tier_name}
                  </span>
                ))}
                {tiers.length === 0 && <p className="text-sm text-slate-400">No tiers yet.</p>}
              </div>
              <form className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end" onSubmit={handleAddTier}>
                <div className="space-y-1">
                  <label className="text-sm text-slate-200">Tier name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                    placeholder="e.g. Elite"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-200">Color</label>
                  <input
                    type="color"
                    className="h-12 w-full rounded-lg bg-slate-800 border border-slate-700 p-1"
                    value={tierColor}
                    onChange={(e) => setTierColor(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Add tier
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-emerald-100">Step 3 — Manage players</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {players.map((player) => (
                  <div
                    key={player.player_id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-100">{player.name}</p>
                      <p className="text-xs text-slate-500">ID #{player.player_id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(player.player_id, !player.is_hidden)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        player.is_hidden
                          ? "border border-emerald-500/50 text-emerald-200"
                          : "border border-slate-700 text-slate-200"
                      }`}
                    >
                      {player.is_hidden ? "Hidden" : "Visible"}
                    </button>
                  </div>
                ))}
                {players.length === 0 && <p className="text-sm text-slate-400">No players yet.</p>}
              </div>
              <form className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end" onSubmit={handleAddPlayer}>
                <div className="space-y-1">
                  <label className="text-sm text-slate-200">Player name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                    placeholder="New player"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Add player
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-emerald-100">Step 4 — Create teams</h3>
              </div>
              {plannedSeason ? (
                <>
                  <ul className="space-y-2">
                    {seasonTeams.length === 0 && <p className="text-sm text-slate-400">No teams for the planned season.</p>}
                    {seasonTeams.map((team) => (
                      <li
                        key={team.season_team_id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                      >
                        <p className="font-semibold text-slate-100">{team.team_name}</p>
                        <p className="text-xs text-slate-400">Order {team.sort_order ?? "n/a"}</p>
                      </li>
                    ))}
                  </ul>
                  <form className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end" onSubmit={handleAddTeam}>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-200">Team name</label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                        placeholder="Team name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Add team
                    </button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-slate-400">Create a planned season to begin adding teams.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-semibold text-emerald-100">Step 5 — Build roster</h3>
              </div>
              {plannedSeason ? (
                <>
                  <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={handleAddRoster}>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-200">Player</label>
                      <select
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                        value={rosterPlayerId}
                        onChange={(e) => setRosterPlayerId(Number(e.target.value))}
                      >
                        {players.map((player) => (
                          <option key={player.player_id} value={player.player_id}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-200">Team</label>
                      <select
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                    value={rosterTeamId}
                    onChange={(e) => setRosterTeamId(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={seasonTeams.length === 0}
                  >
                    <option value="">No team (free agent)</option>
                    {seasonTeams.map((team) => (
                      <option key={team.season_team_id} value={team.season_team_id}>
                        {team.team_name}
                      </option>
                    ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-200">Tier</label>
                      <select
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
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
                    <div className="space-y-1">
                      <label className="text-sm text-slate-200">Shot limit (optional)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
                        placeholder="e.g. 20"
                        value={shotLimit}
                        onChange={(e) => setShotLimit(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <button
                        type="submit"
                        disabled={loading || players.length === 0 || seasonTeams.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Save roster entry
                      </button>
                    </div>
                  </form>

                  <div className="mt-4 space-y-2">
                    {roster.length === 0 && <p className="text-sm text-slate-400">No roster entries yet.</p>}
                    {roster.map((entry) => (
                      <div
                        key={entry.season_roster_id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-slate-50">{entry.player_name}</p>
                          <p className="text-xs text-slate-400">
                            {entry.team_name ?? "Free agent"} · {entry.tier_name ?? "No tier"}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          Shot limit: {entry.shot_limit !== null ? entry.shot_limit : "Not set"}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Create a planned season to build its roster.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-slate-300">
                Ensure at least one team and roster entry are added before activating the next season.
              </p>
              {plannedSeason && (
                <p className="text-xs text-slate-500">
                  Planned roster: {roster.length} entries · Teams: {seasonTeams.length}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleActivateSeason}
              disabled={!plannedSeason || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
              Start season
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
