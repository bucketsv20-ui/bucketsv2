import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const supabase = await getServerSupabaseClient();
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).single();
  const { data: career } = await supabase.from("player_career_stats").select("*").eq("player_id", playerId).maybeSingle();
  const { data: seasonPlayers } = await supabase.from("season_players").select("id").eq("player_id", playerId);
  const ids = ((seasonPlayers as any[]) ?? []).map((sp: any) => sp.id);
  const { data: xpAwards } = ids.length
    ? await supabase.from("player_xp_awards").select("*").in("season_player_id", ids)
    : { data: [] as any[] };

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{(player as any)?.display_name}</h1>
      <p>Career score: {(career as any)?.official_score_total ?? 0}</p>
      <p>Season splits: {ids.length}</p>
      <p>XP awards: {(xpAwards as any[])?.length ?? 0}</p>
    </section>
  );
}
