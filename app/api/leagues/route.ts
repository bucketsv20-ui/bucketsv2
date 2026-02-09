import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { leagueSchema } from "@/src/lib/validation/schemas";

export async function POST(req: Request) {
  const payload = leagueSchema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = await getServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: league, error } = await supabase
    .from("leagues")
    .insert(payload.data)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("league_memberships").insert({
    league_id: league.id,
    user_id: auth.user.id,
    role: "owner",
    is_active: true,
  });

  return NextResponse.json({ league });
}
