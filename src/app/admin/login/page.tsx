import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next =
    sp.next && sp.next.startsWith("/admin") && sp.next !== "/admin/login"
      ? sp.next
      : "/admin";

  // Ak už je prihlásený, netreba login.
  if (await getSession()) redirect(next);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" aria-label="Simon The Barber — domov">
            <span className="block font-display text-3xl uppercase leading-none text-cream">
              Simon
            </span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.4em] text-muted">
              <span className="text-gold">The</span> Barber
            </span>
          </Link>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-gold">
            Admin · prihlásenie
          </p>
        </div>

        <div className="rounded-sm border border-line bg-panel p-6">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Táto časť je len pre správu. Zákazníci sa neprihlasujú.
        </p>
      </div>
    </div>
  );
}
