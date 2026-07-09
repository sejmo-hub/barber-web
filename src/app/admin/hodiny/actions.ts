"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hhmmToMinutes } from "@/lib/format";

export type HoursFormState = { error?: string; success?: string };

// Pridanie časového bloku pre daný deň. Čas prichádza ako HH:MM, do DB sa
// ukladá ako minúty od polnoci. Kontroluje sa: platný čas, koniec > začiatok,
// a že sa blok neprekrýva s existujúcimi blokmi v ten istý deň.
export async function addBlock(
  _prev: HoursFormState,
  formData: FormData,
): Promise<HoursFormState> {
  const weekday = Number.parseInt(String(formData.get("weekday") ?? ""), 10);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    return { error: "Neplatný deň." };
  }

  const startMinute = hhmmToMinutes(String(formData.get("start") ?? ""));
  const endMinute = hhmmToMinutes(String(formData.get("end") ?? ""));
  if (startMinute === null || endMinute === null) {
    return { error: "Zadaj platný čas v tvare HH:MM." };
  }
  if (endMinute <= startMinute) {
    return { error: "Koniec musí byť neskôr ako začiatok." };
  }

  // Kontrola prekrytia s existujúcimi blokmi v ten istý deň.
  const existing = await prisma.workingHours.findMany({ where: { weekday } });
  const overlaps = existing.some(
    (b) => startMinute < b.endMinute && b.startMinute < endMinute,
  );
  if (overlaps) {
    return { error: "Blok sa prekrýva s existujúcim blokom v tomto dni." };
  }

  await prisma.workingHours.create({
    data: { weekday, startMinute, endMinute },
  });

  revalidatePath("/admin/hodiny");
  return { success: "Blok bol pridaný." };
}

// Zmazanie časového bloku. deleteMany = idempotentné (dvojklik/stará karta na
// už zmazanom bloku nespôsobí výnimku P2025).
export async function deleteBlock(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.workingHours.deleteMany({ where: { id } });
  revalidatePath("/admin/hodiny");
}
