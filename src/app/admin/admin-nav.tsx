"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/kalendar", label: "Kalendár" },
  { href: "/admin/sluzby", label: "Služby" },
  { href: "/admin/hodiny", label: "Pracovné hodiny" },
  { href: "/admin/volno", label: "Voľno" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {LINKS.map((l) => {
        const active =
          pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              "transition-colors " +
              (active ? "text-gold" : "text-muted hover:text-cream")
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
