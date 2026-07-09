import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { minutesToHHMM } from "@/lib/format";
import { isoWeekdayUTC, localMinutesToUtc } from "@/lib/date";

// Krok generovania kandidátskych začiatkov (minúty). Sloty sú zarovnané na
// začiatok pracovného bloku (blok 10:00–19:30, 30-min krok → 10:00, 10:30, …).
export const SLOT_STEP_MIN = 30;

// Minimálny predstih rezervácie (minúty). Slot musí začínať aspoň o toľko od
// „teraz" – nedá sa rezervovať do minulosti ani na poslednú chvíľu.
export const MIN_LEAD_TIME_MIN = 30;

type WorkingBlock = { startMinute: number; endMinute: number };
type TimeOffInput = {
  allDay: boolean;
  startMinute: number | null;
  endMinute: number | null;
};
type BookingInput = { startAt: Date; endAt: Date };

/**
 * Čisté jadro výpočtu voľných slotov. Pracuje s už načítanými dátami, takže
 * je ľahko testovateľné a bez závislosti na DB.
 *
 * Vracia začiatky voľných slotov ako minúty od LOKÁLNEJ polnoci (Bratislava).
 *
 * Postup:
 *  1. Kandidátske začiatky generuj v každom pracovnom bloku po SLOT_STEP_MIN;
 *     posledný možný začiatok = koniec bloku − trvanie služby (nech sa zmestí).
 *  2. Celodenné voľno (allDay) → žiadne sloty.
 *  3. Čiastočné voľno → odstráň sloty, ktorých interval [start, start+trvanie)
 *     sa prekrýva s [offStart, offEnd).
 *  4. CONFIRMED rezervácie → slot je obsadený, ak sa jeho interval prekrýva s
 *     rezerváciou. Porovnáva sa v absolútnom UTC čase (slot → UTC cez TZ helper).
 *  5. Minulosť / predstih → slot musí začínať aspoň MIN_LEAD_TIME_MIN od `now`.
 *     Porovnáva sa v absolútnom UTC čase (žiadne ručné +2h), takže to sedí aj
 *     cez polnoc a pri prechode letný/zimný čas.
 */
export function computeFreeSlotMinutes(params: {
  durationMin: number;
  dayAnchorUtc: Date;
  workingBlocks: WorkingBlock[];
  timeOffs: TimeOffInput[];
  bookings: BookingInput[];
  now: Date;
  // Admin presun: vypni filter predstihu/minulosti (barber môže presunúť aj na
  // dnes o 10 min, aj spätne opraviť zle zadaný termín). Public flow ho necháva.
  skipLeadTime?: boolean;
}): number[] {
  const {
    durationMin,
    dayAnchorUtc,
    workingBlocks,
    timeOffs,
    bookings,
    now,
    skipLeadTime = false,
  } = params;

  if (durationMin <= 0) return [];

  // Najskorší povolený absolútny začiatok slotu (teraz + minimálny predstih).
  const earliestStartUtc = new Date(now.getTime() + MIN_LEAD_TIME_MIN * 60_000);

  // 2) celodenné voľno → nič
  if (timeOffs.some((t) => t.allDay)) return [];

  // čiastočné voľná ako intervaly v minútach
  const partialOffs = timeOffs
    .filter((t) => !t.allDay && t.startMinute !== null && t.endMinute !== null)
    .map((t) => ({ start: t.startMinute as number, end: t.endMinute as number }));

  // 1) kandidátske začiatky vo všetkých pracovných blokoch
  const candidates = new Set<number>();
  for (const block of workingBlocks) {
    const lastStart = block.endMinute - durationMin;
    for (let m = block.startMinute; m <= lastStart; m += SLOT_STEP_MIN) {
      candidates.add(m);
    }
  }

  // zoradiť (Set kvôli deduplikácii pri prípadnom prekrytí blokov)
  const sorted = [...candidates].sort((a, b) => a - b);

  const free: number[] = [];
  for (const start of sorted) {
    const endMin = start + durationMin; // lokálny nástenný čas (minúty)

    // 3) čiastočné voľno – prekrytie intervalov
    if (partialOffs.some((o) => start < o.end && o.start < endMin)) continue;

    // slot → absolútny UTC čas (jednotný TZ prevod)
    const slotStartUtc = localMinutesToUtc(dayAnchorUtc, start);
    const slotEndUtc = new Date(slotStartUtc.getTime() + durationMin * 60_000);

    // 5) minulosť / predstih – slot musí začínať aspoň MIN_LEAD_TIME_MIN od teraz
    //    (admin presun tento filter vypína cez skipLeadTime)
    if (!skipLeadTime && slotStartUtc < earliestStartUtc) continue;

    // 4) rezervácie – porovnanie v absolútnom UTC čase
    const clashes = bookings.some(
      (b) => slotStartUtc < b.endAt && b.startAt < slotEndUtc,
    );
    if (clashes) continue;

    free.push(start);
  }
  return free;
}

