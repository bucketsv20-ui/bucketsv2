import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-slate-900/70 border border-emerald-500/40 rounded-2xl shadow-xl p-10 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-emerald-200">Buckets Scoreboard</h1>
        <p className="text-lg text-slate-200">
          Manage live Buckets scoring and watch standings update instantly. Use the admin console to
          record shots and the TV view for real-time rankings.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            className="rounded-lg bg-emerald-500 text-slate-950 font-semibold py-3 px-4 text-center hover:bg-emerald-400"
            href="/admin"
          >
            Go to Admin
          </Link>
          <Link
            className="rounded-lg bg-slate-800 border border-emerald-500/40 text-emerald-100 font-semibold py-3 px-4 text-center hover:bg-slate-700"
            href="/standings"
          >
            View Standings
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          Set your Supabase URL and anon key in <code>.env.local</code> to begin.
        </p>
      </div>
    </main>
  );
}
