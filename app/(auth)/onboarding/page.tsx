"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leagueSchema, type LeagueInput } from "@/src/lib/validation/schemas";

export default function OnboardingPage() {
  const form = useForm<LeagueInput>({ resolver: zodResolver(leagueSchema), defaultValues: { name: "", slug: "" } });

  async function onSubmit(values: LeagueInput) {
    const res = await fetch("/api/leagues", { method: "POST", body: JSON.stringify(values) });
    if (!res.ok) alert("Failed to create league");
    else alert("League created");
  }

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded border border-slate-800 bg-slate-900/50 p-6">
      <h1 className="text-xl font-semibold">Onboarding</h1>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <input className="w-full rounded bg-slate-800 p-2" placeholder="League Name" {...form.register("name")} />
        <input className="w-full rounded bg-slate-800 p-2" placeholder="league-slug" {...form.register("slug")} />
        <button className="rounded bg-emerald-600 px-3 py-2" type="submit">Create League</button>
      </form>
    </section>
  );
}
