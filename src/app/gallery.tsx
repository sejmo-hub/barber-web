"use client";

import Image from "next/image";
import { useState } from "react";

// Reálne fotky strihov. Rozmery (intrinsic) drží next/image správny pomer strán
// v masonry (žiadna deformácia); next/image rieši formát, veľkosť aj lazy-load.
const PHOTOS: { src: string; w: number; h: number }[] = [
  { src: "/galeria/strih-1.jpg", w: 1179, h: 1371 },
  { src: "/galeria/strih-2.jpg", w: 1179, h: 1636 },
  { src: "/galeria/strih-3.jpg", w: 986, h: 1243 },
  { src: "/galeria/strih-4.jpg", w: 1179, h: 1628 },
  { src: "/galeria/strih-5.jpg", w: 1179, h: 1564 },
  { src: "/galeria/strih-6.jpg", w: 1179, h: 1365 },
  { src: "/galeria/strih-7.jpg", w: 1179, h: 1538 },
  { src: "/galeria/strih-8.jpg", w: 1179, h: 1156 },
  { src: "/galeria/strih-9.jpg", w: 1179, h: 1389 },
  { src: "/galeria/strih-10.jpg", w: 1179, h: 1031 },
  { src: "/galeria/strih-11.jpg", w: 1179, h: 1383 },
  { src: "/galeria/strih-12.jpg", w: 1179, h: 1224 },
  { src: "/galeria/strih-13.jpg", w: 1179, h: 1501 },
  { src: "/galeria/strih-14.jpg", w: 1179, h: 1478 },
  { src: "/galeria/strih-15.jpg", w: 1179, h: 2556 },
  { src: "/galeria/strih-16.jpg", w: 1179, h: 1738 },
  { src: "/galeria/strih-17.jpg", w: 1179, h: 1634 },
];

const INITIAL = 6;

export function Gallery() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? PHOTOS : PHOTOS.slice(0, INITIAL);

  return (
    <>
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
        {visible.map((p, i) => (
          <figure
            key={p.src}
            className="group relative block aspect-[4/5] overflow-hidden rounded-lg border border-line bg-ink2"
          >
            <Image
              src={p.src}
              alt={`Strih ${i + 1} — Simon'S The Barber`}
              width={p.w}
              height={p.h}
              // Na mobile ~50vw (2 stĺpce), na desktope ~33vw (3 stĺpce) →
              // prehliadač si stiahne menšiu verziu, nie plnú veľkosť.
              sizes="(max-width: 768px) 50vw, 33vw"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <span className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-300 group-hover:border-gold/40" />
          </figure>
        ))}
      </div>

      {PHOTOS.length > INITIAL && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="group inline-flex items-center gap-3 border border-line bg-panel px-8 py-4 font-mono text-xs font-bold uppercase tracking-widest text-cream transition-colors duration-300 hover:border-gold/60 hover:text-gold"
          >
            {expanded ? "Zobraziť menej" : "Zobraziť viac"}
            <span className="text-gold transition-transform duration-300 group-hover:translate-y-0.5">
              {expanded ? "↑" : "↓"}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
