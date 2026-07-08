import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEur, WEEKDAYS, hhmmToMinutes } from "@/lib/format";
import {
  formatDateOnly,
  formatDateInputUTC,
  todayLocalStartUTC,
  localDateStringToUTC,
  isoWeekdayUTC,
} from "@/lib/date";
import { computeFreeSlots } from "@/lib/slots";
import { BookingForm } from "./booking-form";

// Dočasná verejná stránka = booking flow (KROK 1: výber služby, KROK 2: deň,
// KROK 3: zobrazenie voľných slotov). Pekný hlavný dizajn príde samostatne.
// Kroky sú riešené cez query params (?service=&date=), takže sú to obyčajné
// odkazy – jednoduché a funkčné aj bez JS.
export const dynamic = "force-dynamic";

const DAYS_AHEAD = 14;

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; date?: string; slot?: string }>;
}) {
  const sp = await searchParams;

  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  const service = sp.service
    ? services.find((s) => s.id === sp.service)
    : undefined;

  // Predpočítaj dni a sloty (len keď je vybraná služba).
  const dayCells: {
    dateStr: string;
    label: string;
    available: boolean;
    selected: boolean;
  }[] = [];
  let selectedDate: Date | null = null;
  let slots: string[] = [];
  let selectedSlot: string | null = null;

  if (service) {
    const whWeekdays = new Set(
      (await prisma.workingHours.findMany({ select: { weekday: true } })).map(
        (w) => w.weekday,
      ),
    );
    const today = todayLocalStartUTC();
    for (let i = 0; i < DAYS_AHEAD; i++) {
      // UTC aritmetika: +1 deň = presne ďalšia UTC polnoc (kotva kal. dňa).
      const d = new Date(today.getTime() + i * 86_400_000);
      const dateStr = formatDateInputUTC(d);
      const wd = isoWeekdayUTC(d);
      dayCells.push({
        dateStr,
        label: `${WEEKDAYS[wd - 1].label.slice(0, 2)} ${formatDateOnly(d)}`,
        available: whWeekdays.has(wd),
        selected: sp.date === dateStr,
      });
    }
    selectedDate = sp.date ? localDateStringToUTC(sp.date) : null;
    if (selectedDate) {
      slots = await computeFreeSlots(service.durationMin, selectedDate);
      // Slot považujeme za vybraný, ak je to platný HH:MM (autoritatívnu
      // kontrolu voľnosti robí až server action pri odoslaní).
      selectedSlot =
        sp.slot && hhmmToMinutes(sp.slot) !== null ? sp.slot : null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Rezervácia</h1>
          <p className="text-sm text-gray-500">
            Vyber si službu, deň a voľný termín.
          </p>
        </header>

        {/* KROK 1 – výber služby */}
        {!service ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">1 · Služba</h2>
            {services.length === 0 ? (
              <p className="text-sm text-gray-500">
                Momentálne nie sú dostupné žiadne služby.
              </p>
            ) : (
              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/?service=${s.id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-400"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-sm text-gray-500">
                        {s.durationMin} min · {formatEur(s.priceCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            {/* Zhrnutie vybranej služby */}
            <section className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Služba
                </p>
                <p className="font-medium">
                  {service.name} · {service.durationMin} min ·{" "}
                  {formatEur(service.priceCents)}
                </p>
              </div>
              <Link href="/" className="text-sm text-gray-500 hover:underline">
                Zmeniť
              </Link>
            </section>

            {/* KROK 2 – výber dňa */}
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-gray-500">2 · Deň</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dayCells.map((c) =>
                  c.available ? (
                    <Link
                      key={c.dateStr}
                      href={`/?service=${service.id}&date=${c.dateStr}`}
                      aria-current={c.selected ? "true" : undefined}
                      className={
                        "rounded-md border px-3 py-2 text-center text-sm transition-colors " +
                        (c.selected
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-800 hover:border-gray-500")
                      }
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      key={c.dateStr}
                      title="Zatvorené"
                      className="cursor-not-allowed rounded-md border border-dashed border-gray-200 px-3 py-2 text-center text-sm text-gray-300"
                    >
                      {c.label}
                    </span>
                  ),
                )}
              </div>
            </section>

            {/* KROK 3 – voľné sloty */}
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-gray-500">
                3 · Voľný termín
              </h2>
              {!selectedDate ? (
                <p className="text-sm text-gray-500">Najprv vyber deň vyššie.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500">
                  V tento deň nie sú žiadne voľné termíny.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {formatDateOnly(selectedDate)}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {slots.map((t) => {
                      const isSel = t === selectedSlot;
                      return (
                        <Link
                          key={t}
                          href={`/?service=${service.id}&date=${sp.date}&slot=${encodeURIComponent(
                            t,
                          )}`}
                          scroll={false}
                          aria-pressed={isSel}
                          className={
                            "rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors " +
                            (isSel
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 bg-white text-gray-800 hover:border-gray-500")
                          }
                        >
                          {t}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* KROK 4 – údaje zákazníka + odoslanie (po výbere slotu) */}
            {selectedDate && selectedSlot && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-gray-500">
                  4 · Tvoje údaje
                </h2>
                <BookingForm
                  serviceId={service.id}
                  dateStr={sp.date ?? ""}
                  slot={selectedSlot}
                  serviceName={service.name}
                  dateLabel={formatDateOnly(selectedDate)}
                  durationMin={service.durationMin}
                  priceLabel={formatEur(service.priceCents)}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
