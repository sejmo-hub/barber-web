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
        <span className="mb-1 block text-gray-500">Od</span>
        <input
          type="time"
          name="start"
          required
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-gray-500">Do</span>
        <input
          type="time"
          name="end"
          required
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "…" : "Pridať blok"}
      </button>

      {state.error && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="w-full text-sm text-green-600">{state.success}</p>
      )}
    </form>
  );
}
