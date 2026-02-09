import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/src/components/SiteHeader";
import { QueryProvider } from "@/src/providers/query-provider";

export const metadata: Metadata = {
  title: "Team Shot Scoring",
  description: "League, season, roster, shot entry, and analytics management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100">
        <QueryProvider>
          <SiteHeader />
          <main className="mx-auto max-w-7xl p-4">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
