"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, GraduationCap, Globe2, BookOpen, HelpCircle, Download } from "lucide-react";
import { services } from "@/data/services";
import { destinations } from "@/data/destinations";
import { blogPosts } from "@/data/blog-posts";
import { faqs } from "@/data/faqs";
import { guides } from "@/data/guides";

type Result = { title: string; snippet: string; href: string; group: string };

const groupIcons: Record<string, typeof Search> = {
  Services: GraduationCap,
  Destinations: Globe2,
  Blog: BookOpen,
  FAQ: HelpCircle,
  Guides: Download,
};

function buildIndex(): Result[] {
  return [
    ...services.map((s) => ({ title: s.name, snippet: s.shortDescription, href: `/services/${s.slug}`, group: "Services" })),
    ...destinations.map((d) => ({ title: d.name, snippet: d.heroTagline, href: `/destinations/${d.slug}`, group: "Destinations" })),
    ...blogPosts.map((p) => ({ title: p.title, snippet: p.excerpt, href: `/blog/${p.slug}`, group: "Blog" })),
    ...faqs.map((f) => ({ title: f.question, snippet: f.answer, href: "/faq", group: "FAQ" })),
    ...guides.map((g) => ({ title: g.title, snippet: g.description, href: "/guides", group: "Guides" })),
  ];
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const index = useMemo(() => buildIndex(), []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const results =
    query.trim().length < 2
      ? []
      : index
          .filter(
            (r) =>
              r.title.toLowerCase().includes(query.toLowerCase()) || r.snippet.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-ink-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-24 z-[101] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Search the site"
          >
            <div className="flex items-center gap-3 border-b border-ink-900/8 px-5 py-4">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services, destinations, blog, FAQs…"
                className="w-full text-sm outline-none placeholder:text-muted"
              />
              <button type="button" onClick={onClose} aria-label="Close search" className="shrink-0 rounded-full p-1 text-muted hover:bg-ink-100 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query.trim().length >= 2 && results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted">No results for &quot;{query}&quot;. Try a different term.</p>
              )}
              {results.map((r, i) => {
                const Icon = groupIcons[r.group] ?? Search;
                return (
                  <Link
                    key={`${r.group}-${i}-${r.href}`}
                    href={r.href}
                    onClick={onClose}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-offwhite"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-500">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gold-500">{r.group}</span>
                      <span className="block truncate text-sm font-semibold text-ink-900">{r.title}</span>
                      <span className="block truncate text-xs text-muted">{r.snippet}</span>
                    </span>
                  </Link>
                );
              })}
              {query.trim().length < 2 && (
                <p className="px-3 py-8 text-center text-sm text-muted">Type at least 2 characters to search the site.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
