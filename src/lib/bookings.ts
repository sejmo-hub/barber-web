import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import {
  formatDateOnly,
  localDateStringToUTC,
  utcToLocalParts,
} from "@/lib/date";
import { minutesToHHMM } from "@/lib/format";
import { sendCancellationEmails } from "@/lib/email";

// Soft-cancel: rezerváciu NEmažeme, len prepneme CONFIRMED → CANCELLED (história
// ostáva a slot sa uvoľní – computeFreeSlots ráta len CONFIRMED). Idempotentné:
// updateMany prepne 0 riadkov, ak už nie je CONFIRMED. Zdieľané medzi admin
// akciou (cancelBooking) a verejným zrušením cez token (/zrusit/[token]) – e-maily
// o zrušení sú TU, aby prišli z oboch ciest a neboli duplikované.
export async function softCancelBooking(bookingId: string): Promise<void> {
  if (!bookingId) return;

  // Dáta pre e-mail načítame PRED zmenou (potrebujeme meno, službu, čas, e-mail).
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { select: { name: true } } },
  });
  if (!booking) return;

  const res = await prisma.booking.updateMany({
    where: { id: bookingId, status: BookingStatus.CONFIRMED },
    data: { status: BookingStatus.CANCELLED },
  });
  revalidatePath("/admin/kalendar");
  revalidatePath("/rezervacia"); // booking flow uvidí uvoľnený termín

  // E-maily posielame LEN ak sme naozaj zrušili (count>0) → presne raz, aj pri
  // súbežnom zrušení (druhý pokus dostane count=0). Zlyhanie odoslania NESMIE
  // zhodiť už uložené zrušenie – preto try/catch, pri chybe len log.
  if (res.count > 0) {
    try {
      const parts = utcToLocalParts(booking.startAt);
      await sendCancellationEmails({
        serviceName: booking.service.name,
        dateLabel: formatDateOnly(localDateStringToUTC(parts.dateStr)!),
        time: minutesToHHMM(parts.minutes),
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
      });
    } catch (e) {
      console.error(
        "[cancel] odoslanie e-mailov o zrušení zlyhalo (zrušenie je uložené):",
        e,
      );
    }
  }
}
