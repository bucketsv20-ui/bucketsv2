"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";
import DiceRoller from "@/src/components/DiceRoller";
import {
  createPlayer,
  createSeason,
  createSeasonTeam,
  createShot,
  createTier,
  loadBootstrap,
  loadPlayers,
  loadSeasons,
  loadSeasonPlayers,
  loadSeasonTeams,
  loadShotEvents,
  loadTiers,
  subscribeToSeasonRealtime,
  upsertSeasonPlayer,
  type Player,
  type Season,
  type SeasonPlayer,
  type SeasonTeam,
  type ShotEvent,
  type Tier,
} from "@/src/lib/db/gameLoop";

type ScoreById = Record<string, number>;

export default function AdminClientPage() {
  const { client, error: envError } = useMemo(() => getSupabaseClient(), []);

  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [seasonPlayers, setSeasonPlayers] = useState<SeasonPlayer[]>([]);
  const [shotEvents, setShotEvents] = useState<ShotEvent[]>([]);

  const [status, setStatus] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonFormat, setNewSeasonFormat] = useState<"team" | "ffa">("team");
  const [newSeasonShotCap, setNewSeasonShotCap] = useState(100);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerLinkedUserId, setNewPlayerLinkedUserId] = useState("");

  const [newTierName, setNewTierName] = useState("");
  const [newTierSortOrder, setNewTierSortOrder] = useState(0);

  const [newTeamName, setNewTeamName] = useState("");

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [assignmentTierId, setAssignmentTierId] = useState("");
  const [assignmentTeamId, setAssignmentTeamId] = useState("");
  const [assignmentShotsCap, setAssignmentShotsCap] = useState(100);

  const [selectedSeasonPlayerId, setSelectedSeasonPlayerId] = useState("");
  const [selectedDie, setSelectedDie] = useState(1);
  const [rolledDice, setRolledDice] = useState<[number, number] | null>(null);
  const [basePoints, setBasePoints] = useState<1 | 2>(1);
  const [isDouble, setIsDouble] = useState(false);
  const [isMoneyball, setIsMoneyball] = useState(false);

  const activeSeason = useMemo(() => seasons.find((s) => s.status === "active") ?? null, [seasons]);
  const selectedSeasonPlayer = useMemo(
    () => seasonPlayers.find((sp) => sp.id === selectedSeasonPlayerId) ?? null,
    [seasonPlayers, selectedSeasonPlayerId],
  );

  useEffect(() => {
    setRolledDice(null);
  }, [selectedSeasonPlayerId]);

  const playerScores = useMemo(() => {
    const map: ScoreById = {};
    for (const shot of shotEvents) {
      map[shot.season_player_id] = (map[shot.season_player_id] ?? 0) + shot.points_awarded;
    }
    return map;
  }, [shotEvents]);

  const teamScores = useMemo(() => {
    const map: ScoreById = {};
    for (const shot of shotEvents) {
      if (!shot.team_id) continue;
      map[shot.team_id] = (map[shot.team_id] ?? 0) + shot.points_awarded;
    }
    return map;
  }, [shotEvents]);

  const refreshCore = useCallback(async () => {
    if (!client) return;

    const { data: bootstrapData, error: bootstrapError } = await loadBootstrap(client);
    if (bootstrapError || !bootstrapData) {
      setLeagueId(null);
      setStatus(bootstrapError ?? "Unable to initialize app.");
      return;
    }

    setLeagueId(bootstrapData.leagueId);

    const [seasonsRes, playersRes, tiersRes] = await Promise.all([
      loadSeasons(client, bootstrapData.leagueId),
      loadPlayers(client, bootstrapData.leagueId),
      loadTiers(client, bootstrapData.leagueId),
    ]);

    if (seasonsRes.error || playersRes.error || tiersRes.error) {
      setStatus(seasonsRes.error?.message ?? playersRes.error?.message ?? tiersRes.error?.message ?? "Failed loading records.");
      return;
    }

    setSeasons((seasonsRes.data ?? []) as Season[]);
    setPlayers((playersRes.data ?? []) as Player[]);
    setTiers((tiersRes.data ?? []) as Tier[]);
    setStatus("");
  }, [client]);

  const refreshSeasonScoped = useCallback(async () => {
    if (!client || !activeSeason) {
      setSeasonTeams([]);
      setSeasonPlayers([]);
      setShotEvents([]);
      return;
    }

    const [teamsRes, seasonPlayersRes, shotsRes] = await Promise.all([
      loadSeasonTeams(client, activeSeason.id),
      loadSeasonPlayers(client, activeSeason.id),
      loadShotEvents(client, activeSeason.id),
    ]);

    if (teamsRes.error || seasonPlayersRes.error || shotsRes.error) {
      setStatus(teamsRes.error?.message ?? seasonPlayersRes.error?.message ?? shotsRes.error?.message ?? "Failed loading active season data.");
      return;
    }

    const mappedTeams: SeasonTeam[] = ((teamsRes.data ?? []) as Array<{ team_id: string; teams: { id: string; name: string } | { id: string; name: string }[] }>).map((row) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      return { team_id: row.team_id, name: team?.name ?? "Team" };
    });

    const mappedSeasonPlayers: SeasonPlayer[] = (
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
    ).map((row) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      return {
        id: row.id,
        player_id: row.player_id,
        player_name: player?.display_name ?? "Player",
        team_id: row.team_id,
        tier_id: row.tier_id,
        shots_cap_initial: row.shots_cap_initial,
        shots_remaining: row.shots_remaining,
        is_enabled: row.is_enabled,
      };
    });

    setSeasonTeams(mappedTeams);
    setSeasonPlayers(mappedSeasonPlayers);
    setShotEvents((shotsRes.data ?? []) as ShotEvent[]);
    setSelectedSeasonPlayerId((prev) => prev || mappedSeasonPlayers[0]?.id || "");
  }, [activeSeason, client]);

  useEffect(() => {
    void refreshCore();
  }, [refreshCore]);

  useEffect(() => {
    void refreshSeasonScoped();
  }, [refreshSeasonScoped]);

  useEffect(() => {
    if (!client || !activeSeason) return;

    const channel = subscribeToSeasonRealtime(client, activeSeason.id, () => {
      void refreshSeasonScoped();
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeSeason, client, refreshSeasonScoped]);

  async function withSave(action: () => Promise<void>) {
    setSaving(true);
    setStatus("");
    try {
      await action();
    } finally {
      setSaving(false);
    }
  }

  if (envError) {
    return <div className="rounded-lg border border-red-500 p-4 text-red-200">{envError}</div>;
  }


  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-emerald-200">Schema Validation Game Loop</h1>
        <p className="text-sm text-slate-300">Create season, manage players, assign season roster, take shots, and validate realtime score changes.</p>
        {leagueId && <p className="text-xs text-slate-400">League: {leagueId}</p>}
        {status && <p className="text-sm text-amber-200">{status}</p>}
      </header>

      {!leagueId ? (
        <section className="rounded border border-red-500/50 bg-red-950/30 p-4 text-red-100">No active league membership found. This app is blocked until your user has an active row in league_memberships.</section>
      ) : (
        <>
          <section className="rounded border border-slate-700 p-4 space-y-3">
            <h2 className="font-semibold text-emerald-100">1) Seasons</h2>
            <ul className="space-y-1 text-sm text-slate-200">
              {seasons.map((season) => (
                <li key={season.id}>
                  {season.name} · {season.format} · {season.status} · cap {season.season_shot_cap}
                </li>
              ))}
              {seasons.length === 0 && <li className="text-slate-400">No seasons yet.</li>}
            </ul>
            <form
              className="grid md:grid-cols-4 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!leagueId || !newSeasonName.trim()) return;
                void withSave(async () => {
                  const { error } = await createSeason(client!, {
                    leagueId,
                    name: newSeasonName.trim(),
                    format: newSeasonFormat,
                    seasonShotCap: newSeasonShotCap,
                  });
                  if (error) {
                    setStatus(error.message);
                    return;
                  }
                  setNewSeasonName("");
                  await refreshCore();
                });
              }}
            >
              <input className="rounded bg-slate-900 border border-slate-700 p-2" placeholder="Season name" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} />
              <select className="rounded bg-slate-900 border border-slate-700 p-2" value={newSeasonFormat} onChange={(e) => setNewSeasonFormat(e.target.value as "team" | "ffa")}>
                <option value="team">team</option>
                <option value="ffa">ffa</option>
              </select>
              <input type="number" min={1} className="rounded bg-slate-900 border border-slate-700 p-2" value={newSeasonShotCap} onChange={(e) => setNewSeasonShotCap(Number(e.target.value))} />
              <button className="rounded bg-emerald-500 text-slate-900 font-medium px-3 py-2 disabled:bg-slate-700" disabled={saving}>Create active season</button>
            </form>
          </section>

          <section className="rounded border border-slate-700 p-4 space-y-3">
            <h2 className="font-semibold text-emerald-100">2) Players & Tiers</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!leagueId || !newPlayerName.trim()) return;
                  void withSave(async () => {
                    const { error } = await createPlayer(client!, {
                      leagueId,
                      displayName: newPlayerName.trim(),
                      linkedUserId: newPlayerLinkedUserId.trim() || null,
                    });
                    if (error) {
                      setStatus(error.message);
                      return;
                    }
                    setNewPlayerName("");
                    setNewPlayerLinkedUserId("");
                    await refreshCore();
                  });
                }}
              >
                <p className="text-sm text-slate-300">Create player</p>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2" placeholder="Display name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2" placeholder="Linked user id (optional UUID)" value={newPlayerLinkedUserId} onChange={(e) => setNewPlayerLinkedUserId(e.target.value)} />
                <button className="rounded bg-emerald-500 text-slate-900 font-medium px-3 py-2 disabled:bg-slate-700" disabled={saving}>Create player</button>
              </form>

              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!leagueId || !newTierName.trim()) return;
                  void withSave(async () => {
                    const { error } = await createTier(client!, {
                      leagueId,
                      name: newTierName.trim(),
                      sortOrder: newTierSortOrder,
                    });
                    if (error) {
                      setStatus(error.message);
                      return;
                    }
                    setNewTierName("");
                    await refreshCore();
                  });
                }}
              >
                <p className="text-sm text-slate-300">Create tier (required for season player)</p>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2" placeholder="Tier name" value={newTierName} onChange={(e) => setNewTierName(e.target.value)} />
                <input type="number" className="w-full rounded bg-slate-900 border border-slate-700 p-2" value={newTierSortOrder} onChange={(e) => setNewTierSortOrder(Number(e.target.value))} />
                <button className="rounded bg-emerald-500 text-slate-900 font-medium px-3 py-2 disabled:bg-slate-700" disabled={saving}>Create tier</button>
              </form>
            </div>
          </section>

          {activeSeason && (
            <>
              {activeSeason.format === "team" && (
                <section className="rounded border border-slate-700 p-4 space-y-3">
                  <h2 className="font-semibold text-emerald-100">3) Teams ({activeSeason.name})</h2>
                  <ul className="text-sm text-slate-200">
                    {seasonTeams.map((team) => (
                      <li key={team.team_id}>{team.name} · score {teamScores[team.team_id] ?? 0}</li>
                    ))}
                    {seasonTeams.length === 0 && <li className="text-slate-400">No teams in this season yet.</li>}
                  </ul>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!leagueId || !newTeamName.trim()) return;
                      void withSave(async () => {
                        const { error } = await createSeasonTeam(client!, { leagueId, seasonId: activeSeason.id, teamName: newTeamName.trim() });
                        if (error) {
                          setStatus(error.message);
                          return;
                        }
                        setNewTeamName("");
                        await refreshSeasonScoped();
                      });
                    }}
                  >
                    <input className="flex-1 rounded bg-slate-900 border border-slate-700 p-2" placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                    <button className="rounded bg-emerald-500 text-slate-900 font-medium px-3 py-2 disabled:bg-slate-700" disabled={saving}>Create team</button>
                  </form>
                </section>
              )}

              <section className="rounded border border-slate-700 p-4 space-y-3">
                <h2 className="font-semibold text-emerald-100">4) Season Player Setup</h2>
                <form
                  className="grid md:grid-cols-5 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!leagueId || !selectedPlayerId || !assignmentTierId) return;
                    if (activeSeason.format === "team" && !assignmentTeamId) {
                      setStatus("Team is required for team seasons.");
                      return;
                    }
                    void withSave(async () => {
                      const { error } = await upsertSeasonPlayer(client!, {
                        leagueId,
                        seasonId: activeSeason.id,
                        playerId: selectedPlayerId,
                        tierId: assignmentTierId,
                        teamId: activeSeason.format === "team" ? assignmentTeamId || null : null,
                        shotsCap: assignmentShotsCap,
                      });
                      if (error) {
                        setStatus(error.message);
                        return;
                      }
                      await refreshSeasonScoped();
                    });
                  }}
                >
                  <select className="rounded bg-slate-900 border border-slate-700 p-2" value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}>
                    <option value="">Select player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>{player.display_name}</option>
                    ))}
                  </select>
                  <select className="rounded bg-slate-900 border border-slate-700 p-2" value={assignmentTierId} onChange={(e) => setAssignmentTierId(e.target.value)}>
                    <option value="">Tier</option>
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>{tier.name}</option>
                    ))}
                  </select>
                  <select className="rounded bg-slate-900 border border-slate-700 p-2" value={assignmentTeamId} onChange={(e) => setAssignmentTeamId(e.target.value)} disabled={activeSeason.format !== "team"}>
                    <option value="">Team</option>
                    {seasonTeams.map((team) => (
                      <option key={team.team_id} value={team.team_id}>{team.name}</option>
                    ))}
                  </select>
                  <input type="number" min={1} className="rounded bg-slate-900 border border-slate-700 p-2" value={assignmentShotsCap} onChange={(e) => setAssignmentShotsCap(Number(e.target.value))} />
                  <button className="rounded bg-emerald-500 text-slate-900 font-medium px-3 py-2 disabled:bg-slate-700" disabled={saving}>Add/Reset player</button>
                </form>

                <ul className="space-y-2 text-sm">
                  {players.map((player) => {
                    const inSeason = seasonPlayers.find((sp) => sp.player_id === player.id);
                    const tierName = tiers.find((t) => t.id === inSeason?.tier_id)?.name ?? "-";
                    const teamName = seasonTeams.find((t) => t.team_id === inSeason?.team_id)?.name ?? "-";
                    return (
                      <li key={player.id} className="rounded border border-slate-800 p-2">
                        <div className="flex justify-between">
                          <span>{player.display_name}</span>
                          <span className={inSeason ? "text-emerald-300" : "text-slate-500"}>{inSeason ? "IN SEASON" : "NOT IN SEASON"}</span>
                        </div>
                        {inSeason && (
                          <div className="text-slate-300 mt-1">
                            tier: {tierName} · team: {teamName} · shots remaining: {inSeason.shots_remaining} · score: {playerScores[inSeason.id] ?? 0}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="rounded border border-slate-700 p-4 space-y-3">
                <h2 className="font-semibold text-emerald-100">5) Shot Input + Live Validation</h2>
                <form
                  className="grid md:grid-cols-5 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!leagueId || !selectedSeasonPlayer || !activeSeason) return;
                    void withSave(async () => {
                      const { error } = await createShot(client!, {
                        leagueId,
                        seasonId: activeSeason.id,
                        seasonPlayer: selectedSeasonPlayer,
                        selectedDie,
                        rolledDice,
                        basePoints,
                        isDouble,
                        isMoneyball,
                      });
                      if (error) {
                        setStatus(error);
                        return;
                      }
                      setIsDouble(false);
                      setRolledDice(null);
                      await refreshSeasonScoped();
                    });
                  }}
                >
                  <select className="rounded bg-slate-900 border border-slate-700 p-2" value={selectedSeasonPlayerId} onChange={(e) => setSelectedSeasonPlayerId(e.target.value)}>
                    <option value="">Season player</option>
                    {seasonPlayers.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.player_name}</option>
                    ))}
                  </select>
                  <select className="rounded bg-slate-900 border border-slate-700 p-2" value={basePoints} onChange={(e) => setBasePoints(Number(e.target.value) as 1 | 2)}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isDouble} onChange={(e) => setIsDouble(e.target.checked)} />double</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isMoneyball} onChange={(e) => setIsMoneyball(e.target.checked)} />moneyball</label>
                  <button className="rounded bg-emerald-500 text-slate-900 font-medium px-3 py-2 disabled:bg-slate-700" disabled={!selectedSeasonPlayer || selectedSeasonPlayer.shots_remaining <= 0 || saving}>Take shot</button>
                </form>



                <DiceRoller
                  disabled={!selectedSeasonPlayer || selectedSeasonPlayer.shots_remaining <= 0 || saving}
                  onApply={({ selectedDie: die, rolledDice: dice }) => {
                    setSelectedDie(die);
                    setRolledDice(dice);
                    setStatus(`Selected die ${die} from roll [${dice[0]}, ${dice[1]}].`);
                  }}
                />
                {selectedSeasonPlayer && (
                  <p className="text-sm text-slate-300">
                    Player score: {playerScores[selectedSeasonPlayer.id] ?? 0} · Team score: {selectedSeasonPlayer.team_id ? teamScores[selectedSeasonPlayer.team_id] ?? 0 : "N/A"} · Shots remaining: {selectedSeasonPlayer.shots_remaining} · Selected die: {selectedDie}{rolledDice ? ` (from ${rolledDice[0]}, ${rolledDice[1]})` : ""}
                  </p>
                )}

                <ul className="space-y-2 text-sm text-slate-200 max-h-80 overflow-auto">
                  {shotEvents.map((shot) => {
                    const player = seasonPlayers.find((sp) => sp.id === shot.season_player_id);
                    const teamName = shot.team_id ? seasonTeams.find((team) => team.team_id === shot.team_id)?.name : null;
                    return (
                      <li key={shot.id} className="rounded border border-slate-800 p-2">
                        #{shot.shot_number} · {player?.player_name ?? "Player"} · die {shot.selected_die} · {shot.base_points}
                        {shot.is_double ? " x2" : ""} = {shot.points_awarded} pts
                        {shot.rolled_dice?.length === 2 ? ` · rolled [${shot.rolled_dice[0]}, ${shot.rolled_dice[1]}]` : ""}
                        {shot.is_moneyball ? " · moneyball" : ""}
                        {teamName ? ` · team ${teamName}` : ""}
                      </li>
                    );
                  })}
                  {shotEvents.length === 0 && <li className="text-slate-400">No shot history yet.</li>}
                </ul>
              </section>
            </>
          )}

          {!activeSeason && <section className="rounded border border-amber-500/50 bg-amber-950/30 p-4 text-amber-200">Create an active season to continue with season player setup and shot input.</section>}

          {/* TODO: Add close season flow and history screens when phase-2 features are started. */}
        </>
      )}
    </main>
  );
}
