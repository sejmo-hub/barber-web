import { AdminNav } from "./admin-nav";

// ⚠️ TODO(pred produkciou): /admin je momentálne VEREJNÉ a BEZ autentifikácie,
// aby sa dalo pohodlne testovať. Pred nasadením do produkcie NUTNE chrániť
// loginom (napr. middleware kontrolujúci session/JWT), inak môže ktokoľvek
// upravovať služby, hodiny aj rušiť rezervácie. Login pridáme v ďalšom kroku.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="border-b border-line bg-ink2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
          <span className="text-lg font-semibold tracking-wide">
            <span className="text-gold">Simon</span> The Barber
            <span className="ml-2 align-middle text-[10px] uppercase tracking-[0.2em] text-muted">
              admin
            </span>
          </span>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
