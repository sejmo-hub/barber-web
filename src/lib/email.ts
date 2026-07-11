import { Resend } from "resend";
import { signCancelToken } from "@/lib/cancel-token";

export type BookingEmailData = {
  bookingId: string; // na zrušovací odkaz v maile zákazníkovi
  serviceName: string;
  dateLabel: string;
  time: string;
  startAt: Date; // zmrazený UTC začiatok (pre .ics)
  endAt: Date; // zmrazený UTC koniec (pre .ics)
  durationMin: number;
  priceLabel: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
};

// Odošle e-maily po rezervácii: barberovi vždy, zákazníkovi len ak zadal e-mail.
// Chyby jednotlivých e-mailov len loguje – volajúci to má navyše v try/catch,
// aby odoslanie nikdy nezhodilo (už uloženú) rezerváciu.
export async function sendBookingEmails(data: BookingEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const barberEmail = process.env.BARBER_EMAIL;

  if (!apiKey || !from) {
    console.warn(
      "[mail] RESEND_API_KEY alebo MAIL_FROM nie je nastavené – e-maily preskočené.",
    );
    return;
  }

  const resend = new Resend(apiKey);

  // 1) Barberovi – vždy.
  if (barberEmail) {
    try {
      const { data: res, error } = await resend.emails.send({
        from,
        to: barberEmail,
        subject: `Simon'S The Barber — nová rezervácia: ${data.serviceName}, ${data.dateLabel} ${data.time}`,
        html: barberHtml(data),
        attachments: [
          {
            filename: "rezervacia.ics",
            content: Buffer.from(buildBookingIcs(data), "utf-8"),
            contentType: "text/calendar",
          },
        ],
      });
      if (error) console.error("[mail] barberovi zlyhal:", error);
      else console.log(`[mail] barberovi odoslaný → ${barberEmail} (id ${res?.id})`);
    } catch (e) {
      console.error("[mail] barberovi výnimka:", e);
    }
  } else {
    console.warn("[mail] BARBER_EMAIL nie je nastavené – barberovi sa neposiela.");
  }

  // 2) Zákazníkovi – len ak zadal e-mail.
  if (data.customerEmail) {
    // Zrušovací odkaz (absolútny, cez APP_URL). Ak APP_URL chýba alebo token
    // zlyhá, odkaz sa vynechá – e-mail sa aj tak pošle (len bez cancel linku).
    let cancelUrl: string | null = null;
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      try {
        const token = await signCancelToken(data.bookingId, data.startAt);
        cancelUrl = `${appUrl.replace(/\/$/, "")}/zrusit/${token}`;
      } catch (e) {
        console.error("[mail] cancel token zlyhal (odkaz vynechaný):", e);
      }
    }
    try {
      const { data: res, error } = await resend.emails.send({
        from,
        to: data.customerEmail,
        subject: `Simon'S The Barber — potvrdenie rezervácie ${data.dateLabel} ${data.time}`,
        html: customerHtml(data, cancelUrl),
      });
      if (error) console.error("[mail] zákazníkovi zlyhal:", error);
      else
        console.log(
          `[mail] zákazníkovi odoslaný → ${data.customerEmail} (id ${res?.id})`,
        );
    } catch (e) {
      console.error("[mail] zákazníkovi výnimka:", e);
    }
  }
}

// --- .ics kalendárová príloha (bez externej knižnice) ---------------------

