"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
} from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/admin");

  // Rate-limit prihlásenia podľa IP – bráni online brute-force hádaniu hesla
  // (jediné admin heslo celého biznisu). Veľkorysý limit, aby neblokoval barbera.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:ip:${ip}`, 10, 5 * 60_000).ok) {
    return {
      error: "Priveľa pokusov o prihlásenie. Skús to prosím o pár minút.",
    };
  }

  // Bezpečný redirect len v rámci /admin (žiadny open redirect).
  const nextPath =
    nextRaw.startsWith("/admin") && nextRaw !== "/admin/login"
      ? nextRaw
      : "/admin";

  const expectedUser = process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const okUser = !!expectedUser && username === expectedUser;
  // Porovnávame vždy (aj pri zlom mene) – nech neuniká timing.
  const okPass = !!hash && (await bcrypt.compare(password, hash));

  if (!okUser || !okPass) {
    return { error: "Nesprávne meno alebo heslo." };
  }

  const token = await signSession(username);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(nextPath);
}
