import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { ensureProfileForUser } from "@/src/lib/auth/ensureProfile";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";

export default async function LoginPage() {
  const supabase = getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await ensureProfileForUser(supabase, user);
    const role = profile?.role ?? "viewer";
    if (role === "admin" || role === "owner") {
      redirect("/admin");
    }
    redirect("/standings");
  }

  const allowSignup = process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true" || process.env.ENABLE_SIGNUP === "true";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="flex flex-col items-center gap-4 w-full">
        <Link href="/" className="text-sm text-emerald-300 underline">
          ← Back to home
        </Link>
        <LoginForm allowSignup={allowSignup} />
      </div>
    </main>
  );
}
