"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient<any> | null = null;

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      client: null as SupabaseClient<any> | null,
      error: "Missing Supabase environment variables.",
    };
  }

  if (!cachedClient) {
    cachedClient = createBrowserClient<any>(supabaseUrl, supabaseAnonKey);
  }

  return { client: cachedClient, error: null as string | null };
}
