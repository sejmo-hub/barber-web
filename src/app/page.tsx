import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { minutesToHHMM, WEEKDAYS, formatServicePrice } from "@/lib/format";
import { isoWeekdayUTC, todayLocalStartUTC } from "@/lib/date";
import { Gallery } from "./gallery";
import { MobileNav } from "./mobile-nav";

export const dynamic = "force-dynamic";

// Silnejší grain pre atmosféru.
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const TICKER = [
  "Strih",
  "Fade",
  "Brada",
  "Hot towel",
  "Styling",
  "Walk-ins welcome",
];

export default async function HomePage() {
  const [services, workingHours] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
    prisma.workingHours.findMany({
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    }),
  ]);

  const whByDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (const w of workingHours) {
    const arr = whByDay.get(w.weekday) ?? [];
    arr.push({ startMinute: w.startMinute, endMinute: w.endMinute });
    whByDay.set(w.weekday, arr);
  }
  const todayIso = isoWeekdayUTC(todayLocalStartUTC());

  return (
    <div className="relative min-h-screen bg-ink text-cream">
      {/* grain cez celú plochu */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.06] mix-blend-soft-light"
        style={{ backgroundImage: `url("${GRAIN}")` }}
      />

      {/* Sticky hlavička */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Wordmark size="sm" />
          <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-widest text-muted md:flex">
            <a href="#sluzby" className="transition-colors hover:text-cream">Služby</a>
            <a href="#galeria" className="transition-colors hover:text-cream">Galéria</a>
            <a href="#kontakt" className="transition-colors hover:text-cream">Kontakt</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/rezervacia" className={ctaClass("sm")}>
              Rezervovať
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      <main>
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[92vh] flex-col overflow-hidden">
        {/* pozadie = miesto pre veľkú hero fotku */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-ink2 via-ink to-black" />
          {/* diagonálne linky (barber pole nádych) */}
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent 0, transparent 22px, rgba(201,169,97,0.04) 22px, rgba(201,169,97,0.04) 23px)",
            }}
          />
          {/* zlatý glow */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(60% 55% at 78% 22%, rgba(201,169,97,0.18), transparent 60%)",
            }}
          />
          {/* overlay pre čitateľnosť textu */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
        </div>

        {/* obsah */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-16 sm:px-6">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            {/* ĽAVÁ – text */}
            <div>
              {/* badge riadok */}
              <div className="mb-8 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                <span className="border border-gold/40 px-3 py-1.5 text-gold">Est. 2026</span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Walk-ins welcome
                </span>
                <span className="hidden sm:inline">/ Pánsky barbershop</span>
              </div>

              {/* vysadený názov – layered */}
              <div className="relative">
                <span
                  aria-hidden
                  className="text-stroke-gold pointer-events-none absolute -left-0.5 -top-1 select-none font-display uppercase leading-[0.78] opacity-40"
                  style={{ fontSize: "clamp(3rem, 13vw, 9.5rem)" }}
                >
                  Simon&#39;s
                </span>
                <h1
                  className="relative font-display uppercase leading-[0.78] text-cream"
                  style={{
                    fontSize: "clamp(3rem, 13vw, 9.5rem)",
                    textShadow: "0 0 70px rgba(201,169,97,0.18)",
                  }}
                >
                  Simon&#39;s
                </h1>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="h-px w-12 bg-gold" />
                <span className="font-mono text-sm uppercase tracking-[0.4em] text-muted sm:text-base">
                  <span className="text-gold">The</span> Barber
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
              </div>

              {/* Barberovo motto z cenníka – citát, "fresh" zlatou, zlatá korunka */}
              <p className="mt-8 max-w-lg text-lg italic leading-relaxed text-cream/90">
                &bdquo;Príď si pre strih a buď stále{" "}
                <span className="not-italic font-medium text-gold underline decoration-gold/40 underline-offset-4">
                  fresh
                </span>{" "}
                aj hore aj{" "}
                <span className="whitespace-nowrap">
                  dole&ldquo;{" "}
                  <CrownIcon className="ml-1 inline-block h-[1.1em] w-[1.1em] -translate-y-[0.15em] text-gold" />
                </span>
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/rezervacia" className={ctaClass("lg")}>
                  Rezervovať termín{" "}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <a
                  href="#sluzby"
                  className="border border-line px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest text-cream transition-colors duration-300 hover:border-gold/60 hover:text-gold"
                >
                  Cenník
                </a>
              </div>
            </div>

            {/* PRAVÁ – ilustrácia majiteľa (priehľadné PNG + zlatý glow) */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[240px] sm:max-w-xs lg:max-w-md">
                {/* Glow väčší než obrázok, mäkko vyprchá do transparent dávno
                    pred vlastnou hranou – žiadne orezané okraje. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2"
                  style={{
                    backgroundImage:
                      "radial-gradient(closest-side, rgba(201,169,97,0.20), rgba(201,169,97,0.07) 45%, transparent 72%)",
                  }}
                />
                <Image
                  src="/logo-simon.png"
                  alt="Simon'S The Barber"
                  width={1024}
                  height={1024}
                  priority
                  sizes="(max-width: 1024px) 62vw, 40vw"
                  className="relative h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="relative z-10 overflow-hidden border-y border-line bg-ink2/70 py-4 backdrop-blur-sm">
          <div className="flex w-max animate-marquee">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                {TICKER.map((w) => (
                  <span
                    key={w}
                    className="flex items-center font-mono text-sm uppercase tracking-[0.2em] text-muted"
                  >
                    <span className="mx-6 text-gold">/</span>
                    {w}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 01 SLUŽBY ============ */}
      <section id="sluzby" className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
        <SectionHead num="01" overline="Cenník" title="Služby" />
        {services.length === 0 ? (
          <p className="mt-10 text-muted">Služby budú čoskoro doplnené.</p>
        ) : (
          <div className="mt-12 space-y-4">
            {services.map((s, i) => (
              <ServiceCard key={s.id} s={s} num={String(i + 1).padStart(2, "0")} />
            ))}
          </div>
        )}
      </section>

      {/* ============ 02 GALÉRIA ============ */}
      <section id="galeria" className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
          <SectionHead num="02" overline="Portfólio" title="Naša práca" />
          <Gallery />
        </div>
      </section>

      {/* ============ 03 KONTAKT ============ */}
      <section id="kontakt" className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
          <SectionHead num="03" overline="Návšteva" title="Kde nás nájdeš" />
          <div className="mt-12 grid gap-12 md:grid-cols-3">
            {/* Adresa */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-gold">
                Adresa
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-cream">
                Kuklov 12
                <br />
                908 78 Kuklov
              </p>
              {/* Google Maps embed cez q parameter – bez API kľúča. Filter zladí
                  mapu s tmavým brandom; ak chceš klasickú farebnú mapu, odstráň
                  vlastnosť filter v style. */}
              <div className="mt-5 overflow-hidden rounded-sm border border-line ring-1 ring-gold/20">
                <iframe
                  title="Mapa — Simon'S The Barber, Kuklov 12"
                  src="https://maps.google.com/maps?q=Kuklov%2012%2C%20908%2078%20Kuklov&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-[340px] w-full"
                  style={{ border: 0, filter: "invert(0.9) hue-rotate(180deg)" }}
                />
              </div>
            </div>

            {/* Otváracie hodiny */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-gold">
                Otváracie hodiny
              </h3>
              <div className="mt-4">
                {WEEKDAYS.map((d) => {
                  const blocks = whByDay.get(d.iso) ?? [];
                  const isToday = d.iso === todayIso;
                  return (
                    <div
                      key={d.iso}
                      className={
                        "flex items-center justify-between border-t border-line py-2.5 text-sm " +
                        (isToday ? "text-cream" : "text-muted")
                      }
                    >
                      <span className={isToday ? "font-medium text-gold" : ""}>
                        {d.label}
                      </span>
                      <span className="font-mono text-xs">
                        {blocks.length
                          ? blocks
                              .map(
                                (b) =>
                                  `${minutesToHHMM(b.startMinute)}–${minutesToHHMM(b.endMinute)}`,
                              )
                              .join(", ")
                          : "Zatvorené"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kontakt */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-gold">
                Kontakt
              </h3>
              <a
                href="tel:+421944469217"
                className="mt-4 block font-display text-3xl text-cream transition-colors hover:text-gold"
              >
                0944 469 217
              </a>
              <p className="mt-2 text-sm text-muted">
                Nájdeš nás aj na Instagrame a Facebooku.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-widest text-muted">
                <a
                  href="https://instagram.com/s1m0n.daniel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-line px-3 py-1.5 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  Instagram
                </a>
                {/* TODO: doplniť presný Facebook URL (zatiaľ všeobecný facebook.com) */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-line px-3 py-1.5 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  Facebook
                </a>
                <a
                  href="https://wa.me/421944469217"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-line px-3 py-1.5 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  WhatsApp
                </a>
              </div>
              <Link href="/rezervacia" className={`${ctaClass("lg")} mt-8 inline-block`}>
                Rezervovať termín
              </Link>
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* ============ PÄTIČKA ============ */}
      <footer className="relative overflow-hidden border-t border-gold/20">
        <span
          aria-hidden
          className="text-stroke pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 select-none font-display uppercase leading-none opacity-[0.06]"
          style={{ fontSize: "22vw" }}
        >
          Barber
        </span>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-14 text-center sm:flex-row sm:justify-between sm:text-left">
          <Wordmark size="sm" />
          <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span className="text-gold">Est. 2026</span>
            <span className="text-line">|</span>
            <a
              href="https://instagram.com/s1m0n.daniel"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gold"
            >
              Instagram
            </a>
            {/* TODO: doplniť presný Facebook URL */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gold"
            >
              Facebook
            </a>
          </div>
          <p className="font-mono text-[11px] text-muted">
            © 2026 Simon&#39;S The Barber
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---- Pomocné komponenty ---------------------------------------------------

// Zlatá korunka k mottu (SVG namiesto emoji – konzistentná na všetkých
// zariadeniach). Dedí farbu cez currentColor.
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 7.5 7.2 11 12 4.5 16.8 11 21 7.5l-1.6 9H4.6L3 7.5Z" />
      <rect x="4.4" y="18" width="15.2" height="1.8" rx="0.5" />
    </svg>
  );
}

function ServiceCard({
  s,
  num,
}: {
  s: {
    id: string;
    name: string;
    description: string | null;
    durationMin: number;
    priceCents: number;
    priceMaxCents: number | null;
    bookable: boolean;
  };
  num: string;
}) {
  const priceLabel = formatServicePrice(s.priceCents, s.priceMaxCents);
  const base =
    "group relative flex items-start gap-5 overflow-hidden border border-line bg-panel p-6 transition-colors duration-300 sm:gap-8 sm:p-8";

  const body = (
    <div className="flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-2xl uppercase leading-none text-cream sm:text-3xl">
          {s.name}
        </h3>
        <span className="whitespace-nowrap font-display text-2xl leading-none text-gold sm:text-3xl">
          {priceLabel}
        </span>
      </div>
      {s.description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {s.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {s.durationMin} min{!s.bookable && " · Cena podľa dohody"}
        </span>
        {s.bookable ? (
          <span className="font-mono text-xs uppercase tracking-widest text-muted transition-colors group-hover:text-gold">
            Rezervovať{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        ) : (
          <a
            href="https://instagram.com/s1m0n.daniel"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-widest text-gold hover:underline"
          >
            Napíš nám →
          </a>
        )}
      </div>
    </div>
  );

  if (s.bookable) {
    return (
      <Link
        href={`/rezervacia?service=${s.id}`}
        className={`${base} hover:border-gold/60`}
      >
        <span className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-gradient-to-b from-gold to-gold-deep transition-transform duration-300 group-hover:scale-y-100" />
        <span className="mt-1 font-mono text-sm text-gold">{num}</span>
        {body}
      </Link>
    );
  }

  return (
    <div className={base}>
      <span className="mt-1 font-mono text-sm text-gold">{num}</span>
      {body}
    </div>
  );
}

function ctaClass(size: "sm" | "lg"): string {
  const pad = size === "lg" ? "px-8 py-4 text-sm" : "px-5 py-2.5 text-xs";
  return (
    "group inline-flex items-center gap-2 bg-gradient-to-b from-gold to-gold-deep font-mono font-bold uppercase tracking-wider text-ink " +
    "transition-all duration-300 hover:shadow-[0_10px_40px_-8px_rgba(201,169,97,0.5)] hover:brightness-110 " +
    pad
  );
}

function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
  const simon = size === "sm" ? "text-2xl" : "text-4xl";
  const sub = size === "sm" ? "text-[8px]" : "text-[10px]";
  return (
    <div className="leading-none">
      <div className={`${simon} font-display uppercase leading-none text-cream`}>
        Simon&#39;s
      </div>
      <div
        className={`${sub} mt-1 font-mono uppercase tracking-[0.35em] text-muted`}
      >
        <span className="text-gold">The</span> Barber
      </div>
    </div>
  );
}

function SectionHead({
  num,
  overline,
  title,
}: {
  num: string;
  overline: string;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-line pb-6">
      <div>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
          {overline}
        </span>
        <h2 className="mt-3 font-display text-5xl uppercase leading-[0.85] text-cream sm:text-6xl md:text-7xl">
          {title}
        </h2>
      </div>
      <span
        aria-hidden
        className="text-stroke select-none font-display leading-none"
        style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}
      >
        {num}
      </span>
    </div>
  );
}

