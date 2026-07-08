import Link from "next/link";

// ⚠️ TODO(pred produkciou): /admin je momentálne VEREJNÉ a BEZ autentifikácie,
// aby sa dalo pohodlne testovať. Pred nasadením do produkcie NUTNE chrániť
// loginom (napr. middleware kontrolujúci session/JWT), inak môže ktokoľvek
// upravovať služby aj pracovné hodiny. Login pridáme v ďalšom kroku.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
          <span className="text-lg font-semibold">Barber – admin</span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin/sluzby"
              className="text-gray-600 hover:text-gray-900 hover:underline"
            >
              Služby
            </Link>
            <Link
              href="/admin/hodiny"
              className="text-gray-600 hover:text-gray-900 hover:underline"
            >
              Pracovné hodiny
            </Link>
            <Link
              href="/admin/volno"
              className="text-gray-600 hover:text-gray-900 hover:underline"
            >
              Voľno
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
