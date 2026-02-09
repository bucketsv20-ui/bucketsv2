import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="font-semibold text-white">Team Shot Scoring</Link>
        <nav className="flex gap-4 text-sm text-slate-300">
          <Link href="/login">Login</Link>
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
