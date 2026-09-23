"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "costs", label: "Costs" },
  { id: "courses", label: "Courses" },
  { id: "visa", label: "Visa" },
  { id: "faq", label: "FAQ" },
];

/** Desktop-only scroll-spy sub-nav for destination detail pages. */
export function DestinationSubNav() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-40% 0px -50% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="sticky top-16 z-30 hidden border-b border-ink-900/8 bg-white/95 backdrop-blur-lg lg:block">
      <nav className="mx-auto flex max-w-6xl gap-6 px-4 sm:px-6 lg:px-8">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn(
              "relative py-4 text-sm font-medium transition-colors",
              active === s.id ? "text-gold-500" : "text-ink-900/60 hover:text-ink-900",
            )}
          >
            {s.label}
            {active === s.id && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-gold-500" />}
          </a>
        ))}
      </nav>
    </div>
  );
}
