"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";

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
  q.set("view", view === "day" ? "day" : "week");
  if (date) q.set("date", date);
  redirect(`/admin/kalendar?${q.toString()}`); // zavrie detail (bez booking=)
}
