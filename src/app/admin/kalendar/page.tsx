import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { formatServicePrice, minutesToHHMM, WEEKDAYS } from "@/lib/format";
import {
  formatDateOnly,
  formatDateInputUTC,
  todayLocalStartUTC,
  localDateStringToUTC,
  localMinutesToUtc,
  isoWeekdayUTC,
  utcToLocalParts,
} from "@/lib/date";
import { CancelButton } from "./cancel-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Kalendár" };

const HOUR_PX = 96; // výška jednej hodiny v px
const MIN_PX = HOUR_PX / 60;
const DAY_MS = 86_400_000;

type BlockData = {
  id: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  name: string;
  service: string;
};
type DayData = {
  dateStr: string;
  weekdayLabel: string;
  dayMonth: string;
  isToday: boolean;
  isOpen: boolean;
  whBlocks: { startMinute: number; endMinute: number }[];
  bookings: BlockData[];
};

function rezervacieLabel(n: number): string {
  if (n === 0) return "žiadne rezervácie";
  if (n === 1) return "1 rezervácia";
  if (n >= 2 && n <= 4) return `${n} rezervácie`;
  return `${n} rezervácií`;
}

function href(view: string, dateStr: string): string {
  return `/admin/kalendar?view=${view}&date=${dateStr}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; booking?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "day" ? "day" : "week";
  const today = todayLocalStartUTC();
  const refDate =
    (sp.date && localDateStringToUTC(sp.date)) || today;
  const refDateStr = formatDateInputUTC(refDate);

  // Dni na zobrazenie (kotvy = UTC polnoc lokálneho dňa).
  const dayAnchors: Date[] = [];
  if (view === "week") {
    const monday = new Date(refDate.getTime() - (isoWeekdayUTC(refDate) - 1) * DAY_MS);
    for (let i = 0; i < 7; i++) dayAnchors.push(new Date(monday.getTime() + i * DAY_MS));
  } else {
    dayAnchors.push(refDate);
  }

  // Pracovné hodiny (na časovú os aj tieňovanie).
  const wh = await prisma.workingHours.findMany({
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  const whByWeekday = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (const w of wh) {
    const arr = whByWeekday.get(w.weekday) ?? [];
    arr.push({ startMinute: w.startMinute, endMinute: w.endMinute });
    whByWeekday.set(w.weekday, arr);
  }
  // Časová os z pracovných hodín (zaokrúhlená na hodinu, malá rezerva). Fallback 8–18.
  let axisStart = 8 * 60;
  let axisEnd = 18 * 60;
  if (wh.length > 0) {
    const minStart = Math.min(...wh.map((w) => w.startMinute));
    const maxEnd = Math.max(...wh.map((w) => w.endMinute));
    axisStart = Math.floor(minStart / 60) * 60;
    axisEnd = Math.ceil(maxEnd / 60) * 60;
    if (axisEnd - axisStart < 120) axisEnd = axisStart + 120;
  }

  // CONFIRMED rezervácie v zobrazenom rozsahu.
  const rangeStartUtc = localMinutesToUtc(dayAnchors[0], 0);
  const rangeEndUtc = localMinutesToUtc(dayAnchors[dayAnchors.length - 1], 24 * 60);
  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      startAt: { lt: rangeEndUtc },
      endAt: { gt: rangeStartUtc },
    },
    include: { service: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });

  // Rezervácie zoskupené podľa lokálneho dňa.
  const blocksByDay = new Map<string, BlockData[]>();
  for (const b of bookings) {
    const s = utcToLocalParts(b.startAt);
    const e = utcToLocalParts(b.endAt);
    const arr = blocksByDay.get(s.dateStr) ?? [];
    arr.push({
      id: b.id,
      startMin: s.minutes,
      endMin: e.minutes,
      timeLabel: `${minutesToHHMM(s.minutes)}–${minutesToHHMM(e.minutes)}`,
      name: b.customerName,
      service: b.service.name,
    });
    blocksByDay.set(s.dateStr, arr);
  }

  const days: DayData[] = dayAnchors.map((anchor) => {
    const dateStr = formatDateInputUTC(anchor);
    const iso = isoWeekdayUTC(anchor);
    return {
      dateStr,
      weekdayLabel: WEEKDAYS[iso - 1].label,
      dayMonth: `${anchor.getUTCDate()}.${anchor.getUTCMonth() + 1}.`,
      isToday: anchor.getTime() === today.getTime(),
      isOpen: (whByWeekday.get(iso)?.length ?? 0) > 0,
      whBlocks: whByWeekday.get(iso) ?? [],
      bookings: blocksByDay.get(dateStr) ?? [],
    };
  });

  // Detail rezervácie (modal), ak je booking v URL.
  const detail = sp.booking
    ? await prisma.booking.findUnique({
        where: { id: sp.booking },
        include: { service: true },
      })
    : null;

  const step = view === "week" ? 7 : 1;
  const prevStr = formatDateInputUTC(new Date(refDate.getTime() - step * DAY_MS));
  const nextStr = formatDateInputUTC(new Date(refDate.getTime() + step * DAY_MS));
  const todayStr = formatDateInputUTC(today);

  const rangeTitle =
    view === "week"
      ? `${formatDateOnly(dayAnchors[0])} – ${formatDateOnly(dayAnchors[6])}`
      : `${WEEKDAYS[isoWeekdayUTC(refDate) - 1].label} ${formatDateOnly(refDate)}`;

  return (
    <div>
      {/* Ovládanie */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cream">Kalendár</h1>
          <p className="text-sm text-muted">{rangeTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-line p-0.5">
            {(["week", "day"] as const).map((v) => (
              <Link
                key={v}
                href={href(v, refDateStr)}
                aria-current={view === v ? "true" : undefined}
                className={
                  "rounded px-3 py-1 text-sm " +
                  (view === v
                    ? "bg-gold font-medium text-ink"
                    : "text-muted hover:text-cream")
                }
              >
                {v === "week" ? "Týždeň" : "Deň"}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={href(view, prevStr)}
              aria-label="Predošlé"
              className="rounded-md border border-line px-2.5 py-1 text-cream hover:border-gold/60"
            >
              ‹
            </Link>
            <Link
              href={href(view, todayStr)}
              className="rounded-md border border-line px-3 py-1 text-sm text-cream hover:border-gold/60"
            >
              Dnes
            </Link>
            <Link
              href={href(view, nextStr)}
              aria-label="Nasledujúce"
              className="rounded-md border border-line px-2.5 py-1 text-cream hover:border-gold/60"
            >
              ›
            </Link>
          </div>
        </div>
      </div>

      {/* Deň: časová mriežka (funguje aj na mobile). Týždeň: mriežka na desktope,
          zoznam na mobile. */}
      {view === "day" ? (
        <TimeGrid days={days} axisStart={axisStart} axisEnd={axisEnd} view={view} refDateStr={refDateStr} />
      ) : (
        <>
          <div className="hidden md:block">
            <TimeGrid days={days} axisStart={axisStart} axisEnd={axisEnd} view={view} refDateStr={refDateStr} />
          </div>
          <div className="md:hidden">
            <WeekList days={days} view={view} refDateStr={refDateStr} />
          </div>
        </>
      )}

      {detail && (
        <BookingModal
          booking={detail}
          view={view}
          refDateStr={refDateStr}
        />
      )}
    </div>
  );
}

// ---- Časová mriežka (1 alebo 7 stĺpcov) ----------------------------------

function TimeGrid({
  days,
  axisStart,
  axisEnd,
  view,
  refDateStr,
}: {
  days: DayData[];
  axisStart: number;
  axisEnd: number;
  view: string;
  refDateStr: string;
}) {
  const gridHeight = (axisEnd - axisStart) * MIN_PX;
  const hours: number[] = [];
  for (let h = axisStart; h <= axisEnd; h += 60) hours.push(h);

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-panel">
      <div
        className="grid min-w-full"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(120px, 1fr))` }}
      >
        {/* hlavičkový riadok */}
        <div className="border-b border-line" />
        {days.map((d) => (
          <div
            key={d.dateStr}
            className={
              "border-b border-l border-line px-2 py-2 text-center " +
              (d.isToday ? "bg-gold/5" : "")
            }
          >
            <div className={"text-sm font-medium " + (d.isToday ? "text-gold" : "text-cream")}>
              {d.weekdayLabel} <span className="text-muted">{d.dayMonth}</span>
            </div>
            <div className="text-[11px] text-muted">{rezervacieLabel(d.bookings.length)}</div>
          </div>
        ))}

        {/* telo: časová os + stĺpce dní */}
        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted"
              style={{ top: (h - axisStart) * MIN_PX }}
            >
              {minutesToHHMM(h)}
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div
            key={d.dateStr}
            className="relative border-l border-line"
            style={{
              height: gridHeight,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${HOUR_PX}px)`,
            }}
          >
            {/* tieňovanie pracovných hodín */}
            {d.whBlocks.map((b, i) => (
              <div
                key={i}
                className="absolute inset-x-0 bg-white/[0.015]"
                style={{
                  top: (b.startMinute - axisStart) * MIN_PX,
                  height: (b.endMinute - b.startMinute) * MIN_PX,
                }}
              />
            ))}
            {/* prázdny deň */}
            {d.bookings.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted/70">
                {d.isOpen ? "voľné" : "zatvorené"}
              </div>
            )}
            {/* rezervácie */}
            {d.bookings.map((bk) => (
              <Link
                key={bk.id}
                href={`/admin/kalendar?view=${view}&date=${refDateStr}&booking=${bk.id}`}
                scroll={false}
                className="absolute inset-x-1 overflow-hidden rounded-md border border-gold/50 bg-gold/10 px-2 py-1 text-left hover:border-gold hover:bg-gold/20"
                style={{
                  top: (bk.startMin - axisStart) * MIN_PX,
                  height: Math.max((bk.endMin - bk.startMin) * MIN_PX - 2, 22),
                }}
              >
                <div className="text-[11px] font-semibold leading-tight text-gold">
                  {bk.timeLabel}
                </div>
                <div className="truncate text-xs leading-tight text-cream">{bk.name}</div>
                <div className="truncate text-[11px] leading-tight text-muted">{bk.service}</div>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Mobilný zoznam (týždenný pohľad na malej obrazovke) ------------------

function WeekList({
  days,
  view,
  refDateStr,
}: {
  days: DayData[];
  view: string;
  refDateStr: string;
}) {
  return (
    <div className="space-y-3">
      {days.map((d) => (
        <div
          key={d.dateStr}
          className={
            "rounded-lg border p-3 " +
            (d.isToday ? "border-gold/40 bg-gold/5" : "border-line bg-panel")
          }
        >
          <div className="flex items-baseline justify-between">
            <span className={"font-medium " + (d.isToday ? "text-gold" : "text-cream")}>
              {d.weekdayLabel} <span className="text-muted">{d.dayMonth}</span>
            </span>
            <span className="text-xs text-muted">{rezervacieLabel(d.bookings.length)}</span>
          </div>
          {d.bookings.length === 0 ? (
            <p className="mt-2 text-sm text-muted/70">{d.isOpen ? "Voľný deň." : "Zatvorené."}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {d.bookings.map((bk) => (
                <li key={bk.id}>
                  <Link
                    href={`/admin/kalendar?view=${view}&date=${refDateStr}&booking=${bk.id}`}
                    scroll={false}
                    className="flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 hover:bg-gold/20"
                  >
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gold">
                      {bk.timeLabel}
                    </span>
                    <span className="truncate text-sm text-cream">{bk.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">{bk.service}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Detail rezervácie (modal) -------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-cream">{children}</span>
    </div>
  );
}

function BookingModal({
  booking,
  view,
  refDateStr,
}: {
  booking: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    startAt: Date;
    endAt: Date;
    status: string;
    service: {
      name: string;
      durationMin: number;
      priceCents: number;
      priceMaxCents: number | null;
    };
  };
  view: string;
  refDateStr: string;
}) {
  const s = utcToLocalParts(booking.startAt);
  const e = utcToLocalParts(booking.endAt);
  const dayAnchor = localDateStringToUTC(s.dateStr)!;
  const dateLabel = formatDateOnly(dayAnchor);
  const timeLabel = `${minutesToHHMM(s.minutes)}–${minutesToHHMM(e.minutes)}`;
  const durationMin = Math.round((booking.endAt.getTime() - booking.startAt.getTime()) / 60000);
  const closeHref = href(view, refDateStr);
  const isConfirmed = booking.status === "CONFIRMED";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* backdrop – klik zavrie */}
      <Link href={closeHref} scroll={false} aria-label="Zavrieť" className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-line bg-panel p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 id="booking-modal-title" className="text-lg font-semibold text-cream">{booking.customerName}</h2>
            {!isConfirmed && (
              <span className="text-xs font-medium text-red-400">Zrušená rezervácia</span>
            )}
          </div>
          <Link href={closeHref} scroll={false} className="text-muted hover:text-cream" aria-label="Zavrieť">
            ✕
          </Link>
        </div>

        <div className="mb-4">
          <DetailRow label="Telefón">
            <a href={`tel:${booking.customerPhone.replace(/\s/g, "")}`} className="text-gold hover:underline">
              {booking.customerPhone}
            </a>
          </DetailRow>
          {booking.customerEmail && (
            <DetailRow label="E-mail">
              <a href={`mailto:${booking.customerEmail}`} className="text-gold hover:underline">
                {booking.customerEmail}
              </a>
            </DetailRow>
          )}
          <DetailRow label="Služba">{booking.service.name}</DetailRow>
          <DetailRow label="Dátum">{dateLabel}</DetailRow>
          <DetailRow label="Čas">{timeLabel}</DetailRow>
          <DetailRow label="Dĺžka">{durationMin} min</DetailRow>
          <DetailRow label="Cena">
            {formatServicePrice(booking.service.priceCents, booking.service.priceMaxCents)}
          </DetailRow>
        </div>

        {isConfirmed ? (
          <CancelButton
            id={booking.id}
            view={view}
            date={refDateStr}
            confirmLabel={`${booking.customerName}, ${dateLabel} ${minutesToHHMM(s.minutes)}`}
          />
        ) : (
          <Link
            href={closeHref}
            scroll={false}
            className="block w-full rounded-md border border-line px-4 py-2 text-center text-sm text-cream hover:bg-white/5"
          >
            Zavrieť
          </Link>
        )}
      </div>
    </div>
  );
}