// UTC Date → iCalendar formát "YYYYMMDDTHHMMSSZ".
function icsDateUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escapovanie textu podľa RFC 5545 (poradie dôležité: najprv spätné lomítko).
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Vygeneruje validný .ics (VCALENDAR/VEVENT) z booking dát. Riadky sú CRLF.
// Používa zmrazené startAt/endAt (UTC) – nie prepočet z aktuálneho trvania.
export function buildBookingIcs(data: BookingEmailData): string {
  const uid = `${data.startAt.getTime()}-${data.customerPhone.replace(/\D/g, "")}@simonsthebarber.sk`;
  const summary = icsEscape(`${data.serviceName} — ${data.customerName}`);
  const description = icsEscape(
    `Telefón: ${data.customerPhone}\nCena: ${data.priceLabel}`,
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Simon'S The Barber//Rezervacie//SK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsDateUtc(new Date())}`,
    `DTSTART:${icsDateUtc(data.startAt)}`,
    `DTEND:${icsDateUtc(data.endAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

// --- HTML šablóny ---------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch] as string,
  );
}

function wrap(inner: string): string {
  return `<!doctype html><html lang="sk"><body style="margin:0;background:#f3f4f6;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-weight:700;letter-spacing:0.02em;color:#b8935a;font-size:15px;margin-bottom:18px;">Simon'S The Barber</div>
    ${inner}
  </div>
</body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-top:1px solid #f3f4f6;color:#6b7280;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;border-top:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}

function detailsTable(rows: string[]): string {
  return `<table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows.join(
    "",
  )}</table>`;
}

function barberHtml(d: BookingEmailData): string {
  const rows = [
    detailRow("Meno", d.customerName),
    detailRow("Telefón", d.customerPhone),
    ...(d.customerEmail ? [detailRow("E-mail", d.customerEmail)] : []),
    detailRow("Služba", d.serviceName),
    detailRow("Dátum", d.dateLabel),
    detailRow("Čas", d.time),
    detailRow("Dĺžka", `${d.durationMin} min`),
    detailRow("Cena", d.priceLabel),
  ];
  return wrap(
    `<h1 style="margin:0;font-size:20px;">Nová rezervácia</h1>
     <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Práve pribudla nová rezervácia.</p>
     ${detailsTable(rows)}`,
  );
}

function customerHtml(d: BookingEmailData, cancelUrl: string | null): string {
  const rows = [
    detailRow("Služba", d.serviceName),
    detailRow("Dátum", d.dateLabel),
    detailRow("Čas", d.time),
    detailRow("Dĺžka", `${d.durationMin} min`),
    detailRow("Cena", d.priceLabel),
  ];
  // Zrušovací odkaz len ak máme absolútnu URL; inak pôvodná veta (nič nespadne).
  const cancelBlock = cancelUrl
    ? `<div style="margin:20px 0 0;">
         <a href="${cancelUrl}" style="display:inline-block;border:1px solid #d1d5db;border-radius:8px;padding:9px 16px;color:#374151;text-decoration:none;font-size:13px;font-weight:600;">Zrušiť rezerváciu</a>
       </div>
       <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">
         Zrušiť môžeš najneskôr hodinu pred termínom.
       </p>`
    : `<p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
         Ak sa nemôžeš dostaviť, prosím daj nám vedieť.
       </p>`;
  return wrap(
    `<h1 style="margin:0;font-size:20px;">Ďakujeme za rezerváciu!</h1>
     <p style="margin:8px 0 0;color:#374151;font-size:14px;">
       Ahoj ${escapeHtml(d.customerName)}, tvoja rezervácia je potvrdená. Tešíme sa na teba.
     </p>
     ${detailsTable(rows)}
     ${cancelBlock}`,
  );
}

// --- Presun termínu (admin) ----------------------------------------------

export type RescheduleEmailData = {
  serviceName: string;
  oldDateLabel: string;
  oldTime: string;
  newDateLabel: string;
  newTime: string;
  durationMin: number;
  priceLabel: string;
  customerName: string;
  customerEmail: string; // volať len ak zákazník e-mail zadal
};

// E-mail zákazníkovi o presune termínu. Vlastný try/catch – zlyhanie odoslania
// NESMIE zhodiť už uložený presun (volajúci to má navyše v try/catch).
export async function sendRescheduleEmail(
  data: RescheduleEmailData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      "[mail] RESEND_API_KEY alebo MAIL_FROM nie je nastavené – e-mail o presune preskočený.",
    );
    return;
  }
  const resend = new Resend(apiKey);
  try {
    const { data: res, error } = await resend.emails.send({
      from,
      to: data.customerEmail,
      subject: "Zmena termínu — Simon'S The Barber",
      html: rescheduleHtml(data),
    });
    if (error) console.error("[mail] presun zákazníkovi zlyhal:", error);
    else
      console.log(
        `[mail] presun zákazníkovi odoslaný → ${data.customerEmail} (id ${res?.id})`,
      );
  } catch (e) {
    console.error("[mail] presun výnimka:", e);
  }
}

