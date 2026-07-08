"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hhmmToMinutes } from "@/lib/format";
import { localDateStringToUTC, todayLocalStartUTC } from "@/lib/date";

export type TimeOffFormState = { error?: string; success?: string };

// Pridanie dňa voľna. Dátum sa berie ako lokálny kalendárny deň (Bratislava)
// a ukladá sa ako UTC polnoc daného dňa (viď lib/date.ts). Pri celom dni sú
// minúty null; pri čiastočnom voľne sa ukladajú minúty od polnoci.
export async function createTimeOff(
  _prev: TimeOffFormState,
  formData: FormData,
): Promise<TimeOffFormState> {
  const date = localDateStringToUTC(String(formData.get("date") ?? ""));
  if (!date) {
    return { error: "Dátum je povinný a musí byť platný." };
  }
  if (date < todayLocalStartUTC()) {
    return { error: "Dátum nesmie byť v minulosti." };
  }

  const allDay = formData.get("allDay") != null;

  let startMinute: number | null = null;
  let endMinute: number | null = null;
  if (!allDay) {
    startMinute = hhmmToMinutes(String(formData.get("start") ?? ""));
    endMinute = hhmmToMinutes(String(formData.get("end") ?? ""));
    if (startMinute === null || endMinute === null) {
      return { error: "Pri čiastočnom voľne zadaj platný čas Od/Do (HH:MM)." };
    }
    if (endMinute <= startMinute) {
      return { error: "Koniec musí byť neskôr ako začiatok." };
    }
  }

  const reasonRaw = String(formData.get("reason") ?? "").trim();
  const reason = reasonRaw === "" ? null : reasonRaw;

  await prisma.timeOff.create({
    data: { date, allDay, startMinute, endMinute, reason },
  });

  revalidatePath("/admin/volno");
  return { success: "Voľno bolo pridané." };
}

// Zmazanie dňa voľna.
export async function deleteTimeOff(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.timeOff.delete({ where: { id } });
  revalidatePath("/admin/volno");
}
