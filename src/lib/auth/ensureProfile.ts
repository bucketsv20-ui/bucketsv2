import type { SupabaseClient, User } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  display_name: string;
  role: "viewer" | "admin" | "owner";
};

export async function ensureProfileForUser(supabase: SupabaseClient, user: User | null) {
  if (!user) return null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile as ProfileRow;
  }

  const displayName =
    (user.user_metadata as Record<string, unknown>)?.full_name?.toString() ??
    user.email?.split("@")[0] ??
    "Player";

  const { data: createdProfile } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      display_name: displayName,
      role: "viewer",
    })
    .select("id, display_name, role")
    .maybeSingle();

  return createdProfile as ProfileRow | null;
}
