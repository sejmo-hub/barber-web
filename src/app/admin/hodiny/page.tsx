import { prisma } from "@/lib/prisma";
import { WEEKDAYS, minutesToHHMM } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { AddBlockForm } from "./add-block-form";
import { deleteBlock } from "./actions";

// Vždy čerstvé dáta (admin nástroj – žiadne cachovanie zoznamu).
export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Pracovné hodiny" };

export default async function HoursPage() {
  const blocks = await prisma.workingHours.findMany({
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
  });

  // Zoskupenie blokov podľa dňa (1–7).
  const byDay = new Map<number, typeof blocks>();
  for (const day of WEEKDAYS) byDay.set(day.iso, []);
  for (const block of blocks) byDay.get(block.weekday)?.push(block);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Pracovné hodiny</h1>
        <p className="text-sm text-muted">
          Pridaj jeden alebo viac časových blokov na deň. Viac blokov = prestávka
          (napr. 09:00–12:00 a 13:00–17:00).
        </p>
      </div>

      <div className="space-y-4">
        {WEEKDAYS.map((day) => {
          const dayBlocks = byDay.get(day.iso) ?? [];
          return (
            <section
              key={day.iso}
              className="rounded-lg border border-line bg-panel p-4"
            >
              <h2 className="font-semibold">{day.label}</h2>

              {dayBlocks.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Žiadne bloky – voľno.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {dayBlocks.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1 text-sm"
                    >
                      <span className="font-medium text-cream">
                        {minutesToHHMM(b.startMinute)}–{minutesToHHMM(b.endMinute)}
                      </span>
                      <form action={deleteBlock}>
                        <input type="hidden" name="id" value={b.id} />
                        <SubmitButton
                          ariaLabel="Zmazať blok"
                          className="text-muted hover:text-red-400"
                          confirmMessage={`Naozaj zmazať blok ${day.label} ${minutesToHHMM(b.startMinute)}–${minutesToHHMM(b.endMinute)}?`}
                        >
                          ✕
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <AddBlockForm weekday={day.iso} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
