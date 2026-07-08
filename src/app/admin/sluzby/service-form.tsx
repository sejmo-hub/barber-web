"use client";

import { useActionState } from "react";
import { createService, type ServiceFormState } from "./actions";

const initialState: ServiceFormState = {};

export function ServiceForm() {
  const [state, formAction, pending] = useActionState(
    createService,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">Názov</span>
          <input
            type="text"
            name="name"
            required
            placeholder="napr. Pánsky strih"
            className="w-full rounded-md border border-line bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">
            Dĺžka (min)
          </span>
          <input
            type="number"
            name="durationMin"
            min={1}
            step={1}
            required
            placeholder="napr. 30"
            className="w-full rounded-md border border-line bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">
            Cena (€)
          </span>
          <input
            type="number"
            name="priceEur"
            min={0}
            step="0.01"
            required
            placeholder="napr. 12,00"
            className="w-full rounded-md border border-line bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none"
          />
        </label>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-[#d8ba74] disabled:opacity-50"
      >
        {pending ? "Ukladám…" : "Pridať službu"}
      </button>
    </form>
  );
}
