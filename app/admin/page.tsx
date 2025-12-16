"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

type ActiveSeason = {
  season_id: number;
  season_name: string;
};

type RosterEntry = {
  season_roster_id: number;
  player_name: string;
  team_name: string | null;
  tier_name: string | null;
};

type ShotLogRow = {
  shot_id: number;
  shot_index: number;
  base_value: number;
  multiplier: number;
  points: number;
  taken_at: string;
  note: string | null;
  player_name: string;
  team_name: string | null;
};

function useSupabaseMemo() {
  return useMemo(() => getSupabaseClient(), []);
}

export default function AdminPage() {
  const { client, error: envError } = useSupabaseMemo();
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const [baseValue, setBaseValue] = useState(2);
  const [isDouble, setIsDouble] = useState(false);
  const [note, setNote] = useState("");
  const [shotLog, setShotLog] = useState<ShotLogRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigationLinks = useMemo(
    () => [
      { label: "Admin", href: "/admin" },
      { label: "Standings", href: "/standings" },
      { label: "Stats / Analytics", href: "/stats" },
      { label: "Next Season Settings", href: "/admin/next-season" },
    ],
    [],
  );

  const loadRoster = useCallback(
    async (seasonId: number) => {
      if (!client) return;
      const { data, error } = await client
        .from("season_roster")
        .select(
          "season_roster_id, season_id, player:players(name), season_team:season_teams(team_name), tier:tiers(tier_name)",
        )
        .eq("season_id", seasonId)
        .eq("is_active", true)
        .order("season_team_id", { ascending: true, nullsFirst: true })
        .order("season_roster_id", { ascending: true });

      if (error || !data) {
        setStatus("Unable to load roster. Check Supabase tables and RLS policies.");
        return;
      }

      type SupabaseRosterRow = {
        season_roster_id: number;
        season_id: number;
        player?: { name?: string | null } | null;
        season_team?: { team_name?: string | null } | null;
        tier?: { tier_name?: string | null } | null;
      };

      const mapped: RosterEntry[] = ((data ?? []) as SupabaseRosterRow[]).map((row) => ({
        season_roster_id: row.season_roster_id,
        player_name: row.player?.name ?? "Player",
        team_name: row.season_team?.team_name ?? null,
        tier_name: row.tier?.tier_name ?? null,
      }));

      setRoster(mapped);
      setSelectedRosterId((current) => current ?? mapped[0]?.season_roster_id ?? null);
    },
    [client],
  );

  const loadShotLog = useCallback(
    async (seasonId: number) => {
      if (!client) return;
      const { data, error } = await client
        .from("shot_events")
        .select(
          "shot_id, shot_index, base_value, multiplier, points, taken_at, note, season_roster(season_roster_id, player:players(name), season_team:season_teams(team_name))",
        )
        .eq("season_id", seasonId)
        .order("taken_at", { ascending: false })
        .limit(10);

      if (error || !data) {
        setStatus("Unable to load recent shots.");
        return;
      }

      type SupabaseShotRow = {
        shot_id: number;
        shot_index: number;
        base_value: number;
        multiplier: number;
        points: number;
        taken_at: string;
        note?: string | null;
        season_roster?: {
          season_roster_id: number;
          player?: { name?: string | null } | null;
          season_team?: { team_name?: string | null } | null;
        } | null;
      };

      const mapped: ShotLogRow[] = (data ?? []).map((row) => {
        const typedRow = row as unknown as SupabaseShotRow;

        return {
          shot_id: typedRow.shot_id,
          shot_index: typedRow.shot_index,
          base_value: typedRow.base_value,
          multiplier: typedRow.multiplier,
          points: typedRow.points,
          taken_at: typedRow.taken_at,
          note: typedRow.note ?? null,
          player_name: typedRow.season_roster?.player?.name ?? "Unknown",
          team_name: typedRow.season_roster?.season_team?.team_name ?? null,
        };
      });

      setShotLog(mapped);
    },
    [client],
  );

  const loadActiveSeason = useCallback(async () => {
    if (!client) return;
    setStatus("Loading active season...");
    const { data, error } = await client
      .from("seasons")
      .select("season_id, season_name")
      .eq("status", "active")
      .order("start_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      setStatus("No active season found. Create one in the database to start scoring.");
      setActiveSeason(null);
      return;
    }

    setActiveSeason(data);
    setStatus("");
    await Promise.all([loadRoster(data.season_id), loadShotLog(data.season_id)]);
  }, [client, loadRoster, loadShotLog]);

  useEffect(() => {
    loadActiveSeason();
  }, [loadActiveSeason]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function submitShot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !activeSeason) return;
    if (!selectedRosterId) {
      setStatus("Choose a player before recording a shot.");
      return;
    }

    setLoading(true);
    setStatus("Recording shot...");
    const { error } = await client.rpc("record_shot", {
      p_season_roster_id: selectedRosterId,
      p_base_value: baseValue,
      p_multiplier: isDouble ? 2 : 1,
      p_note: note.trim() || null,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Shot recorded.");
      setNote("");
      await loadShotLog(activeSeason.season_id);
    }

    setLoading(false);
  }

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

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="rounded-lg border border-emerald-500/50 bg-slate-900/70 p-2 text-emerald-100 hover:bg-slate-800"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Open admin navigation"
                aria-expanded={menuOpen}
              >
                <Menu className="h-6 w-6" />
              </button>
              {menuOpen && (
                <div className="absolute z-20 mt-2 w-56 rounded-xl border border-emerald-500/40 bg-slate-900 shadow-xl">
                  <p className="px-4 pt-3 text-xs uppercase tracking-widest text-slate-400">Navigation</p>
                  <div className="py-2">
                    {navigationLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 text-sm text-slate-100 hover:bg-emerald-500/10"
                        onClick={() => setMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm uppercase tracking-widest text-emerald-300">Admin Console</p>
              <h1 className="text-3xl font-bold text-emerald-100">Record shots</h1>
              <p className="text-sm text-slate-300">
                Base shot (0/1/2), optional double toggle, automatic moneyball on every 10th shot.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">Active season</p>
            <p className="text-xl font-semibold text-emerald-200">{activeSeason?.season_name ?? "Not set"}</p>
          </div>
        </header>

        <section className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-slate-900/70 border border-emerald-500/30 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-emerald-100">Record a shot</h2>
            <form className="space-y-4" onSubmit={submitShot}>
              <div className="space-y-2">
                <label className="text-sm text-slate-200">Player</label>
                <select
                  className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                  value={selectedRosterId ?? ""}
                  onChange={(e) => setSelectedRosterId(Number(e.target.value))}
                  disabled={!activeSeason || roster.length === 0}
                >
                  <option value="" disabled>
                    Select a player
                  </option>
                  {roster.map((entry) => (
                    <option key={entry.season_roster_id} value={entry.season_roster_id}>
                      {entry.player_name}
                      {entry.team_name ? ` · ${entry.team_name}` : ""}
                      {entry.tier_name ? ` · ${entry.tier_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-lg border p-3 font-semibold ${
                      baseValue === value
                        ? "border-emerald-400 bg-emerald-500 text-slate-900"
                        : "border-slate-600 bg-slate-800 text-slate-100"
                    }`}
                    onClick={() => setBaseValue(value)}
                  >
                    Base {value}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={isDouble}
                  onChange={(e) => setIsDouble(e.target.checked)}
                />
                Double this shot (x2)
              </label>

              <div className="space-y-2">
                <label className="text-sm text-slate-200">Note (optional)</label>
                <textarea
                  className="w-full rounded-lg p-3 bg-slate-100 text-slate-900"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. sideline three, buzzer beater"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedRosterId || loading || !activeSeason}
                className="w-full md:w-auto px-6 py-3 rounded-lg font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Record shot"}
              </button>
              <p className="text-sm text-slate-300">Moneyball is automatic on every 10th shot for the player.</p>
              {status && <p className="text-sm text-emerald-200">{status}</p>}
            </form>
          </div>

          <div className="bg-slate-900/70 border border-emerald-500/30 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-emerald-100">Recent shots</h2>
              <button
                className="text-sm text-emerald-300 underline"
                onClick={() => activeSeason && loadShotLog(activeSeason.season_id)}
                disabled={!activeSeason}
              >
                Refresh
              </button>
            </div>
            {shotLog.length === 0 ? (
              <p className="text-sm text-slate-300">No shots recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {shotLog.map((shot) => (
                  <li
                    key={shot.shot_id}
                    className="border border-slate-700 rounded-lg p-3 bg-slate-950/50 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-emerald-200">{shot.player_name}</p>
                        <p className="text-xs text-slate-400">{shot.team_name ?? "Free agent"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-300">+{shot.points} pts</p>
                        <p className="text-xs text-slate-400">Shot #{shot.shot_index}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Base {shot.base_value} · Multiplier x{shot.multiplier}
                    </p>
                    {shot.note && <p className="text-sm text-slate-200">{shot.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
