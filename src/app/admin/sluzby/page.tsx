import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatServicePrice } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { ServiceForm } from "./service-form";
import { toggleService, moveService } from "./actions";
import { DeleteServiceButton } from "./delete-button";

// Vždy čerstvé dáta (admin nástroj – žiadne cachovanie zoznamu).
export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Služby" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; delErr?: string }>;
}) {
  const sp = await searchParams;
  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { bookings: true } } },
  });
  const editing = sp.edit ? services.find((s) => s.id === sp.edit) : undefined;
  const delErrService = sp.delErr
    ? services.find((s) => s.id === sp.delErr)
    : undefined;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Služby</h1>

        {delErrService && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Túto službu („{delErrService.name}“) nemožno zmazať, pretože má
            existujúce rezervácie. Použi „Deaktivovať“ — služba zmizne z webu aj
            z rezervácie, ale história ostane.
          </div>
        )}

        {services.length === 0 ? (
          <p className="text-sm text-muted">
            Zatiaľ žiadne služby. Pridaj prvú nižšie.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-2 py-3 font-medium">Poradie</th>
                  <th className="px-4 py-3 font-medium">Názov</th>
                  <th className="px-4 py-3 font-medium">Dĺžka</th>
                  <th className="px-4 py-3 font-medium">Cena</th>
                  <th className="px-4 py-3 font-medium">Rezervácia</th>
                  <th className="px-4 py-3 font-medium">Stav</th>
                  <th className="px-4 py-3 text-right font-medium">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services.map((s, i) => (
                  <tr key={s.id} className={s.id === editing?.id ? "bg-gold/5" : ""}>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        {i > 0 ? (
                          <form action={moveService}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="dir" value="up" />
                            <SubmitButton
                              ariaLabel={`Posunúť ${s.name} vyššie`}
                              pendingText="…"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-cream hover:border-gold/60 hover:text-gold"
                            >
                              ↑
                            </SubmitButton>
                          </form>
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-line/40 text-muted/30"
                          >
                            ↑
                          </span>
                        )}
                        {i < services.length - 1 ? (
                          <form action={moveService}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="dir" value="down" />
                            <SubmitButton
                              ariaLabel={`Posunúť ${s.name} nižšie`}
                              pendingText="…"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-cream hover:border-gold/60 hover:text-gold"
                            >
                              ↓
                            </SubmitButton>
                          </form>
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-line/40 text-muted/30"
                          >
                            ↓
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-cream">{s.name}</div>
                      {s.description && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-muted">
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream">{s.durationMin} min</td>
                    <td className="px-4 py-3 text-cream">
                      {formatServicePrice(s.priceCents, s.priceMaxCents)}
                    </td>
                    <td className="px-4 py-3">
                      {s.bookable ? (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                          Online
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-muted">
                          Osobne
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.active ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                          Aktívna
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-muted">
                          Neaktívna
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/sluzby?edit=${s.id}#form`}
                          className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-gold hover:bg-white/5"
                        >
                          Upraviť
                        </Link>
                        <form action={toggleService}>
                          <input type="hidden" name="id" value={s.id} />
                          <SubmitButton
                            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-cream hover:bg-white/5"
                            pendingText="Ukladám…"
                          >
                            {s.active ? "Deaktivovať" : "Aktivovať"}
                          </SubmitButton>
                        </form>
                        <DeleteServiceButton
                          id={s.id}
                          name={s.name}
                          hasBookings={s._count.bookings > 0}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="form" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-semibold">
          {editing ? `Upraviť službu: ${editing.name}` : "Pridať novú službu"}
        </h2>
        <div className="rounded-lg border border-line bg-panel p-5">
          <ServiceForm editing={editing} />
        </div>
      </section>
    </div>
  );
}
