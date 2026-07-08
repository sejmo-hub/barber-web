"use client";

import { useActionState, useState } from "react";
import { createTimeOff, type TimeOffFormState } from "./actions";

const initialState: TimeOffFormState = {};

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

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
          <span className="mb-1 block font-medium text-gray-700">Dátum</span>
          <input
            type="date"
            name="date"
            min={minDate}
            required
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4"
        />
        Celý deň
      </label>

      {!allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Od</span>
            <input type="time" name="start" required className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Do</span>
            <input type="time" name="end" required className={inputClass} />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">
          Dôvod <span className="font-normal text-gray-400">(nepovinné)</span>
        </span>
        <input
          type="text"
          name="reason"
          placeholder="napr. Dovolenka, Školenie"
          className={inputClass}
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Ukladám…" : "Pridať voľno"}
      </button>
    </form>
  );
}
