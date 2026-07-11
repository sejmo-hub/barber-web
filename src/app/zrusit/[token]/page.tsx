import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/generated/prisma/client";
import { verifyCancelToken } from "@/lib/cancel-token";
import {
  formatDateOnly,
  localDateStringToUTC,
  utcToLocalParts,
} from "@/lib/date";
import { minutesToHHMM } from "@/lib/format";
import { CancelConfirm } from "./cancel-confirm";

// Verejná stránka (bez admin auth). GET IBA číta – žiadne mutácie pri načítaní
// (odkazy sa prednačítavajú/skenujú). Samotné zrušenie beží len po kliknutí na
// tlačidlo (server action cez POST v CancelConfirm).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Zrušenie rezervácie",
  robots: { index: false, follow: false }, // token URL sa neindexuje
};

// Brandový obal (čierna/zlatá) + wordmark, konzistentný so zvyškom webu.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 text-cream">
      <div className="w-full max-w-md text-center">
        <Link href="/" aria-label="Simon'S The Barber — domov" className="inline-block">
          <span className="block font-display text-3xl uppercase leading-none text-cream">
            Simon&#39;s
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.4em] text-muted">
            <span className="text-gold">The</span> Barber
          </span>
        </Link>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}

function Message({
  heading,
  text,
}: {
  heading: string;
  text: string;
}) {
  return (
    <>
      <h1 className="font-display text-3xl uppercase leading-none text-cream">
        {heading}
      </h1>
      <p className="mt-4 text-sm text-muted">{text}</p>
      <Link
        href="/"
        className="mt-8 inline-block font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
      >
        ← Späť na web
      </Link>
    </>
  );
}

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await verifyCancelToken(token);

  // 1) neplatný / expirovaný token
  if (!payload) {
    return (
      <Shell>
        <Message
          heading="Odkaz neplatný"
          text="Tento odkaz na zrušenie je neplatný alebo expiroval — rezerváciu už nie je možné zrušiť online (menej ako hodinu pred termínom). Ak potrebuješ termín zrušiť, ozvi sa nám telefonicky."
        />
      </Shell>
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    include: { service: { select: { name: true } } },
  });

  // rezervácia neexistuje (napr. zmazaná) – správame sa ako neplatný odkaz
  if (!booking) {
    return (
      <Shell>
        <Message
          heading="Odkaz neplatný"
          text="Rezervácia sa nenašla. Možno už bola odstránená."
        />
      </Shell>
    );
  }

  // 2a) už zrušená → idempotentné, žiadna akcia
  if (booking.status !== BookingStatus.CONFIRMED) {
    return (
      <Shell>
        <Message
          heading="Rezervácia zrušená"
          text="Táto rezervácia už bola zrušená. Ak sa chceš objednať znova, radi ťa privítame."
        />
      </Shell>
    );
  }

  // 2b) CONFIRMED → potvrdzovacia obrazovka (zrušenie až po kliknutí)
  const s = utcToLocalParts(booking.startAt);
  const dateLabel = formatDateOnly(localDateStringToUTC(s.dateStr)!);
  const time = minutesToHHMM(s.minutes);

  return (
    <Shell>
      <CancelConfirm
        token={token}
        serviceName={booking.service.name}
        dateLabel={dateLabel}
        time={time}
      />
    </Shell>
  );
}
