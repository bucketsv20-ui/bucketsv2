import type { User } from "@supabase/supabase-js";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { ensureProfileForUser } from "./ensureProfile";

export type Role = "viewer" | "admin" | "owner";

type AllowedResult = {
  allowed: true;
  user: User;
  profile: {
    id: string;
    display_name: string;
    role: Role;
  };
};

type DeniedResult = {
  allowed: false;
  reason: "not_authenticated" | "missing_profile" | "forbidden";
  user?: User;
  profile?: {
    id: string;
    display_name: string;
    role: Role;
  } | null;
};

export async function requireRole(roles: Role[]): Promise<AllowedResult | DeniedResult> {
  const supabase = getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "not_authenticated" } satisfies DeniedResult;
  }

  const profile = await ensureProfileForUser(supabase, user);

  if (!profile) {
    return { allowed: false, reason: "missing_profile", user } satisfies DeniedResult;
  }

  if (!roles.includes(profile.role as Role)) {
    return { allowed: false, reason: "forbidden", user, profile: profile as AllowedResult["profile"] } satisfies DeniedResult;
  }

  return { allowed: true, user, profile: profile as AllowedResult["profile"] } satisfies AllowedResult;
}
