import { SignJWT, jwtVerify } from "jose";

// Podpísaný token na ZRUŠENIE rezervácie zákazníkom cez odkaz v e-maile.
// Rovnaký vzor (JWT, HS256, podpis cez SESSION_SECRET) ako admin session v
// lib/session.ts, ale s vlastným claimom `bookingId` a audience "booking-cancel",
// aby sa cancel token NEDAL zameniť za admin session (a naopak) – hoci zdieľajú
// rovnaký secret. Expirácia = ZAČIATOK rezervácie mínus 1 hodina → po tomto čase
// (hodinu pred termínom) už odkaz neplatí. Edge-safe (jose funguje aj v middleware).
const CANCEL_AUDIENCE = "booking-cancel";
const CANCEL_LEAD_MS = 60 * 60 * 1000; // 1 hodina

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET nie je nastavené v .env");
  return new TextEncoder().encode(s);
}

export async function signCancelToken(
  bookingId: string,
  startAt: Date,
): Promise<string> {
  return new SignJWT({ bookingId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(CANCEL_AUDIENCE)
    .setExpirationTime(new Date(startAt.getTime() - CANCEL_LEAD_MS))
    .sign(secretKey());
}

export async function verifyCancelToken(
  token: string,
): Promise<{ bookingId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      audience: CANCEL_AUDIENCE,
    });
    return typeof payload.bookingId === "string"
      ? { bookingId: payload.bookingId }
      : null;
  } catch {
    // Neplatný podpis, zlé audience, alebo expirovaný (< 1h pred termínom).
    return null;
  }
}
