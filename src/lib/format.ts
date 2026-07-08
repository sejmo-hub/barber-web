// Zdieľané pomocné funkcie na formátovanie (ceny, čas, dni v týždni).

/** priceCents (napr. 1200) → "12,00 €" */
export function formatEur(cents: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** minúty od polnoci (napr. 540) → "09:00" */
export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:00" → 540; vráti null ak vstup nie je platný HH:MM */
export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Dni v týždni podľa ISO-8601 (1 = pondelok … 7 = nedeľa). */
export const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Pondelok" },
  { iso: 2, label: "Utorok" },
  { iso: 3, label: "Streda" },
  { iso: 4, label: "Štvrtok" },
  { iso: 5, label: "Piatok" },
  { iso: 6, label: "Sobota" },
  { iso: 7, label: "Nedeľa" },
];
