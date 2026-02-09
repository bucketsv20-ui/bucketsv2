import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";

const allowed = [
  "teams","tiers","players","seasons","season_teams","season_tiers","season_players","season_player_assignments","season_player_allowance_events","season_player_stats","season_team_stats","season_results","season_awards","player_xp_awards","player_career_stats","bottle_types","dice_sets","dice_set_faces","league_memberships"
] as const;

export async function POST(req: Request) {
  const { table, payload } = await req.json();
  if (!allowed.includes(table)) return NextResponse.json({ error: "table not allowed" }, { status: 400 });
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
