"use client";

import { useActionState } from "react";
import { createBooking, type BookingResult } from "./actions";

const initialState: BookingResult = { status: "idle" };

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

export function BookingForm({
  serviceId,
  dateStr,
  slot,
  serviceName,
  dateLabel,
  durationMin,
  priceLabel,
}: {
  serviceId: string;
  dateStr: string;
  slot: string;
  serviceName: string;
  dateLabel: string;
  durationMin: number;
  priceLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    createBooking,
    initialState,
  );

  // Potvrdzujúca obrazovka – formulár skrytý.
  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5">
        <h3 className="text-lg font-semibold text-green-800">
          Rezervácia potvrdená
        </h3>
        <p className="mt-2 text-sm text-green-900">
          {state.summary.serviceName}
          <br />
          {state.summary.dateLabel} o {state.summary.time}
        </p>
        <p className="mt-3 text-xs text-green-700">
          Tešíme sa na teba. Podrobnosti nájdeš v tomto potvrdení.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Zhrnutie nad formulárom */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Zhrnutie
        </p>
        <p className="mt-1 font-medium text-gray-900">{serviceName}</p>
        <p className="text-gray-600">
          {dateLabel} o {slot} · {durationMin} min · {priceLabel}
        </p>
      </div>

      {/* Hodnoty, ktoré server znova overí (nikdy im neverí naslepo). */}
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="date" value={dateStr} />
      <input type="hidden" name="slot" value={slot} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Meno</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            placeholder="Meno a priezvisko"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Telefón</span>
          <input
            type="tel"
            name="phone"
            required
            inputMode="tel"
            placeholder="+421 900 123 456"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">
          E-mail <span className="font-normal text-gray-400">(nepovinné)</span>
        </span>
        <input
          type="email"
          name="email"
          inputMode="email"
          placeholder="tvoj@email.sk"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-gray-400">
          Ak vyplníš, pošleme ti potvrdenie rezervácie.
        </span>
      </label>

      {state.status === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Rezervujem…" : "Rezervovať termín"}
      </button>
    </form>
  );
}
