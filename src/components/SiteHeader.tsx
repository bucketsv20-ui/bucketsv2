import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ensureProfileForUser } from "@/src/lib/auth/ensureProfile";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await ensureProfileForUser(supabase, user);
  const displayName = profile?.display_name ?? user?.email ?? "Guest";

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
          {user ? (
            <>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-100">{displayName}</p>
                <div className="flex items-center justify-end gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-emerald-500/50 px-2 py-1 uppercase tracking-wide">
                    {profile?.role ?? "viewer"}
                  </span>
                  <span className="text-slate-400">{user.email}</span>
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
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
