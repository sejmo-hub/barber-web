import Link from "next/link";

export const metadata = {
  title: "Stránka neexistuje",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center text-cream">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
        Chyba 404
      </span>
      <span className="mt-4 font-display text-8xl uppercase leading-none text-cream sm:text-9xl">
        404
      </span>
      <h1 className="mt-4 font-display text-3xl uppercase leading-none text-cream sm:text-4xl">
        Stránka neexistuje
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Táto stránka sa nenašla — možno bola presunutá alebo odkaz nie je platný.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="bg-gradient-to-b from-gold to-gold-deep px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-ink transition-all duration-300 hover:brightness-110"
        >
          Späť na hlavnú
        </Link>
        <Link
          href="/rezervacia"
          className="border border-line px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-cream transition-colors duration-300 hover:border-gold/60 hover:text-gold"
        >
          Rezervovať termín
        </Link>
      </div>
    </div>
  );
}