function rescheduleHtml(d: RescheduleEmailData): string {
  const rows = [
    detailRow("Služba", d.serviceName),
    detailRow("Pôvodný termín", `${d.oldDateLabel} o ${d.oldTime}`),
    detailRow("Nový termín", `${d.newDateLabel} o ${d.newTime}`),
    detailRow("Dĺžka", `${d.durationMin} min`),
    detailRow("Cena", d.priceLabel),
  ];
  return wrap(
    `<h1 style="margin:0;font-size:20px;">Zmena termínu</h1>
     <p style="margin:8px 0 0;color:#374151;font-size:14px;">
       Ahoj ${escapeHtml(d.customerName)}, tvoj termín v Simon'S The Barber sme
       presunuli. Nižšie nájdeš nové detaily.
     </p>
     ${detailsTable(rows)}
     <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
       Ak ti nový termín nevyhovuje, daj nám prosím vedieť.
     </p>`,
  );
}

// --- Zrušenie rezervácie (obom stranám) -----------------------------------

export type CancellationEmailData = {
  serviceName: string;
  dateLabel: string;
  time: string;
  customerName: string;
  customerEmail: string | null; // zákazníkovi len ak zadal e-mail
};

// Po zrušení: barberovi vždy, zákazníkovi len ak má e-mail. Každý send má vlastný
// try/catch – volajúci (softCancelBooking) to má navyše v try/catch, aby zlyhanie
// odoslania NIKDY nezhodilo samotné zrušenie.
export async function sendCancellationEmails(
  data: CancellationEmailData,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const barberEmail = process.env.BARBER_EMAIL;
  if (!apiKey || !from) {
    console.warn(
      "[mail] RESEND_API_KEY alebo MAIL_FROM nie je nastavené – e-maily o zrušení preskočené.",
    );
    return;
  }
  const resend = new Resend(apiKey);

  // 1) Barberovi – vždy (termín sa uvoľnil).
  if (barberEmail) {
    try {
      const { data: res, error } = await resend.emails.send({
        from,
        to: barberEmail,
        subject: `Simon'S The Barber — zrušená rezervácia: ${data.serviceName}, ${data.dateLabel} ${data.time}`,
        html: cancelBarberHtml(data),
      });
      if (error) console.error("[mail] zrušenie barberovi zlyhal:", error);
      else
        console.log(
          `[mail] zrušenie barberovi odoslaný → ${barberEmail} (id ${res?.id})`,
        );
    } catch (e) {
      console.error("[mail] zrušenie barberovi výnimka:", e);
    }
  }

  // 2) Zákazníkovi – len ak zadal e-mail. Bez zrušovacieho odkazu (už je zrušená).
  if (data.customerEmail) {
    try {
      const { data: res, error } = await resend.emails.send({
        from,
        to: data.customerEmail,
        subject: `Simon'S The Barber — zrušenie rezervácie ${data.dateLabel} ${data.time}`,
        html: cancelCustomerHtml(data),
      });
      if (error) console.error("[mail] zrušenie zákazníkovi zlyhal:", error);
      else
        console.log(
          `[mail] zrušenie zákazníkovi odoslaný → ${data.customerEmail} (id ${res?.id})`,
        );
    } catch (e) {
      console.error("[mail] zrušenie zákazníkovi výnimka:", e);
    }
  }
}

function cancelCustomerHtml(d: CancellationEmailData): string {
  const rows = [
    detailRow("Služba", d.serviceName),
    detailRow("Dátum", d.dateLabel),
    detailRow("Čas", d.time),
  ];
  return wrap(
    `<h1 style="margin:0;font-size:20px;">Rezervácia zrušená</h1>
     <p style="margin:8px 0 0;color:#374151;font-size:14px;">
       Ahoj ${escapeHtml(d.customerName)}, tvoja rezervácia bola zrušená.
     </p>
     ${detailsTable(rows)}
     <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
       Ak sa chceš objednať znova, radi ťa privítame.
     </p>`,
  );
}

function cancelBarberHtml(d: CancellationEmailData): string {
  const rows = [
    detailRow("Meno", d.customerName),
    detailRow("Služba", d.serviceName),
    detailRow("Dátum", d.dateLabel),
    detailRow("Čas", d.time),
  ];
  return wrap(
    `<h1 style="margin:0;font-size:20px;">Rezervácia zrušená</h1>
     <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Termín sa uvoľnil.</p>
     ${detailsTable(rows)}`,
  );
}
