// Jednoduchý in-memory sliding-window rate limiter (best-effort).
// Stav drží v pamäti procesu → pri viacerých inštanciách/serverless NIE je
// zdieľaný. Pre jednokontajnerový Railway deploy je to praktická prvá vrstva
// proti hrubému floodu; silnejšiu ochranu (Redis/Turnstile) možno pridať neskôr.
const buckets = new Map<string, number[]>();
let lastSweep = 0;

/**
 * Vráti ok=false, ak kľúč prekročil `max` udalostí za `windowMs`.
 * `key` napr. "booking:ip:1.2.3.4". Best-effort – neblokuje, len počíta.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Občasné čistenie starých kľúčov, aby Map nerástla donekonečna.
  if (now - lastSweep > windowMs) {
    lastSweep = now;
    for (const [k, arr] of buckets) {
      const kept = arr.filter((t) => now - t < windowMs);
      if (kept.length === 0) buckets.delete(k);
      else buckets.set(k, kept);
    }
  }

  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    const retryAfterSec = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}
