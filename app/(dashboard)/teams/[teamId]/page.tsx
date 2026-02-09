import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await getServerSupabaseClient();
  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).single();
  const { data: seasonStats } = await supabase.from("season_team_stats").select("*").eq("team_id", teamId);
  const { data: results } = await supabase.from("season_results").select("*").eq("team_id", teamId);
  const { data: awards } = await supabase.from("season_awards").select("*").eq("winner_team_id", teamId);

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Team: {(team as any)?.name}</h1>
      <p>Season stat rows: {seasonStats?.length ?? 0}</p>
      <p>Result rows: {results?.length ?? 0}</p>
      <p>Award rows: {awards?.length ?? 0}</p>
    </section>
  );
}
