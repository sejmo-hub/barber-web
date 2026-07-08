import { prisma } from "@/lib/prisma";
import { formatEur } from "@/lib/format";
import { ServiceForm } from "./service-form";
import { deleteService, toggleService } from "./actions";

// Vždy čerstvé dáta (admin nástroj – žiadne cachovanie zoznamu).
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Služby</h1>

        {services.length === 0 ? (
          <p className="text-sm text-gray-500">
            Zatiaľ žiadne služby. Pridaj prvú nižšie.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Názov</th>
                  <th className="px-4 py-3 font-medium">Dĺžka</th>
                  <th className="px-4 py-3 font-medium">Cena</th>
                  <th className="px-4 py-3 font-medium">Stav</th>
                  <th className="px-4 py-3 text-right font-medium">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.durationMin} min
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatEur(s.priceCents)}
                    </td>
                    <td className="px-4 py-3">
                      {s.active ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Aktívna
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Neaktívna
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={toggleService}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {s.active ? "Deaktivovať" : "Aktivovať"}
                          </button>
                        </form>
                        <form action={deleteService}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Zmazať
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pridať novú službu</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <ServiceForm />
        </div>
      </section>
    </div>
  );
}
