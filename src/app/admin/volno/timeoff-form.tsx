"use client";

import { useActionState, useState } from "react";
import { createTimeOff, type TimeOffFormState } from "./actions";

const initialState: TimeOffFormState = {};

const inputClass =
  "w-full rounded-md border border-line bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none";

export function TimeOffForm({ minDate }: { minDate: string }) {
  const [state, formAction, pending] = useActionState(
    createTimeOff,
    initialState,
  );
  const [allDay, setAllDay] = useState(true);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">Dátum</span>
          <input
            type="date"
            name="date"
            min={minDate}
            required
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-cream">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4 accent-gold"
        />
        Celý deň
      </label>

      {!allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-cream">Od</span>
            <input type="time" name="start" required className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-cream">Do</span>
            <input type="time" name="end" required className={inputClass} />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-cream">
          Dôvod <span className="font-normal text-muted">(nepovinné)</span>
        </span>
        <input
          type="text"
          name="reason"
          placeholder="napr. Dovolenka, Školenie"
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-[#d8ba74] disabled:opacity-50"
      >
        {pending ? "Ukladám…" : "Pridať voľno"}
      </button>
    </form>
  );
}
