"use client";

import Image from "next/image";
import { useActionState } from "react";
import { createBooking, type BookingResult } from "./actions";

const initialState: BookingResult = { status: "idle" };

// Malý „Strihá: Simon" prvok s kruhovou fotkou majiteľa – v zhrnutí aj na
// potvrdení. object-position posunuté hore, aby bola v kruhu vidno tvár.
function BarberBadge() {
  return (
    <div className="mt-2 flex items-center gap-2.5">
      <Image
        src="/simon.png"
        alt="Simon"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-gold"
        style={{ objectPosition: "50% 26%" }}
      />
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Strihá: <span className="text-gold">Simon</span>
      </span>
    </div>
  );
}

const inputClass =
  "w-full rounded-sm border border-line bg-ink2 px-3 py-2.5 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none";

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
      <div className="rounded-sm border border-gold/40 bg-gold/5 p-6">
        <h3 className="font-display text-2xl uppercase text-gold">
          Rezervácia potvrdená
        </h3>
        <p className="mt-3 text-cream">
          {state.summary.serviceName}
          <br />
          {state.summary.dateLabel} o {state.summary.time}
        </p>
        <BarberBadge />
        <p className="mt-4 text-xs text-muted">
          Tešíme sa na teba. Ak si zadal e-mail, potvrdenie ti príde do schránky.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Zhrnutie nad formulárom */}
      <div className="rounded-sm border border-line bg-panel p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          Zhrnutie
        </p>
        <p className="mt-1 font-display text-xl uppercase text-cream">
          {serviceName}
        </p>
        <p className="mt-1 font-mono text-sm text-muted">
          {dateLabel} · {slot} · {durationMin} min ·{" "}
          <span className="text-gold">{priceLabel}</span>
        </p>
        <BarberBadge />
      </div>

      {/* Hodnoty, ktoré server znova overí (nikdy im neverí naslepo). */}
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="date" value={dateStr} />
      <input type="hidden" name="slot" value={slot} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-cream">
            Meno a priezvisko
          </span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="napr. Ján Novák"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-cream">Telefón</span>
          <input
            type="tel"
            name="phone"
            required
            inputMode="tel"
            maxLength={20}
            placeholder="+421 944 123 456"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-cream">
          E-mail <span className="font-normal text-muted">(nepovinné)</span>
        </span>
        <input
          type="email"
          name="email"
          inputMode="email"
          maxLength={200}
          placeholder="tvoj@email.sk"
          className={inputClass}
        />
        <span className="mt-1.5 block text-xs text-muted">
          Ak vyplníš, pošleme ti potvrdenie rezervácie.
        </span>
      </label>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-gradient-to-b from-gold to-gold-deep px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-ink transition-all duration-300 hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Rezervujem…" : "Rezervovať termín"}
      </button>
    </form>
  );
}
