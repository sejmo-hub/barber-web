"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// Mobilná navigácia (hamburger) – zobrazuje sa len pod md breakpointom,
// desktop nav v hlavičke ostáva nezmenený. Panel + backdrop sa renderujú
// cez portál do <body>, lebo backdrop-blur na hlavičke by inak "uväznil"
// fixed pozicované prvky vo vnútri hlavičky (containing block).
const LINKS = [
  { href: "#sluzby", num: "01", label: "Služby" },
  { href: "#galeria", num: "02", label: "Galéria" },
  { href: "#kontakt", num: "03", label: "Kontakt" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  // Horná hrana panelu = spodná hrana hlavičky (meria sa pri otvorení).
  const [panelTop, setPanelTop] = useState(64);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (!open) {
      const header = btnRef.current?.closest("header");
      if (header) setPanelTop(Math.round(header.getBoundingClientRect().bottom));
    }
    setOpen((o) => !o);
  };

  // Otvorené menu: Esc zatvorí (fokus späť na tlačidlo) + zámok scrollu.
  // Fokus sa presunie na prvý odkaz v paneli (klávesnica/čítačky).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document
      .querySelector<HTMLAnchorElement>("#mobile-menu a")
      ?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? "Zavrieť menu" : "Otvoriť menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={toggle}
        className="flex h-11 w-11 items-center justify-center border border-line text-cream transition-colors duration-300 hover:border-gold/60 hover:text-gold"
      >
        {/* hamburger ↔ X (plynulý morf) */}
        <span aria-hidden className="relative block h-[16px] w-5">
          <span
            className={`absolute left-0 top-0 h-0.5 w-full bg-current transition-transform duration-300 motion-reduce:transition-none ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[7px] h-0.5 w-full bg-current transition-opacity duration-300 motion-reduce:transition-none ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[14px] h-0.5 w-full bg-current transition-transform duration-300 motion-reduce:transition-none ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open &&
        createPortal(
          <>
            {/* backdrop – klik mimo menu zatvorí */}
            <div
              aria-hidden
              onClick={close}
              className="animate-menu-fade fixed inset-x-0 bottom-0 z-30 bg-black/60 md:hidden"
              style={{ top: panelTop }}
            />
            {/* výsuvný panel pod hlavičkou */}
            <div
              id="mobile-menu"
              className="animate-menu-panel fixed inset-x-0 z-50 border-b border-gold/25 bg-ink2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] md:hidden"
              style={{ top: panelTop }}
            >
              <nav className="px-5 py-6" aria-label="Mobilná navigácia">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    className="group flex items-baseline gap-4 border-b border-line/60 py-4 last:border-b-0"
                  >
                    <span className="font-mono text-xs text-gold">{l.num}</span>
                    <span className="font-display text-3xl uppercase leading-none text-cream transition-colors group-hover:text-gold">
                      {l.label}
                    </span>
                  </a>
                ))}
                <Link
                  href="/rezervacia"
                  onClick={close}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-gradient-to-b from-gold to-gold-deep px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-ink transition-all duration-300 hover:brightness-110"
                >
                  Rezervovať termín →
                </Link>
              </nav>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
