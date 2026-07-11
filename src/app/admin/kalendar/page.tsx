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
import { RescheduleForm } from "./reschedule-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Kalendár" };

// Výška jednej hodiny (px). Týždeň = kompaktný (celý deň sa zmestí bez scrollu),
// deň = vyšší (bloky ako tap-targety ≥44px na mobile; vertikálny scroll je OK).
const HOUR_PX_WEEK = 46;
const HOUR_PX_DAY = 88;
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
  weekdayShort: string;
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

// URL kalendára. viewParam môže byť "" (default = responzívne: desktop týždeň,
// mobil deň) – vtedy sa view do URL nedáva, aby sa default zachoval.
function href(viewParam: string, dateStr: string): string {
  const v = viewParam ? `view=${viewParam}&` : "";
  return `/admin/kalendar?${v}date=${dateStr}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; booking?: string }>;
}) {
  const sp = await searchParams;
  // rawView: explicitne zvolený pohľad (alebo undefined = default).
  const rawView =
    sp.view === "day" ? "day" : sp.view === "week" ? "week" : undefined;
  const viewParam = rawView ?? "";
  const view = rawView ?? "week"; // pre dáta + desktop default

  const today = todayLocalStartUTC();
  const refDate = (sp.date && localDateStringToUTC(sp.date)) || today;
  const refDateStr = formatDateInputUTC(refDate);

  // Vždy postavíme celý týždeň (7 dní) – deň grid si potom vyberie refDate.
  const monday = new Date(
    refDate.getTime() - (isoWeekdayUTC(refDate) - 1) * DAY_MS,
  );
  const weekAnchors: Date[] = [];
  for (let i = 0; i < 7; i++)
    weekAnchors.push(new Date(monday.getTime() + i * DAY_MS));

  // Pracovné hodiny (na časovú os aj tieňovanie).
  const wh = await prisma.workingHours.findMany({
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  const whByWeekday = new Map<
    number,
    { startMinute: number; endMinute: number }[]
  >();
  for (const w of wh) {
    const arr = whByWeekday.get(w.weekday) ?? [];
    arr.push({ startMinute: w.startMinute, endMinute: w.endMinute });
    whByWeekday.set(w.weekday, arr);
  }
  // Časová os z pracovných hodín (zaokrúhlená na hodinu). Fallback 8–18.
  let axisStart = 8 * 60;
  let axisEnd = 18 * 60;
  if (wh.length > 0) {
    const minStart = Math.min(...wh.map((w) => w.startMinute));
    const maxEnd = Math.max(...wh.map((w) => w.endMinute));
    axisStart = Math.floor(minStart / 60) * 60;
    axisEnd = Math.ceil(maxEnd / 60) * 60;
    if (axisEnd - axisStart < 120) axisEnd = axisStart + 120;
  }

  // CONFIRMED rezervácie v rozsahu týždňa.
  const rangeStartUtc = localMinutesToUtc(weekAnchors[0], 0);
  const rangeEndUtc = localMinutesToUtc(weekAnchors[6], 24 * 60);
  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      startAt: { lt: rangeEndUtc },
      endAt: { gt: rangeStartUtc },
    },
    include: { service: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });

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

  const weekDays: DayData[] = weekAnchors.map((anchor) => {
    const dateStr = formatDateInputUTC(anchor);
    const iso = isoWeekdayUTC(anchor);
    return {
      dateStr,
      weekdayShort: WEEKDAYS[iso - 1].label.slice(0, 2),
      dayMonth: `${anchor.getUTCDate()}.${anchor.getUTCMonth() + 1}.`,
      isToday: anchor.getTime() === today.getTime(),
      isOpen: (whByWeekday.get(iso)?.length ?? 0) > 0,
      whBlocks: whByWeekday.get(iso) ?? [],
      bookings: blocksByDay.get(dateStr) ?? [],
    };
  });
  const refDay =
    weekDays.find((d) => d.dateStr === refDateStr) ?? weekDays[0];

  // Detail rezervácie (modal), ak je booking v URL.
  const detail = sp.booking
    ? await prisma.booking.findUnique({
        where: { id: sp.booking },
        include: { service: true },
      })
    : null;

  const todayStr = formatDateInputUTC(today);
  const shift = (days: number) =>
    formatDateInputUTC(new Date(refDate.getTime() + days * DAY_MS));
  // Krok navigácie: desktop podľa view, mobil deň (7 len ak explicitný týždeň).
  const desktopStep = view === "day" ? 1 : 7;
  const mobileStep = rawView === "week" ? 7 : 1;

  const weekRange = `${formatDateOnly(weekAnchors[0])} – ${formatDateOnly(weekAnchors[6])}`;
  const dayTitle = `${WEEKDAYS[isoWeekdayUTC(refDate) - 1].label} ${formatDateOnly(refDate)}`;

  return (
    <div>
      {/* Ovládanie */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cream">Kalendár</h1>
          {/* podnadpis: desktop podľa view, mobil podľa mobilného pohľadu */}
          <p className="hidden text-sm text-muted md:block">
            {view === "day" ? dayTitle : weekRange}
          </p>
          <p className="text-sm text-muted md:hidden">
            {rawView === "week" ? weekRange : dayTitle}
          </p>
        </div>

        {/* DESKTOP nav */}
        <div className="hidden items-center gap-2 md:flex">
          <ViewToggle refDateStr={refDateStr} active={view} />
          <NavArrows
            prevHref={href(viewParam, shift(-desktopStep))}
            todayHref={href(viewParam, todayStr)}
            nextHref={href(viewParam, shift(desktopStep))}
          />
        </div>

        {/* MOBIL nav */}
        <div className="flex items-center gap-2 md:hidden">
          <ViewToggle
            refDateStr={refDateStr}
            active={rawView === "week" ? "week" : "day"}
          />
          <NavArrows
            prevHref={href(viewParam, shift(-mobileStep))}
            todayHref={href(viewParam, todayStr)}
            nextHref={href(viewParam, shift(mobileStep))}
          />
        </div>
      </div>

      {/* DESKTOP: týždeň grid (kompaktný) alebo deň grid */}
      <div className="hidden md:block">
        {rawView === "day" ? (
          <TimeGrid
            days={[refDay]}
            axisStart={axisStart}
            axisEnd={axisEnd}
            hourPx={HOUR_PX_DAY}
            viewParam={viewParam}
            refDateStr={refDateStr}
          />
        ) : (
          <TimeGrid
            days={weekDays}
            axisStart={axisStart}
            axisEnd={axisEnd}
            hourPx={HOUR_PX_WEEK}
            viewParam={viewParam}
            refDateStr={refDateStr}
          />
        )}
      </div>

      {/* MOBIL: default/deň = denný grid; explicitný týždeň = zoznam */}
      <div className="md:hidden">
        {rawView === "week" ? (
          <WeekList days={weekDays} viewParam={viewParam} refDateStr={refDateStr} />
        ) : (
          <TimeGrid
            days={[refDay]}
            axisStart={axisStart}
            axisEnd={axisEnd}
            hourPx={HOUR_PX_DAY}
            viewParam={viewParam}
            refDateStr={refDateStr}
          />
        )}
      </div>

      {detail && (
        <BookingModal booking={detail} viewParam={viewParam} refDateStr={refDateStr} />
      )}
    </div>
  );
}

// ---- Ovládacie prvky ------------------------------------------------------

function ViewToggle({
  refDateStr,
  active,
}: {
  refDateStr: string;
  active: "week" | "day";
}) {
  return (
    <div className="flex rounded-md border border-line p-0.5">
      {(["week", "day"] as const).map((v) => (
        <Link
          key={v}
          href={href(v, refDateStr)}
          aria-current={active === v ? "true" : undefined}
          className={
            "flex min-h-[44px] items-center rounded px-3 py-1 text-sm md:min-h-[36px] " +
            (active === v
              ? "bg-gold font-medium text-ink"
              : "text-muted hover:text-cream")
          }
        >
          {v === "week" ? "Týždeň" : "Deň"}
        </Link>
      ))}
    </div>
  );
}

function NavArrows({
  prevHref,
  todayHref,
  nextHref,
}: {
  prevHref: string;
  todayHref: string;
  nextHref: string;
}) {
  const btn =
    "flex min-h-[44px] items-center justify-center rounded-md border border-line text-cream hover:border-gold/60 md:min-h-[36px]";
  return (
    <div className="flex items-center gap-1">
      <Link href={prevHref} aria-label="Predošlé" className={`${btn} w-11 md:w-9`}>
        ‹
      </Link>
      <Link href={todayHref} className={`${btn} px-3 text-sm`}>
        Dnes
      </Link>
      <Link href={nextHref} aria-label="Nasledujúce" className={`${btn} w-11 md:w-9`}>
        ›
      </Link>
    </div>
  );
}

// ---- Časová mriežka (1 alebo 7 stĺpcov) ----------------------------------

function TimeGrid({
  days,
  axisStart,
  axisEnd,
  hourPx,
  viewParam,
  refDateStr,
}: {
  days: DayData[];
  axisStart: number;
  axisEnd: number;
  hourPx: number;
  viewParam: string;
  refDateStr: string;
}) {
  const minPx = hourPx / 60;
  const gridHeight = (axisEnd - axisStart) * minPx;
  const hours: number[] = [];
  for (let h = axisStart; h <= axisEnd; h += 60) hours.push(h);

  const single = days.length === 1;
  // Deň: 1 stĺpec cez celú šírku (žiadny horizontálny scroll). Týždeň: kompaktné
  // stĺpce s poistkou overflow-x-auto pre užšie desktopy.
  const cols = single
    ? "44px minmax(0,1fr)"
    : `44px repeat(${days.length}, minmax(76px,1fr))`;
  const minTap = hourPx >= 80 ? 44 : 22; // tap-target v dennom pohľade

  return (
    <div
      className={
        "rounded-lg border border-line bg-panel " +
        (single ? "" : "overflow-x-auto")
      }
    >
      <div
        className={single ? "grid" : "grid min-w-full"}
        style={{ gridTemplateColumns: cols }}
      >
        {/* hlavičkový riadok – jeden riadok: deň + počet */}
        <div className="border-b border-line" />
        {days.map((d) => (
          <div
            key={d.dateStr}
            className={
              "flex items-center justify-center gap-1 border-b border-l border-line px-1.5 py-2 text-center " +
              (d.isToday ? "bg-gold/5" : "")
            }
          >
            <span
              className={
                "text-xs font-medium " +
                (d.isToday ? "text-gold" : "text-cream")
              }
            >
              {d.weekdayShort} {d.dayMonth}
            </span>
            {d.bookings.length > 0 && (
              <span className="rounded-full bg-gold/15 px-1.5 text-[10px] font-medium tabular-nums text-gold">
                {d.bookings.length}
              </span>
            )}
          </div>
        ))}

        {/* časová os */}
        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted"
              style={{ top: (h - axisStart) * minPx }}
            >
              {minutesToHHMM(h)}
            </div>
          ))}
        </div>

        {/* stĺpce dní */}
        {days.map((d) => (
          <div
            key={d.dateStr}
            className="relative border-l border-line"
            style={{
              height: gridHeight,
              backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${hourPx}px)`,
            }}
          >
            {d.whBlocks.map((b, i) => (
              <div
                key={i}
                className="absolute inset-x-0 bg-white/[0.015]"
                style={{
                  top: (b.startMinute - axisStart) * minPx,
                  height: (b.endMinute - b.startMinute) * minPx,
                }}
              />
            ))}
            {d.bookings.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted/70">
                {d.isOpen ? "voľné" : "zatvorené"}
              </div>
            )}
            {d.bookings.map((bk) => (
              <Link
                key={bk.id}
                href={`${href(viewParam, refDateStr)}&booking=${bk.id}`}
                scroll={false}
                className="absolute inset-x-0.5 overflow-hidden rounded-md border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-left leading-tight hover:border-gold hover:bg-gold/20"
                style={{
                  top: (bk.startMin - axisStart) * minPx,
                  height: Math.max((bk.endMin - bk.startMin) * minPx - 2, minTap),
                }}
              >
                <div className="text-[10px] font-semibold text-gold">
                  {bk.timeLabel}
                </div>
                <div className="truncate text-[11px] font-medium text-cream">
                  {bk.name}
                </div>
                <div className="truncate text-[10px] text-muted">
                  {bk.service}
                </div>
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
  viewParam,
  refDateStr,
}: {
  days: DayData[];
  viewParam: string;
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
            <span
              className={
                "font-medium " + (d.isToday ? "text-gold" : "text-cream")
              }
            >
              {d.weekdayShort} <span className="text-muted">{d.dayMonth}</span>
            </span>
            <span className="text-xs text-muted">
              {rezervacieLabel(d.bookings.length)}
            </span>
          </div>
          {d.bookings.length === 0 ? (
            <p className="mt-2 text-sm text-muted/70">
              {d.isOpen ? "Voľný deň." : "Zatvorené."}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {d.bookings.map((bk) => (
                <li key={bk.id}>
                  <Link
                    href={`${href(viewParam, refDateStr)}&booking=${bk.id}`}
                    scroll={false}
                    className="flex min-h-[44px] items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 hover:bg-gold/20"
                  >
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gold">
                      {bk.timeLabel}
                    </span>
                    <span className="truncate text-sm text-cream">
                      {bk.name}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {bk.service}
                    </span>
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

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-cream">{children}</span>
    </div>
  );
}

function BookingModal({
  booking,
  viewParam,
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
  viewParam: string;
  refDateStr: string;
}) {
  const s = utcToLocalParts(booking.startAt);
  const e = utcToLocalParts(booking.endAt);
  const dayAnchor = localDateStringToUTC(s.dateStr)!;
  const dateLabel = formatDateOnly(dayAnchor);
  const timeLabel = `${minutesToHHMM(s.minutes)}–${minutesToHHMM(e.minutes)}`;
  const durationMin = Math.round(
    (booking.endAt.getTime() - booking.startAt.getTime()) / 60000,
  );
  const closeHref = href(viewParam, refDateStr);
  const isConfirmed = booking.status === "CONFIRMED";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* backdrop – klik zavrie */}
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Zavrieť"
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2
              id="booking-modal-title"
              className="text-lg font-semibold text-cream"
            >
              {booking.customerName}
            </h2>
            {!isConfirmed && (
              <span className="text-xs font-medium text-red-400">
                Zrušená rezervácia
              </span>
            )}
          </div>
          <Link
            href={closeHref}
            scroll={false}
            className="text-muted hover:text-cream"
            aria-label="Zavrieť"
          >
            ✕
          </Link>
        </div>

        <div className="mb-4">
          <DetailRow label="Telefón">
            <a
              href={`tel:${booking.customerPhone.replace(/\s/g, "")}`}
              className="text-gold hover:underline"
            >
              {booking.customerPhone}
            </a>
          </DetailRow>
          {booking.customerEmail && (
            <DetailRow label="E-mail">
              <a
                href={`mailto:${encodeURIComponent(booking.customerEmail)}`}
                className="text-gold hover:underline"
              >
                {booking.customerEmail}
              </a>
            </DetailRow>
          )}
          <DetailRow label="Služba">{booking.service.name}</DetailRow>
          <DetailRow label="Dátum">{dateLabel}</DetailRow>
          <DetailRow label="Čas">{timeLabel}</DetailRow>
          <DetailRow label="Dĺžka">{durationMin} min</DetailRow>
          <DetailRow label="Cena">
            {formatServicePrice(
              booking.service.priceCents,
              booking.service.priceMaxCents,
            )}
          </DetailRow>
        </div>

        {isConfirmed ? (
          <div className="space-y-2">
            <RescheduleForm
              bookingId={booking.id}
              customerName={booking.customerName}
              customerEmail={booking.customerEmail}
              currentDateStr={s.dateStr}
              currentDateLabel={dateLabel}
              currentTimeLabel={minutesToHHMM(s.minutes)}
              view={viewParam}
              refDateStr={refDateStr}
            />
            <CancelButton
              id={booking.id}
              view={viewParam}
              date={refDateStr}
              confirmLabel={`${booking.customerName}, ${dateLabel} ${minutesToHHMM(s.minutes)}`}
            />
          </div>
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
