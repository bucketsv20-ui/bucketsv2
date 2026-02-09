import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Team Shot Scoring Management</h1>
      <p className="text-slate-300">Manage leagues, seasons, players, and real-time shot scoreboard.</p>
      <div className="flex gap-3">
        <Link href="/onboarding" className="rounded bg-emerald-600 px-3 py-2">Create League</Link>
      </div>
    </section>
  );
}
