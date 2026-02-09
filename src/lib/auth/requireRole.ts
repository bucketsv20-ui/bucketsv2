import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export type Role = "owner" | "admin" | "member";

export async function requireRole(leagueId: string, roles: Role[]) {
  const supabase = await getServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { allowed: false as const, reason: "not_authenticated" };

  const { data: membership } = await supabase
    .from("league_memberships")
    .select("role,is_active")
    .eq("league_id", leagueId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership?.is_active) return { allowed: false as const, reason: "missing_membership" };
  if (!roles.includes(membership.role)) return { allowed: false as const, reason: "forbidden" };
  return { allowed: true as const, role: membership.role };
}
