import Link from "next/link";
import { getSeasonData } from "@/src/lib/data/league-data";

export default async function SeasonPage({ params }: { params: Promise<{ leagueId: string; seasonId: string }> }) {
  const { leagueId, seasonId } = await params;
  const data = await getSeasonData(leagueId, seasonId);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Season: {data.season?.name}</h1>
      <Link href={`/league/${leagueId}/season/${seasonId}/scoreboard`} className="text-blue-300">Open realtime scoreboard</Link>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-slate-800 p-3">Roster entries: {data.seasonPlayers.length}</div>
        <div className="rounded border border-slate-800 p-3">Team stats rows: {data.teamStats.length}</div>
        <div className="rounded border border-slate-800 p-3">Awards rows: {data.seasonAwards.length}</div>
      </div>
    </section>
  );
}
