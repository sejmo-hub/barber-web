import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatServicePrice, WEEKDAYS, hhmmToMinutes } from "@/lib/format";
import {
  formatDateOnly,
  formatDateInputUTC,
  todayLocalStartUTC,
  localDateStringToUTC,
  isoWeekdayUTC,
} from "@/lib/date";
import { computeFreeSlots } from "@/lib/slots";
import { BookingForm } from "./booking-form";

// Verejný booking flow (KROK 1: výber služby, KROK 2: deň, KROK 3: sloty,
// KROK 4: údaje). Kroky cez query params (?service=&date=&slot=) → obyčajné
// odkazy, funguje aj bez JS. Tmavý brand konzistentný s hlavnou stránkou.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rezervácia",
  description:
    "Rezervuj si termín v Simon'S The Barber v Kuklove — vyber službu, deň a voľný čas.",
};

const DAYS_AHEAD = 14;

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; date?: string; slot?: string }>;
}) {
  const sp = await searchParams;

  // Len rezervovateľné služby – nerezervovateľné (napr. farbenie s cenovým
  // rozsahom) sa v rezervačnom toku nezobrazujú.
  const services = await prisma.service.findMany({
    where: { active: true, bookable: true },
    orderBy: { name: "asc" },
  });
  const service = sp.service
    ? services.find((s) => s.id === sp.service)
    : undefined;

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
      selectedSlot =
        sp.slot && hhmmToMinutes(sp.slot) !== null ? sp.slot : null;
    }
  }

  return (
    <div className="min-h-screen bg-ink text-cream">
      {/* Hlavička konzistentná s hlavnou stránkou */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="Simon'S The Barber — domov" className="leading-none">
            <span className="block font-display text-xl uppercase leading-none text-cream">
              Simon&#39;s
            </span>
            <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.35em] text-muted">
              <span className="text-gold">The</span> Barber
            </span>
          </Link>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
          >
            ← Späť na hlavnú
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
            Rezervácia
          </span>
          <h1 className="mt-2 font-display text-4xl uppercase leading-none text-cream sm:text-5xl">
            Vyber si termín
          </h1>
        </div>

        {/* KROK 1 – výber služby */}
        {!service ? (
          <section className="space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gold">
              01 · Služba
            </h2>
            {services.length === 0 ? (
              <p className="text-sm text-muted">
                Momentálne nie sú dostupné žiadne služby.
              </p>
            ) : (
              <ul className="space-y-3">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/rezervacia?service=${s.id}`}
                      className="group flex items-center justify-between rounded-sm border border-line bg-panel px-5 py-4 transition-colors duration-300 hover:border-gold/60"
                    >
                      <span className="font-display text-xl uppercase text-cream">
                        {s.name}
                      </span>
                      <span className="font-mono text-sm text-muted transition-colors group-hover:text-gold">
                        {s.durationMin} min · {formatServicePrice(s.priceCents, s.priceMaxCents)}
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
            <section className="flex items-center justify-between rounded-sm border border-line bg-panel px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                  Služba
                </p>
                <p className="mt-1 font-medium text-cream">
                  {service.name} · {service.durationMin} min ·{" "}
                  <span className="text-gold">{formatServicePrice(service.priceCents, service.priceMaxCents)}</span>
                </p>
              </div>
              <Link
                href="/rezervacia"
                className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
              >
                Zmeniť
              </Link>
            </section>

            {/* KROK 2 – výber dňa */}
            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-widest text-gold">
                02 · Deň
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dayCells.map((c) =>
                  c.available ? (
                    <Link
                      key={c.dateStr}
                      href={`/rezervacia?service=${service.id}&date=${c.dateStr}`}
                      aria-current={c.selected ? "true" : undefined}
                      className={
                        "rounded-sm border px-3 py-2 text-center text-sm transition-colors " +
                        (c.selected
                          ? "border-gold bg-gold font-medium text-ink"
                          : "border-line bg-panel text-cream hover:border-gold/60")
                      }
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      key={c.dateStr}
                      title="Zatvorené"
                      className="cursor-not-allowed rounded-sm border border-dashed border-line px-3 py-2 text-center text-sm text-muted/40"
                    >
                      {c.label}
                    </span>
                  ),
                )}
              </div>
            </section>

            {/* KROK 3 – voľné sloty */}
            <section className="space-y-4">
              <h2 className="font-mono text-xs uppercase tracking-widest text-gold">
                03 · Voľný termín
              </h2>
              {!selectedDate ? (
                <p className="text-sm text-muted">Najprv vyber deň vyššie.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">
                  V tento deň nie sú žiadne voľné termíny.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    {formatDateOnly(selectedDate)}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {slots.map((t) => {
                      const isSel = t === selectedSlot;
                      return (
                        <Link
                          key={t}
                          href={`/rezervacia?service=${service.id}&date=${sp.date}&slot=${encodeURIComponent(
                            t,
                          )}`}
                          scroll={false}
                          aria-pressed={isSel}
                          className={
                            "rounded-sm border px-3 py-2 text-center font-mono text-sm transition-colors " +
                            (isSel
                              ? "border-gold bg-gold font-medium text-ink"
                              : "border-line bg-panel text-cream hover:border-gold/60")
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
              <section className="space-y-4">
                <h2 className="font-mono text-xs uppercase tracking-widest text-gold">
                  04 · Tvoje údaje
                </h2>
                <BookingForm
                  serviceId={service.id}
                  dateStr={sp.date ?? ""}
                  slot={selectedSlot}
                  serviceName={service.name}
                  dateLabel={formatDateOnly(selectedDate)}
                  durationMin={service.durationMin}
                  priceLabel={formatServicePrice(service.priceCents, service.priceMaxCents)}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
