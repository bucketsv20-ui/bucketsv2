"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureProfileForUser } from "@/src/lib/auth/ensureProfile";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";

type AuthState = {
  error?: string;
};

function redirectForRole(role: string | null | undefined) {
  if (role === "admin" || role === "owner") {
    return "/admin";
  }
  return "/standings";
}

function signupEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true" || process.env.ENABLE_SIGNUP === "true";
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to sign in." };
  }

  const profile = await ensureProfileForUser(supabase, data.user);
  revalidatePath("/", "layout");

  redirect(redirectForRole(profile?.role));
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  if (!signupEnabled()) {
    return { error: "Sign up is disabled for this environment." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to create account." };
  }

  const profile = await ensureProfileForUser(supabase, data.user);
  revalidatePath("/", "layout");

  redirect(redirectForRole(profile?.role));
}
