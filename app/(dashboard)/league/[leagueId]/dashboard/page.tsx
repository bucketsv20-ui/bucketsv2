import Link from "next/link";
import { getLeagueDashboardData } from "@/src/lib/data/league-data";

export default async function LeagueDashboardPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const data = await getLeagueDashboardData(leagueId);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{((data.league as { name?: string } | null)?.name) ?? "League"} Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded border border-slate-800 p-3">Seasons: {data.seasons.length}</div>
        <div className="rounded border border-slate-800 p-3">Teams: {data.teams.length}</div>
        <div className="rounded border border-slate-800 p-3">Players: {data.players.length}</div>
        <div className="rounded border border-slate-800 p-3">Members: {data.memberships.length}</div>
      </div>
      <Link href={`/league/${leagueId}/season/new`} className="inline-block rounded bg-emerald-600 px-3 py-2 text-sm">Create season bundle</Link>
      <h2 className="text-lg font-medium">Seasons</h2>
      <ul className="space-y-2">
        {data.seasons.map((s: any) => (
          <li key={s.id}><Link className="text-blue-300" href={`/league/${leagueId}/season/${s.id}`}>{s.name} ({s.status})</Link></li>
        ))}
      </ul>
    </section>
  );
}
