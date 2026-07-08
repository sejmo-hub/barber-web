"use client";

import { cancelBooking } from "./actions";

export function CancelButton({
  id,
  view,
  date,
  confirmLabel,
}: {
  id: string;
  view: string;
  date: string;
  confirmLabel: string;
}) {
  return (
    <form
      action={cancelBooking}
      onSubmit={(e) => {
        if (!confirm(`Naozaj zrušiť rezerváciu ${confirmLabel}?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="date" value={date} />
      <button
        type="submit"
        className="w-full rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
      >
        Zrušiť rezerváciu
      </button>
    </form>
  );
}
