import type { SupabaseClient, User } from "@supabase/supabase-js";
type ProfileRow = { user_id: string; display_name: string | null; avatar_url: string | null };

export async function ensureProfileForUser(supabase: SupabaseClient<any>, user: User | null) {
  if (!user) return null;

  const { data: existingProfile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (existingProfile) return existingProfile as ProfileRow;

  const displayName =
    (user.user_metadata as Record<string, unknown>)?.full_name?.toString() ?? user.email?.split("@")[0] ?? "Player";

  const { data: createdProfile } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, display_name: displayName })
    .select("*")
    .single();

  return createdProfile as ProfileRow;
}
