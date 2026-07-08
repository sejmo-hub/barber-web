import { Resend } from "resend";

export type BookingEmailData = {
  serviceName: string;
  dateLabel: string;
  time: string;
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
        subject: `Nová rezervácia — ${data.serviceName}, ${data.dateLabel} ${data.time}`,
        html: barberHtml(data),
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
    try {
      const { data: res, error } = await resend.emails.send({
        from,
        to: data.customerEmail,
        subject: `Potvrdenie rezervácie — ${data.dateLabel} ${data.time}`,
        html: customerHtml(data),
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

function customerHtml(d: BookingEmailData): string {
  const rows = [
    detailRow("Služba", d.serviceName),
    detailRow("Dátum", d.dateLabel),
    detailRow("Čas", d.time),
    detailRow("Dĺžka", `${d.durationMin} min`),
    detailRow("Cena", d.priceLabel),
  ];
  return wrap(
    `<h1 style="margin:0;font-size:20px;">Ďakujeme za rezerváciu!</h1>
     <p style="margin:8px 0 0;color:#374151;font-size:14px;">
       Ahoj ${escapeHtml(d.customerName)}, tvoja rezervácia je potvrdená. Tešíme sa na teba.
     </p>
     ${detailsTable(rows)}
     <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
       Ak sa nemôžeš dostaviť, prosím daj nám vedieť.
     </p>`,
  );
}
