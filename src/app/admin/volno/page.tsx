import { prisma } from "@/lib/prisma";
import { minutesToHHMM } from "@/lib/format";
import {
  formatDateOnly,
  formatDateInputUTC,
  todayLocalStartUTC,
} from "@/lib/date";
import { SubmitButton } from "@/components/submit-button";
import { TimeOffForm } from "./timeoff-form";
import { deleteTimeOff } from "./actions";

// Vždy čerstvé dáta (admin nástroj – žiadne cachovanie zoznamu).
export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Voľno" };

export default async function TimeOffPage() {
  const today = todayLocalStartUTC();

  // Len dnešné a budúce voľná, zoradené vzostupne (staršie skryjeme).
  const items = await prisma.timeOff.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Dni voľna</h1>

        {items.length === 0 ? (
          <p className="text-sm text-muted">
            Zatiaľ žiadne budúce dni voľna. Pridaj prvý nižšie.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Dátum</th>
                  <th className="px-4 py-3 font-medium">Typ</th>
                  <th className="px-4 py-3 font-medium">Dôvod</th>
                  <th className="px-4 py-3 text-right font-medium">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium text-cream">
                      {formatDateOnly(t.date)}
                    </td>
                    <td className="px-4 py-3 text-cream">
                      {t.allDay ? (
                        "Celý deň"
                      ) : (
                        <span>
                          {t.startMinute !== null && t.endMinute !== null
                            ? `${minutesToHHMM(t.startMinute)}–${minutesToHHMM(
                                t.endMinute,
                              )}`
                            : "Časový rozsah"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream">
                      {t.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <form action={deleteTimeOff}>
                          <input type="hidden" name="id" value={t.id} />
                          <SubmitButton
                            className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                            pendingText="Mažem…"
                            confirmMessage={`Naozaj zmazať voľno ${formatDateOnly(t.date)}?`}
                          >
                            Zmazať
                          </SubmitButton>
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
        <h2 className="text-lg font-semibold">Pridať deň voľna</h2>
        <div className="rounded-lg border border-line bg-panel p-5">
          <TimeOffForm minDate={formatDateInputUTC(today)} />
        </div>
      </section>
    </div>
  );
}
