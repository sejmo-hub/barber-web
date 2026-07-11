"use server";

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { verifyCancelToken } from "@/lib/cancel-token";
import { softCancelBooking } from "@/lib/bookings";

export type CancelResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

// Zrušenie rezervácie zákazníkom cez token. Volá sa AŽ po kliknutí na tlačidlo
// (POST), nikdy pri načítaní stránky. Autorizáciou je samotný podpísaný token.
export async function cancelByToken(
  _prev: CancelResult,
  formData: FormData,
): Promise<CancelResult> {
  const token = String(formData.get("token") ?? "");
  const payload = await verifyCancelToken(token);
  if (!payload) {
    return { status: "error", message: "Odkaz je neplatný alebo expiroval." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    select: { id: true, status: true },
  });
  if (!booking) {
    return { status: "error", message: "Rezervácia sa nenašla." };
  }
  // Už zrušená → idempotentné, správame sa ako úspech (žiadna druhá akcia).
  if (booking.status !== BookingStatus.CONFIRMED) {
    return { status: "success" };
  }

  await softCancelBooking(booking.id);
  return { status: "success" };
}
