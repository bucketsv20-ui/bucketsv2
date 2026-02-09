"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/src/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function signIn() {
    const { client } = getSupabaseClient();
    if (!client) return;
    await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    alert("Check your email for magic link");
  }

  return (
    <section className="mx-auto max-w-md space-y-3 rounded border border-slate-800 bg-slate-900/50 p-6">
      <h1 className="text-xl font-semibold">Login</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded bg-slate-800 p-2" placeholder="you@example.com" />
      <button className="rounded bg-blue-600 px-3 py-2" onClick={signIn}>Send magic link</button>
    </section>
  );
}
