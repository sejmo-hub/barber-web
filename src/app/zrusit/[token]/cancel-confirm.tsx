"use client";

import { useActionState } from "react";
import { cancelByToken, type CancelResult } from "./actions";

const initial: CancelResult = { status: "idle" };

// Potvrdzovacia časť. Zrušenie sa vykoná AŽ po kliknutí (server action cez POST),
// nie pri načítaní stránky. Po úspechu vymení obsah za hlášku.
export function CancelConfirm({
  token,
  serviceName,
  dateLabel,
  time,
}: {
  token: string;
  serviceName: string;
  dateLabel: string;
  time: string;
}) {
  const [state, formAction, pending] = useActionState(cancelByToken, initial);

  if (state.status === "success") {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/5 p-6">
        <h1 className="font-display text-2xl uppercase text-gold">
          Rezervácia bola zrušená
        </h1>
        <p className="mt-3 text-sm text-muted">
          Termín sme uvoľnili. Ak si to rozmyslíš, rezervuj sa prosím nanovo.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none text-cream">
          Zrušiť rezerváciu?
        </h1>
        <div className="mt-5 rounded-sm border border-line bg-panel p-4 text-left">
          <p className="font-display text-xl uppercase text-cream">
            {serviceName}
          </p>
          <p className="mt-1 font-mono text-sm text-muted">
            {dateLabel} · {time}
          </p>
        </div>
      </div>

      <input type="hidden" name="token" value={token} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm border border-red-500/40 bg-red-500/10 px-6 py-4 font-mono text-sm font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Rušim…" : "Áno, zrušiť rezerváciu"}
      </button>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
