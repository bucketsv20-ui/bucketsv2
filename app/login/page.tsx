import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { ensureProfileForUser } from "@/src/lib/auth/ensureProfile";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";

function CheckingSession() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="text-sm text-slate-300">Checking session…</div>
    </main>
  );
}

async function LoginGate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseReady = Boolean(supabaseUrl && supabaseAnon);

  const supabase = supabaseReady ? await getServerSupabaseClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (user && supabase) {
    const profile = await ensureProfileForUser(supabase, user);
    const role = profile?.role ?? "viewer";
    if (role === "admin" || role === "owner") redirect("/admin");
    redirect("/standings");
  }

  const allowSignup =
    process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true" ||
    process.env.ENABLE_SIGNUP === "true";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="flex flex-col items-center gap-4 w-full">
        <Link href="/" className="text-sm text-emerald-300 underline">
          ← Back to home
        </Link>

        {supabaseReady ? (
          <LoginForm allowSignup={allowSignup} />
        ) : (
          <div className="bg-slate-900/70 border border-amber-500/40 text-amber-100 rounded-xl p-6 max-w-md w-full text-center space-y-3">
            <p className="text-lg font-semibold">Supabase configuration missing</p>
            <p className="text-sm text-amber-100">
              Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable login.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<CheckingSession />}>
      <LoginGate />
    </Suspense>
  );
}
