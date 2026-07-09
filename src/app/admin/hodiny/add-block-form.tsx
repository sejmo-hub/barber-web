"use client";

import { useActionState } from "react";
import { addBlock, type HoursFormState } from "./actions";

const initialState: HoursFormState = {};

export function AddBlockForm({ weekday }: { weekday: number }) {
  const [state, formAction, pending] = useActionState(addBlock, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="weekday" value={weekday} />

      <label className="text-sm">
        <span className="mb-1 block text-muted">Od</span>
        <input
          type="time"
          name="start"
          required
          className="rounded-md border border-line bg-ink2 px-2 py-1.5 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-muted">Do</span>
        <input
          type="time"
          name="end"
          required
          className="rounded-md border border-line bg-ink2 px-2 py-1.5 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-[#d8ba74] disabled:opacity-50"
      >
        {pending ? "…" : "Pridať blok"}
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p role="status" className="w-full text-sm text-emerald-300">{state.success}</p>
      )}
    </form>
  );
}
