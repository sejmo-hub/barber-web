"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

const inputClass =
  "w-full rounded-sm border border-line bg-ink2 px-3 py-2.5 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-cream">Meno</span>
        <input
          type="text"
          name="username"
          required
          autoComplete="username"
          autoFocus
          className={inputClass}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-cream">Heslo</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>

      {state.error && (
        <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-gradient-to-b from-gold to-gold-deep px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-ink transition-all duration-300 hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Prihlasujem…" : "Prihlásiť sa"}
      </button>
    </form>
  );
}
