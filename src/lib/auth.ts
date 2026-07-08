import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Prečíta a overí admin session z cookie (pre server komponenty / layout / akcie).
// Middleware používa verifySession priamo (má vlastný prístup ku cookies).
export async function getSession(): Promise<{ sub: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