/**
 * DB-verzia: načíta pracovné hodiny, voľná a CONFIRMED rezervácie pre daný deň
 * a vráti voľné sloty ako lokálne "HH:MM".
 *
 * @param serviceDurationMin trvanie služby v minútach
 * @param date               kalendárny deň ako UTC polnoc (kotva, viď lib/date.ts)
 * @param opts.now           „teraz" (default aktuálny čas) – kvôli predstihu a testom
 * @param opts.excludeBookingId  vylúč túto rezerváciu z kolízií (admin presun –
 *                               inak by rezervácia kolidovala sama so sebou)
 * @param opts.skipLeadTime  vypni predstih/zákaz minulosti (admin presun)
 */
export async function computeFreeSlots(
  serviceDurationMin: number,
  date: Date,
  opts: { now?: Date; excludeBookingId?: string; skipLeadTime?: boolean } = {},
): Promise<string[]> {
  const { now = new Date(), excludeBookingId, skipLeadTime = false } = opts;
  const weekday = isoWeekdayUTC(date);

  // Okno dňa v absolútnom UTC čase: od lokálnej polnoci po ďalšiu lokálnu polnoc.
  const dayStartUtc = localMinutesToUtc(date, 0);
  const dayEndUtc = localMinutesToUtc(date, 24 * 60);

  const [workingBlocks, timeOffs, bookings] = await Promise.all([
    prisma.workingHours.findMany({
      where: { weekday },
      select: { startMinute: true, endMinute: true },
    }),
    prisma.timeOff.findMany({
      where: { date },
      select: { allDay: true, startMinute: true, endMinute: true },
    }),
    prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startAt: { lt: dayEndUtc },
        endAt: { gt: dayStartUtc },
        ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const minutes = computeFreeSlotMinutes({
    durationMin: serviceDurationMin,
    dayAnchorUtc: date,
    workingBlocks,
    timeOffs,
    bookings,
    now,
    skipLeadTime,
  });

  return minutes.map(minutesToHHMM);
}

// --- Admin presun: validácia konkrétneho termínu s dôvodom zamietnutia -------

export type RescheduleReason = "hours" | "timeoff" | "collision";

/**
 * Čistá validácia jedného navrhnutého termínu pre ADMIN presun. Rovnaké pravidlá
 * ako computeFreeSlots (pracovné hodiny, TimeOff, prekrytie s CONFIRMED), ale:
 *  - vracia KONKRÉTNY dôvod zamietnutia (kvôli zrozumiteľnej hláške v UI),
 *  - kolízie počíta z `otherBookings` (volajúci VYLÚČI samu presúvanú rezerváciu),
 *  - NEuplatňuje predstih/zákaz minulosti (admin výnimka – zámerne).
 * Porovnanie kolízií je v absolútnom UTC čase cez rovnaký TZ helper.
 */
export function validateRescheduleSlot(params: {
  durationMin: number;
  dayAnchorUtc: Date;
  startMin: number;
  workingBlocks: WorkingBlock[];
  timeOffs: TimeOffInput[];
  otherBookings: BookingInput[];
}): { ok: true } | { ok: false; reason: RescheduleReason } {
  const { durationMin, dayAnchorUtc, startMin, workingBlocks, timeOffs, otherBookings } =
    params;
  const endMin = startMin + durationMin;

  // 1) musí sa celý zmestiť do niektorého pracovného bloku
  const inHours = workingBlocks.some(
    (b) => startMin >= b.startMinute && endMin <= b.endMinute,
  );
  if (!inHours) return { ok: false, reason: "hours" };

  // 2) celodenné voľno → nič; čiastočné → prekrytie intervalov
  if (timeOffs.some((t) => t.allDay)) return { ok: false, reason: "timeoff" };
  const partialOff = timeOffs.some(
    (t) =>
      !t.allDay &&
      t.startMinute !== null &&
      t.endMinute !== null &&
      startMin < (t.endMinute as number) &&
      (t.startMinute as number) < endMin,
  );
  if (partialOff) return { ok: false, reason: "timeoff" };

  // 3) kolízia s inou CONFIRMED rezerváciou (v UTC)
  const slotStartUtc = localMinutesToUtc(dayAnchorUtc, startMin);
  const slotEndUtc = new Date(slotStartUtc.getTime() + durationMin * 60_000);
  const collides = otherBookings.some(
    (b) => slotStartUtc < b.endAt && b.startAt < slotEndUtc,
  );
  if (collides) return { ok: false, reason: "collision" };

  return { ok: true };
}
