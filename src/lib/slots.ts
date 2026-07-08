import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { minutesToHHMM } from "@/lib/format";
import { isoWeekdayUTC, localMinutesToUtc } from "@/lib/date";

// Krok generovania kandidátskych začiatkov (minúty).
export const SLOT_STEP_MIN = 15;

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
 */
export function computeFreeSlotMinutes(params: {
  durationMin: number;
  dayAnchorUtc: Date;
  workingBlocks: WorkingBlock[];
  timeOffs: TimeOffInput[];
  bookings: BookingInput[];
}): number[] {
  const { durationMin, dayAnchorUtc, workingBlocks, timeOffs, bookings } =
    params;

  if (durationMin <= 0) return [];

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

    // 4) rezervácie – porovnanie v absolútnom UTC čase
    const slotStartUtc = localMinutesToUtc(dayAnchorUtc, start);
    const slotEndUtc = new Date(slotStartUtc.getTime() + durationMin * 60_000);
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
 */
export async function computeFreeSlots(
  serviceDurationMin: number,
  date: Date,
): Promise<string[]> {
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
  });

  return minutes.map(minutesToHHMM);
}
