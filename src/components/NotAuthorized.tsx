import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type Props = {
  reason?: string;
};

export default function NotAuthorized({ reason }: Props) {
  const isMissingEnv = reason === "missing_env";

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-slate-900/70 border border-amber-500/40 text-amber-100 rounded-xl p-6 max-w-xl w-full text-center space-y-3">
        <ShieldAlert className="h-10 w-10 mx-auto text-amber-300" />
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-sm text-amber-200">
          {isMissingEnv
            ? "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to continue."
            : reason === "not_authenticated"
            ? "Sign in to continue."
            : "This area is restricted to admin or owner accounts."}
        </p>
        <div className="flex items-center justify-center gap-3 text-sm">
          <Link href="/" className="rounded-lg border border-amber-500/50 px-4 py-2 font-semibold text-amber-100 hover:bg-amber-500/20">
            Go home
          </Link>
          {!isMissingEnv && (
            <Link
              href="/login"
              className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
