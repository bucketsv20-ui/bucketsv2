"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ensureProfileForUser } from "@/src/lib/auth/ensureProfile";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

type ProfileShape = {
  id: string;
  display_name: string;
  role: string;
};

export default function SiteHeader() {
  const { client: supabase, error } = useMemo(() => getSupabaseClient(), []);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        const user = data.user;
        if (!user) return;

        setUserEmail(user.email ?? null);
        const profile = (await ensureProfileForUser(supabase, user)) as ProfileShape | null;
        setDisplayName(profile?.display_name ?? user.email ?? "Guest");
        setRole(profile?.role ?? "viewer");
      })
      .catch(() => {
        setUserEmail(null);
        setDisplayName(null);
        setRole(null);
      });
  }, [supabase]);

  const isLoggedIn = Boolean(userEmail);
  const resolvedDisplayName = displayName ?? "Guest";
  const resolvedRole = role ?? "viewer";

  return (
    <header className="border-b border-emerald-500/20 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold text-emerald-200">
            Buckets Scoreboard
          </Link>
          <nav className="flex items-center gap-3 text-sm text-slate-200">
            <Link className="hover:text-emerald-300" href="/admin">
              Admin
            </Link>
            <Link className="hover:text-emerald-300" href="/standings">
              Standings
            </Link>
            <Link className="hover:text-emerald-300" href="/stats">
              Stats
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-100">{resolvedDisplayName}</p>
                <div className="flex items-center justify-end gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-emerald-500/50 px-2 py-1 uppercase tracking-wide">
                    {resolvedRole}
                  </span>
                  <span className="text-slate-400">{userEmail}</span>
                </div>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-500/40 bg-slate-900 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-slate-800"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              {error && <p className="text-xs text-amber-200">{error}</p>}
              <Link
                href="/login"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
