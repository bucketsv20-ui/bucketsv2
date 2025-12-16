"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp } from "./actions";

const initialState = { error: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
    >
      {pending ? "Working..." : label}
    </button>
  );
}

export default function LoginForm({ allowSignup }: { allowSignup: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = useMemo(() => (mode === "signin" ? signIn : signUp), [mode]);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-6 shadow-lg max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-emerald-100">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        {allowSignup && (
          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "signin" ? "signup" : "signin"))}
            className="text-sm text-emerald-300 underline"
          >
            {mode === "signin" ? "Need an account?" : "Have an account?"}
          </button>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="full_name">
              Full name (optional)
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
              placeholder="Alex Buckets"
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-50"
            placeholder="••••••••"
          />
        </div>

        <SubmitButton label={mode === "signin" ? "Sign In" : "Create Account"} />
        {state?.error && <p className="text-sm text-amber-200">{state.error}</p>}
        <p className="text-xs text-slate-400">
          After signing in, admins are routed to /admin. Viewers land on /standings.
        </p>
      </form>
    </div>
  );
}
