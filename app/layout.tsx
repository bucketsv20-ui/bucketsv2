import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/src/components/SiteHeader";

export const metadata: Metadata = {
  title: "Buckets Scoreboard",
  description: "Admin scoring and TV standings for Buckets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
