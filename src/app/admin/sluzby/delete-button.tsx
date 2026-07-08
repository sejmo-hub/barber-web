"use client";

import { deleteService } from "./actions";

export function DeleteServiceButton({
  id,
  name,
  hasBookings,
}: {
  id: string;
  name: string;
  hasBookings: boolean;
}) {
  return (
    <form
      action={deleteService}
      onSubmit={(e) => {
        if (!confirm(`Naozaj zmazať službu ${name}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={hasBookings ? "Má rezervácie — použi Deaktivovať" : undefined}
        className={
          "rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 " +
          (hasBookings ? "opacity-40" : "")
        }
      >
        Zmazať
      </button>
    </form>
  );
}
