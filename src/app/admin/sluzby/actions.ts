"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type ServiceFormState = { error?: string; success?: string };

type ParsedService =
  | {
      ok: true;
      data: {
        name: string;
        description: string | null;
        durationMin: number;
        priceCents: number;
        priceMaxCents: number | null;
        bookable: boolean;
      };
    }
  | { ok: false; error: string };

// Spoločné parsovanie + validácia formulára (pre pridanie aj úpravu).
// Ceny prichádzajú v eurách, do DB idú ako centy (× 100, zaokrúhlené).
function parseServiceForm(formData: FormData): ParsedService {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Názov nesmie byť prázdny." };

  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const description = descriptionRaw === "" ? null : descriptionRaw;

  const durationMin = Number.parseInt(
    String(formData.get("durationMin") ?? "").trim(),
    10,
  );
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return { ok: false, error: "Dĺžka musí byť celé číslo väčšie ako 0." };
  }

  const priceEur = Number.parseFloat(
    String(formData.get("priceEur") ?? "").trim().replace(",", "."),
  );
  if (!Number.isFinite(priceEur) || priceEur < 0) {
    return { ok: false, error: "Cena od musí byť číslo väčšie alebo rovné 0." };
  }
  const priceCents = Math.round(priceEur * 100);

  // Cena do je nepovinná – ak je vyplnená, robí z ceny rozsah.
  const priceMaxRaw = String(formData.get("priceMaxEur") ?? "")
    .trim()
    .replace(",", ".");
  let priceMaxCents: number | null = null;
  if (priceMaxRaw !== "") {
    const priceMaxEur = Number.parseFloat(priceMaxRaw);
    if (!Number.isFinite(priceMaxEur) || priceMaxEur < 0) {
      return { ok: false, error: "Cena do musí byť platné číslo." };
    }
    priceMaxCents = Math.round(priceMaxEur * 100);
    if (priceMaxCents < priceCents) {
      return {
        ok: false,
        error: "Cena do musí byť väčšia alebo rovná cene od.",
      };
    }
  }

  const bookable = formData.get("bookable") != null;

  return {
    ok: true,
    data: { name, description, durationMin, priceCents, priceMaxCents, bookable },
  };
}

function revalidateServiceViews() {
  revalidatePath("/admin/sluzby");
  revalidatePath("/"); // sekcia služby na hlavnej
  revalidatePath("/rezervacia"); // ponuka rezervovateľných služieb
}

export async function createService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const p = parseServiceForm(formData);
  if (!p.ok) return { error: p.error };

  await prisma.service.create({ data: p.data });
  revalidateServiceViews();
  return { success: `Služba „${p.data.name}“ bola pridaná.` };
}

export async function updateService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Chýba ID služby." };

  const p = parseServiceForm(formData);
  if (!p.ok) return { error: p.error };

  await prisma.service.update({ where: { id }, data: p.data });
  revalidateServiceViews();
  redirect("/admin/sluzby"); // ukončí režim úpravy
}

// Posun služby v poradí (šípky hore/dole). Prehodí ju so susedom a prečísluje
// všetky sortOrdery na 1..N (kontiguálne, stabilné aj keď boli pôvodne rovnaké/0).
export async function moveService(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const i = services.findIndex((s) => s.id === id);
  if (i === -1) return;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= services.length) return; // už na kraji

  [services[i], services[j]] = [services[j], services[i]];

  await prisma.$transaction(
    services.map((s, idx) =>
      prisma.service.update({
        where: { id: s.id },
        data: { sortOrder: idx + 1 },
      }),
    ),
  );
  revalidateServiceViews();
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
  revalidateServiceViews();
}

// Zmazanie služby. Službu s existujúcimi rezerváciami (aj CANCELLED) NEmažeme –
// FK onDelete: Restrict chráni kalendár/históriu. Vopred skontrolujeme počet
// rezervácií: ak nejaké má, presmerujeme so ?delErr=<id> a stránka ukáže hlášku.
export async function deleteService(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const bookingCount = await prisma.booking.count({ where: { serviceId: id } });
  if (bookingCount > 0) {
    redirect(`/admin/sluzby?delErr=${id}`);
  }

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    // Race: rezervácia pribudla medzi count a delete (FK Restrict), alebo je
    // služba už zmazaná – v oboch prípadoch bez 500, ukáž hlášku.
    redirect(`/admin/sluzby?delErr=${id}`);
  }
  revalidateServiceViews();
  redirect("/admin/sluzby"); // vyčistí prípadný delErr param
}
