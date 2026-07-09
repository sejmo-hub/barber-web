"use server";

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { formatServicePrice, hhmmToMinutes } from "@/lib/format";
import {
  localDateStringToUTC,
  localMinutesToUtc,
  todayLocalStartUTC,
  formatDateOnly,
} from "@/lib/date";
import { computeFreeSlots, MIN_LEAD_TIME_MIN } from "@/lib/slots";
import { sendBookingEmails } from "@/lib/email";

export type BookingResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      summary: { serviceName: string; dateLabel: string; time: string };
    };

// Jednoduchá kontrola formátu e-mailu (pole je nepovinné).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Odoslanie rezervácie. Nikdy neverí hodnotám z klienta – trvanie aj cenu
// berie z DB, čas prepočítava cez TZ helpery a slot znova validuje server-side.
export async function createBooking(
  _prev: BookingResult,
  formData: FormData,
): Promise<BookingResult> {
  const serviceId = String(formData.get("serviceId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const time = String(formData.get("slot") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();

  // --- validácia vstupov od zákazníka ---
  if (name.length < 2) {
    return { status: "error", message: "Zadaj meno (aspoň 2 znaky)." };
  }
  // Telefón: povoľ +, medzery a bežné oddeľovače; požaduj aspoň 9 číslic.
  const phoneNorm = phone.replace(/[\s()/.\-]/g, "");
  if (!/^\+?\d{9,}$/.test(phoneNorm)) {
    return {
      status: "error",
      message: "Zadaj platné telefónne číslo (aspoň 9 číslic).",
    };
  }
  // E-mail je nepovinný – validuj len ak je vyplnený.
  if (emailRaw !== "" && !EMAIL_RE.test(emailRaw)) {
    return {
      status: "error",
      message: "Zadaj platný e-mail alebo pole nechaj prázdne.",
    };
  }
  const customerEmail = emailRaw === "" ? null : emailRaw;

  const dayAnchor = localDateStringToUTC(dateStr);
  const minutes = hhmmToMinutes(time);
  if (!dayAnchor || minutes === null) {
    return { status: "error", message: "Neplatný termín. Vyber ho prosím znova." };
  }
  if (dayAnchor < todayLocalStartUTC()) {
    return { status: "error", message: "Tento deň už nie je možné rezervovať." };
  }

  // 1) Znova načítaj službu z DB (trvanie + že je aktívna a rezervovateľná) –
  //    never klientovi. bookable=false služby sa v /rezervacia neponúkajú, ale
  //    priamym POST-om by sa inak dali obísť, preto ich odmietame aj tu.
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active || !service.bookable) {
    return { status: "error", message: "Vybraná služba už nie je dostupná." };
  }

  // 2) Prepočítaj startAt/endAt cez TZ helpery (lokálny čas → UTC).
  const startAt = localMinutesToUtc(dayAnchor, minutes);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  // 2b) Minulosť / predstih: stránka mohla byť otvorená dlho a slot medzitým
  //     „vypršal". Znova over v absolútnom UTC čase (žiadne ručné +2h), aby sa
  //     nedalo rezervovať do minulosti ani na poslednú chvíľu – ani priamym POST-om.
  const earliestStartUtc = new Date(Date.now() + MIN_LEAD_TIME_MIN * 60_000);
  if (startAt < earliestStartUtc) {
    return {
      status: "error",
      message:
        "Tento termín už nie je možné rezervovať. Vyberte prosím neskorší čas.",
    };
  }

  // 3) Server-side re-validácia: je slot STÁLE voľný? (rovnaká logika ako displej)
  const freeSlots = await computeFreeSlots(service.durationMin, dayAnchor);
  if (!freeSlots.includes(time)) {
    return {
      status: "error",
      message: "Tento termín bol práve obsadený, vyber si prosím iný.",
    };
  }

  // 4) + 5) Zápis so zachytením EXCLUDE constraintu (race condition dvoch naraz).
  try {
    await prisma.booking.create({
      data: {
        serviceId: service.id,
        customerName: name,
        customerEmail,
        customerPhone: phone,
        startAt,
        endAt,
        status: BookingStatus.CONFIRMED,
      },
    });
  } catch (err) {
    if (isOverlapError(err)) {
      return {
        status: "error",
        message: "Tento termín bol práve obsadený, vyber si prosím iný.",
      };
    }
    // Iná chyba – stále pekná hláška pre zákazníka, nie 500.
    return {
      status: "error",
      message: "Rezerváciu sa nepodarilo uložiť. Skús to prosím znova.",
    };
  }

  const dateLabel = formatDateOnly(dayAnchor);

  // E-maily posielame AŽ po úspešnom zápise a mimo transakcie. Odoslanie NESMIE
  // zhodiť už uloženú rezerváciu – preto celé v try/catch, pri zlyhaní len log.
  try {
    await sendBookingEmails({
      serviceName: service.name,
      dateLabel,
      time,
      durationMin: service.durationMin,
      priceLabel: formatServicePrice(service.priceCents, service.priceMaxCents),
      customerName: name,
      customerPhone: phone,
      customerEmail,
    });
  } catch (mailErr) {
    console.error(
      "[createBooking] odoslanie e-mailov zlyhalo (rezervácia je uložená):",
      mailErr,
    );
  }

  // 6) Úspech – potvrdenie so zhrnutím.
  return {
    status: "success",
    summary: { serviceName: service.name, dateLabel, time },
  };
}

// Rozpozná porušenie EXCLUDE constraintu Booking_no_overlap. Postgres kód pre
// exclusion_violation je 23P01; Prisma s driver adaptérom prepošle správu z DB.
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
