"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createService,
  updateService,
  type ServiceFormState,
} from "./actions";

const initialState: ServiceFormState = {};

const inputClass =
  "w-full rounded-md border border-line bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none";
const hintClass = "mt-1 block text-xs text-muted";

export type EditingService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  priceMaxCents: number | null;
  bookable: boolean;
};

export function ServiceForm({ editing }: { editing?: EditingService }) {
  const [state, formAction, pending] = useActionState(
    editing ? updateService : createService,
    initialState,
  );
  const eur = (c: number) => String(c / 100);

  return (
    <form action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">Názov</span>
          <input
            type="text"
            name="name"
            required
            defaultValue={editing?.name ?? ""}
            placeholder="napr. Pánsky strih"
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">Dĺžka (min)</span>
          <input
            type="number"
            name="durationMin"
            min={1}
            step={1}
            required
            defaultValue={editing ? editing.durationMin : ""}
            placeholder="napr. 30"
            className={inputClass}
          />
          <span className={hintClass}>
            Čas, ktorý služba zaberie v kalendári (aj pri rozsahovej cene daj
            konkrétny odhad).
          </span>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-cream">
          Popis <span className="font-normal text-muted">(nepovinné)</span>
        </span>
        <textarea
          name="description"
          rows={2}
          defaultValue={editing?.description ?? ""}
          placeholder="napr. Strih zahŕňa styling, fade od 0, hair line."
          className={`${inputClass} resize-y`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">Cena od (€)</span>
          <input
            type="number"
            name="priceEur"
            min={0}
            step="0.01"
            required
            defaultValue={editing ? eur(editing.priceCents) : ""}
            placeholder="napr. 12,00"
            className={inputClass}
          />
          <span className={hintClass}>Spodná alebo fixná cena.</span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-cream">
            Cena do (€){" "}
            <span className="font-normal text-muted">(nepovinné)</span>
          </span>
          <input
            type="number"
            name="priceMaxEur"
            min={0}
            step="0.01"
            defaultValue={
              editing?.priceMaxCents != null ? eur(editing.priceMaxCents) : ""
            }
            placeholder="napr. 60,00"
            className={inputClass}
          />
          <span className={hintClass}>
            Vyplň len ak má služba cenový rozsah (napr. farbenie od–do).
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="bookable"
          defaultChecked={editing ? editing.bookable : true}
          className="mt-0.5 h-4 w-4 accent-gold"
        />
        <span>
          <span className="font-medium text-cream">Dá sa rezervovať online</span>
          <span className={hintClass}>
            Vypni pri službách s individuálnou cenou, ktoré sa dohodnú osobne.
          </span>
        </span>
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

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-[#d8ba74] disabled:opacity-50"
        >
          {pending ? "Ukladám…" : editing ? "Uložiť zmeny" : "Pridať službu"}
        </button>
        {editing && (
          <Link
            href="/admin/sluzby"
            className="text-sm text-muted transition-colors hover:text-cream"
          >
            Zrušiť úpravu
          </Link>
        )}
      </div>
    </form>
  );
}
