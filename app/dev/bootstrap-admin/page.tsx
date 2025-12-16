import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureProfileForUser } from "@/src/lib/auth/ensureProfile";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { getServiceSupabaseClient } from "@/src/lib/supabase/service";

type SearchParams = {
  key?: string;
};

export default async function BootstrapAdminPage({ searchParams }: { searchParams?: SearchParams }) {
  noStore();

  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-amber-100">Supabase config missing</p>
          <p className="text-sm text-amber-100">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use the bootstrap helper.</p>
        </div>
      </main>
    );
  }

  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-emerald-500/40 bg-slate-900/70 p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-emerald-100">Sign in required</p>
          <p className="text-sm text-slate-200">Log in first, then revisit this page to promote your account to admin.</p>
          <Link href="/login" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  const providedKey = searchParams?.key;
  const expectedKey = process.env.ADMIN_BOOTSTRAP_KEY;

  if (!expectedKey) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-amber-100">Bootstrap key missing</p>
          <p className="text-sm text-amber-100">Set ADMIN_BOOTSTRAP_KEY in your environment to enable this helper.</p>
        </div>
      </main>
    );
  }

  if (providedKey !== expectedKey) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-emerald-500/40 bg-slate-900/70 p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-emerald-100">Provide the bootstrap key</p>
          <p className="text-sm text-slate-200">
            Append <code>?key=&lt;ADMIN_BOOTSTRAP_KEY&gt;</code> to this URL to promote your signed-in account.
          </p>
          <p className="text-xs text-slate-400">Never use this outside of local development.</p>
        </div>
      </main>
    );
  }

  const serviceClient = getServiceSupabaseClient();

  if (!serviceClient) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-amber-100">Service role key missing</p>
          <p className="text-sm text-amber-100">Set SUPABASE_SERVICE_ROLE_KEY to allow role promotion.</p>
        </div>
      </main>
    );
  }

  await ensureProfileForUser(supabase, user);
  const displayName =
    (user.user_metadata as Record<string, unknown>)?.full_name?.toString() ??
    user.email?.split("@")[0] ??
    "Admin";
  const { error } = await serviceClient
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName, role: "admin" });

  return (
    <main className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-xl border border-emerald-500/40 bg-slate-900/70 p-6 text-center space-y-3">
        {error ? (
          <>
            <p className="text-lg font-semibold text-amber-100">Unable to promote user</p>
            <p className="text-sm text-amber-100">{error.message}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-emerald-100">You are now an admin</p>
            <p className="text-sm text-slate-200">Return to the admin console to manage the season.</p>
            <Link
              href="/admin"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Go to admin
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
