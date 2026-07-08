"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ServiceFormState = { error?: string; success?: string };

// Pridanie novej služby. Cena prichádza z UI v eurách (napr. 12,50),
// do DB sa ukladá ako priceCents = eurá × 100 (zaokrúhlené na celé centy).
export async function createService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const durationRaw = String(formData.get("durationMin") ?? "").trim();
  const priceRaw = String(formData.get("priceEur") ?? "")
    .trim()
    .replace(",", ".");

  if (!name) {
    return { error: "Názov nesmie byť prázdny." };
  }

  const durationMin = Number.parseInt(durationRaw, 10);
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return { error: "Dĺžka musí byť celé číslo väčšie ako 0." };
  }

  const priceEur = Number.parseFloat(priceRaw);
  if (!Number.isFinite(priceEur) || priceEur < 0) {
    return { error: "Cena musí byť číslo väčšie alebo rovné 0." };
  }
  const priceCents = Math.round(priceEur * 100);

  await prisma.service.create({
    data: { name, durationMin, priceCents },
  });

  revalidatePath("/admin/sluzby");
  return { success: `Služba „${name}“ bola pridaná.` };
}

// Prepnutie active (aktivovať / deaktivovať).
export async function toggleService(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return;

  await prisma.service.update({
    where: { id },
    data: { active: !service.active },
  });
  revalidatePath("/admin/sluzby");
}

// Zmazanie služby. (Pozn.: FK Booking.serviceId má onDelete: Restrict –
// službu s existujúcimi rezerváciami DB nedovolí zmazať. Booking flow ešte
// neexistuje, takže teraz je mazanie vždy možné.)
export async function deleteService(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.service.delete({ where: { id } });
  revalidatePath("/admin/sluzby");
}
