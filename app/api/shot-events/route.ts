import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { shotEventSchema } from "@/src/lib/validation/schemas";

export async function POST(req: Request) {
  const parsed = shotEventSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await getServerSupabaseClient();
  const { data: season } = await supabase.from("seasons").select("status").eq("id", parsed.data.season_id).single();
  if (!season || season.status === "archived" || season.status === "closed") {
    return NextResponse.json({ error: "Season does not allow shot entry" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("shot_events")
    .select("shot_number")
    .eq("season_player_id", parsed.data.season_player_id)
    .order("shot_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const shot_number = (existing?.shot_number ?? 0) + 1;
  const points_awarded = parsed.data.base_points * (parsed.data.is_double ? 2 : 1);

  const { data, error } = await supabase
    .from("shot_events")
    .insert({ ...parsed.data, shot_number, points_awarded, xp_awarded: points_awarded })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("season_player_allowance_events").insert({
    league_id: parsed.data.league_id,
    season_player_id: parsed.data.season_player_id,
    delta_shots: -1,
    reason: "shot_taken",
  });

  return NextResponse.json({ shot: data });
}
