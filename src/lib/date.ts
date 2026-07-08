// Časová zóna prevádzky. Celá appka pracuje s lokálnym „nástenným" časom v tejto
// zóne: minúty od polnoci (WorkingHours, TimeOff) sú lokálny čas v Bratislave.
//
// Kalendárny deň (TimeOff.date) ukladáme ako UTC polnoc daného dňa – t.j. dátum
// je „date-only" kotva, kde UTC Y-M-D == zamýšľaný lokálny deň. Vďaka tomu sa
// deň nikdy neposunie cez polnoc bez ohľadu na timezone servera. Čítame ho vždy
// cez UTC komponenty. Ten istý prístup použijeme pri výpočte slotov: deň je
// kotva, minúty sú lokálny čas.
export const TIME_ZONE = "Europe/Bratislava";

/** "YYYY-MM-DD" (lokálny deň) → Date na UTC polnoci daného dňa (alebo null). */
export function localDateStringToUTC(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Odmietni pretečenie (napr. 2026-02-31 by „prebehlo" do marca).
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Date (uložený ako UTC polnoc) → "15. 7. 2026". */
export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("sk-SK", {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

/** Date (UTC polnoc) → "YYYY-MM-DD" pre value/min v <input type="date">. */
export function formatDateInputUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/** Dnešný kalendárny deň v TIME_ZONE, ako UTC polnoc (na porovnanie s minulosťou). */
export function todayLocalStartUTC(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return new Date(
    Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day)),
  );
}

/** ISO weekday (1 = pondelok … 7 = nedeľa) kalendárneho dňa (číta UTC kotvu). */
export function isoWeekdayUTC(dayAnchorUtc: Date): number {
  const dow = dayAnchorUtc.getUTCDay(); // 0 = nedeľa … 6 = sobota
  return dow === 0 ? 7 : dow;
}

// Offset (zóna − UTC) v milisekundách pre daný absolútny okamih.
function zoneOffsetMs(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUTC - instant.getTime();
}

/**
 * (kalendárny deň ako UTC polnoc) + (lokálne minúty od polnoci v TIME_ZONE)
 * → absolútny UTC Date. Zohľadňuje letný/zimný čas (DST, dvojfázová oprava).
 *
 * Toto je jednotný spôsob prevodu lokálneho „nástenného" času na absolútny
 * okamih – používa ho výpočet slotov pri porovnaní s uloženými (UTC)
 * rezerváciami, aby bola TZ logika na jednom mieste.
 */
export function localMinutesToUtc(dayAnchorUtc: Date, minutes: number): Date {
  const y = dayAnchorUtc.getUTCFullYear();
  const mo = dayAnchorUtc.getUTCMonth();
  const d = dayAnchorUtc.getUTCDate();
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  // Nástenný čas najprv berieme, akoby to bolo UTC…
  const guess = Date.UTC(y, mo, d, h, mi);
  // …a opravíme o skutočný offset zóny v danom okamihu.
  const off1 = zoneOffsetMs(new Date(guess));
  let utc = guess - off1;
  const off2 = zoneOffsetMs(new Date(utc));
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc);
}

/**
 * Absolútny UTC okamih → lokálne komponenty v TIME_ZONE: kalendárny deň
 * ("YYYY-MM-DD") a minúty od lokálnej polnoci. Používa kalendár na umiestnenie
 * (UTC) rezervácie na správny deň a čas v lokálnom „nástennom" čase.
 */
export function utcToLocalParts(instant: Date): {
  dateStr: string;
  minutes: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  return {
    dateStr: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}
