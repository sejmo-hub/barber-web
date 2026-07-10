"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import {
  formatDateOnly,
  isoWeekdayUTC,
  localDateStringToUTC,
  localMinutesToUtc,
  utcToLocalParts,
} from "@/lib/date";
import {
  formatServicePrice,
  hhmmToMinutes,
  minutesToHHMM,
} from "@/lib/format";
import { computeFreeSlots, validateRescheduleSlot } from "@/lib/slots";
import { sendRescheduleEmail } from "@/lib/email";

// Soft-cancel: rezerváciu NEmažeme, len prepneme status na CANCELLED (história
// ostáva). computeFreeSlots ráta len CONFIRMED, takže zrušený čas sa automaticky
// znova stane voľným vo verejnom booking flow.
export async function cancelBooking(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const view = String(formData.get("view") ?? "week");
  const date = String(formData.get("date") ?? "");

  if (id) {
    // updateMany nehádže, ak by id neexistovalo.
    await prisma.booking.updateMany({
      where: { id, status: BookingStatus.CONFIRMED },
      data: { status: BookingStatus.CANCELLED },
    });
    revalidatePath("/admin/kalendar");
    revalidatePath("/rezervacia"); // booking flow uvidí uvoľnený termín
  }

  const q = new URLSearchParams();
  if (view === "day" || view === "week") q.set("view", view); // "" = default
  if (date) q.set("date", date);
  redirect(`/admin/kalendar?${q.toString()}`); // zavrie detail (bez booking=)
}

// ---- Presun rezervácie ----------------------------------------------------

export type RescheduleResult =
  | { status: "idle" }
  | { status: "error"; message: string };

// Voľné sloty pre daný deň pri PRESUNE (admin): vylúč samu presúvanú rezerváciu
// z kolízií a vypni predstih/zákaz minulosti. Volané z klienta pri zmene dátumu.
export async function fetchRescheduleSlots(
  bookingId: string,
  dateStr: string,
): Promise<{ slots: string[]; error?: string }> {
  const dayAnchor = localDateStringToUTC(dateStr);
  if (!dayAnchor) return { slots: [], error: "Neplatný dátum." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { select: { durationMin: true } } },
  });
  if (!booking || booking.status !== BookingStatus.CONFIRMED) {
    return { slots: [], error: "Rezerváciu nemožno presunúť." };
  }

  const slots = await computeFreeSlots(booking.service.durationMin, dayAnchor, {
    excludeBookingId: bookingId,
    skipLeadTime: true,
  });
  return { slots };
}

// Presun rezervácie na nový deň/čas. Nikdy neverí klientovi (trvanie z DB, čas cez
// TZ helpery). Admin výnimka: MIN_LEAD_TIME_MIN a zákaz minulosti sa ZÁMERNE
// neuplatňujú – barber musí vedieť presunúť aj na dnes o 10 min, aj spätne.
export async function rescheduleBooking(
  _prev: RescheduleResult,
  formData: FormData,
): Promise<RescheduleResult> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const newDate = String(formData.get("newDate") ?? "");
  const newSlot = String(formData.get("newSlot") ?? "");
  const notify = formData.get("notify") != null; // checkbox „on"
  const view = String(formData.get("view") ?? "week");
  const date = String(formData.get("date") ?? "");

  const dayAnchor = localDateStringToUTC(newDate);
  const minutes = hhmmToMinutes(newSlot);
  if (!bookingId || !dayAnchor || minutes === null) {
    return { status: "error", message: "Neplatný termín presunu." };
  }

  // 1) rezervácia z DB
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });
  if (!booking || booking.status !== BookingStatus.CONFIRMED) {
    return { status: "error", message: "Rezerváciu nemožno presunúť." };
  }

  // 2) trvanie z DB (never klientovi)
  const durationMin = booking.service.durationMin;

  // 3) nový UTC čas cez TZ helpery
  const newStartAt = localMinutesToUtc(dayAnchor, minutes);
  const newEndAt = new Date(newStartAt.getTime() + durationMin * 60_000);

  // 4) validácia – VYLÚČ samu presúvanú rezerváciu z kolízií (inak by hlásila
  //    kolíziu sama so sebou pri presune na ten istý/prekrývajúci sa čas).
  const weekday = isoWeekdayUTC(dayAnchor);
  const dayStartUtc = localMinutesToUtc(dayAnchor, 0);
  const dayEndUtc = localMinutesToUtc(dayAnchor, 24 * 60);
  const [workingBlocks, timeOffs, otherBookings] = await Promise.all([
    prisma.workingHours.findMany({
      where: { weekday },
      select: { startMinute: true, endMinute: true },
    }),
    prisma.timeOff.findMany({
      where: { date: dayAnchor },
      select: { allDay: true, startMinute: true, endMinute: true },
    }),
    prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        id: { not: bookingId },
        startAt: { lt: dayEndUtc },
        endAt: { gt: dayStartUtc },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const check = validateRescheduleSlot({
    durationMin,
    dayAnchorUtc: dayAnchor,
    startMin: minutes,
    workingBlocks,
    timeOffs,
    otherBookings,
  });
  if (!check.ok) {
    const msg = {
      hours: "Barber v tomto čase nepracuje.",
      timeoff: "V tomto čase je voľno.",
      collision: "Nový termín koliduje s inou rezerváciou.",
    }[check.reason];
    return { status: "error", message: msg };
  }

  // pôvodné hodnoty pre e-mail (pred zmenou)
  const oldParts = utcToLocalParts(booking.startAt);
  const oldDateLabel = formatDateOnly(localDateStringToUTC(oldParts.dateStr)!);
  const oldTime = minutesToHHMM(oldParts.minutes);

  // 6) + 7) UPDATE so zachytením EXCLUDE constraintu (race condition)
  try {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { startAt: newStartAt, endAt: newEndAt },
    });
  } catch (err) {
    if (isOverlapError(err)) {
      return {
        status: "error",
        message: "Nový termín koliduje s inou rezerváciou.",
      };
    }
    return {
      status: "error",
      message: "Presun sa nepodarilo uložiť. Skús to prosím znova.",
    };
  }

  // 8) e-mail zákazníkovi (voliteľne). NESMIE zhodiť už uložený presun.
  if (notify && booking.customerEmail) {
    try {
      await sendRescheduleEmail({
        serviceName: booking.service.name,
        oldDateLabel,
        oldTime,
        newDateLabel: formatDateOnly(dayAnchor),
        newTime: newSlot,
        durationMin,
        priceLabel: formatServicePrice(
          booking.service.priceCents,
          booking.service.priceMaxCents,
        ),
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
      });
    } catch (mailErr) {
      console.error(
        "[rescheduleBooking] e-mail o presune zlyhal (presun je uložený):",
        mailErr,
      );
    }
  }

  revalidatePath("/admin/kalendar");
  revalidatePath("/rezervacia"); // pôvodný slot je zas voľný vo verejnom flow

  const q = new URLSearchParams();
  if (view === "day" || view === "week") q.set("view", view); // "" = default
  if (date) q.set("date", date);
  redirect(`/admin/kalendar?${q.toString()}`); // zavrie modal + refresh
}

// Rozpozná porušenie EXCLUDE constraintu Booking_no_overlap (kód 23P01).
function isOverlapError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; meta?: unknown };
  const hay = `${e?.code ?? ""} ${e?.message ?? ""} ${JSON.stringify(
    e?.meta ?? {},
  )}`.toLowerCase();
  return (
    hay.includes("23p01") ||
    hay.includes("booking_no_overlap") ||
    hay.includes("exclusion")
  );
}
