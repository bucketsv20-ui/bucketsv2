import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { leagueSchema } from "@/src/lib/validation/schemas";

export async function POST(req: Request) {
  const payload = leagueSchema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });

  const supabase = await getServerSupabaseClient();
  const { data: league, error } = await supabase
    .from("leagues")
    .insert(payload.data)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ league });
}
