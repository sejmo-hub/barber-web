import { AdminNav } from "./admin-nav";
import { getSession } from "@/lib/auth";
import { logout } from "./logout-action";

// Login je aktívny (Časť 2): /admin/* chráni middleware (redirect na
// /admin/login ak nie je platná session). Verejná časť zostáva verejná –
// zákazníci sa neprihlasujú.

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Neprihlásený → minimálny shell. Reálne sem padne len /admin/login,
  // ostatné /admin/* presmeruje middleware ešte pred renderom.
  if (!session) {
    return <div className="min-h-screen bg-ink text-cream">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="border-b border-line bg-ink2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
          <span className="text-lg font-semibold tracking-wide">
            Simon&#39;S <span className="text-gold">The</span> Barber
            <span className="ml-2 align-middle text-[10px] uppercase tracking-[0.2em] text-muted">
              admin
            </span>
          </span>
          <AdminNav />
          <form action={logout} className="ml-auto">
            <button
              type="submit"
              className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
            >
              Odhlásiť sa
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
