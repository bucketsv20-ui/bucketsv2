import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";

export async function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...(options ?? {}) });
        } catch {
          // Ignore if called during Server Component render
        }
      },
      remove(name: string, options?: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", maxAge: 0, ...(options ?? {}) });
        } catch {
          // Ignore if called during Server Component render
        }
      },
    },
  });
}
