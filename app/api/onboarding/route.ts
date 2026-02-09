import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export async function GET(req: Request) {
  const seasonId = new URL(req.url).searchParams.get("seasonId");
  if (!seasonId) return NextResponse.json({ error: "seasonId required" }, { status: 400 });
  const supabase = await getServerSupabaseClient();

  const [shotEvents, seasonPlayers, playerStats] = await Promise.all([
    supabase.from("shot_events").select("*").eq("season_id", seasonId).eq("is_voided", false).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("season_players").select("*").eq("season_id", seasonId),
    supabase.from("season_player_stats").select("*").eq("season_id", seasonId).order("score_total", { ascending: false }),
  ]);

  return NextResponse.json({ shotEvents: shotEvents.data ?? [], seasonPlayers: seasonPlayers.data ?? [], playerStats: playerStats.data ?? [] });
}
