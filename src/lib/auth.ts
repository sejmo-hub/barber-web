import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Prečíta a overí admin session z cookie (pre server komponenty / layout / akcie).
// Middleware používa verifySession priamo (má vlastný prístup ku cookies).
export async function getSession(): Promise<{ sub: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Obranná hĺbka: každá admin server action ju má zavolať ako PRVÝ riadok.
// Middleware síce chráni /admin/* cesty, ale server actions sú verejné POST
// endpointy – autorizáciu preto overujeme aj priamo v handleri (odporúčanie
// Next.js). Ak nie je platná session, akcia sa preruší (útočník = bez session).
export async function requireAdmin(): Promise<{ sub: string }> {
  const session = await getSession();
  if (!session) throw new Error("Neautorizované.");
  return session;
}
