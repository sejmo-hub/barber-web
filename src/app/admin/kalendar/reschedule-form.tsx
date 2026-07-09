"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  fetchRescheduleSlots,
  rescheduleBooking,
  type RescheduleResult,
} from "./actions";

const initial: RescheduleResult = { status: "idle" };

// "YYYY-MM-DD" → "10. 7. 2026" (klientské, len na zhrnutie).
function labelFromDateStr(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${Number(m[3])}. ${Number(m[2])}. ${m[1]}`;
}

export function RescheduleForm({
  bookingId,
  customerName,
  customerEmail,
  currentDateStr,
  currentDateLabel,
  currentTimeLabel,
  view,
  refDateStr,
}: {
  bookingId: string;
  customerName: string;
  customerEmail: string | null;
  currentDateStr: string;
  currentDateLabel: string;
  currentTimeLabel: string;
  view: string;
  refDateStr: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDateStr);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [notify, setNotify] = useState(!!customerEmail);
  const [state, formAction] = useActionState(rescheduleBooking, initial);

  // Načítaj voľné sloty pri otvorení a pri každej zmene dátumu.
  useEffect(() => {
    if (!open) return;
    setSlot(null);
    setSlotsError(null);
    startLoad(async () => {
      const res = await fetchRescheduleSlots(bookingId, date);
      if (res.error) {
        setSlots([]);
        setSlotsError(res.error);
      } else {
        setSlots(res.slots);
      }
    });
  }, [open, date, bookingId]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/20"
      >
        Presunúť
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-line bg-ink2/60 p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="date" value={refDateStr} />
      <input type="hidden" name="newSlot" value={slot ?? ""} />

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
        Presun termínu
      </p>

      {/* Dátum – bez obmedzenia na budúcnosť (admin smie aj spätne). */}
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Nový dátum</span>
        <input
          type="date"
          name="newDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-sm border border-line bg-ink2 px-3 py-2 text-sm text-cream [color-scheme:dark] focus:border-gold focus:outline-none"
        />
      </label>

      {/* Voľné sloty pre zvolený deň */}
      <div>
        <span className="mb-1 block text-sm text-muted">Nový čas</span>
        {loading ? (
          <p className="text-sm text-muted">Načítavam voľné termíny…</p>
        ) : slotsError ? (
          <p className="text-sm text-red-300">{slotsError}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">
            V tento deň nie sú voľné termíny (mimo hodín, voľno alebo plno).
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                aria-pressed={slot === s}
                className={
                  "rounded-sm border px-2 py-1.5 text-center font-mono text-sm transition-colors " +
                  (slot === s
                    ? "border-gold bg-gold font-medium text-ink"
                    : "border-line bg-panel text-cream hover:border-gold/60")
                }
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifikačný e-mail */}
      <label className="flex items-start gap-2 text-sm text-cream">
        <input
          type="checkbox"
          name="notify"
          checked={notify}
          disabled={!customerEmail}
          onChange={(e) => setNotify(e.target.checked)}
          className="mt-0.5 accent-[#c9a961] disabled:opacity-40"
        />
        <span className={customerEmail ? "" : "text-muted"}>
          {customerEmail
            ? "Poslať zákazníkovi e-mail o zmene"
            : "Zákazník nezadal e-mail — nepošle sa nič."}
        </span>
      </label>

      {/* Zhrnutie */}
      {slot && (
        <p className="rounded-sm border border-line bg-panel px-3 py-2 text-sm text-cream">
          Presunúť <span className="font-medium">{customerName}</span>:{" "}
          <span className="text-muted">
            {currentDateLabel} {currentTimeLabel}
          </span>{" "}
          →{" "}
          <span className="text-gold">
            {labelFromDateStr(date)} {slot}
          </span>
          ?
        </p>
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-line px-4 py-2 text-sm text-cream hover:bg-white/5"
        >
          Späť
        </button>
        <ConfirmButton disabled={!slot} />
      </div>
    </form>
  );
}

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex-1 rounded-md bg-gradient-to-b from-gold to-gold-deep px-4 py-2 text-sm font-bold text-ink transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Presúvam…" : "Presunúť termín"}
    </button>
  );
}
