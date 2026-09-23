"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { faqs, faqCategories } from "@/data/faqs";

const tabs = [{ id: "All" as const, label: "All" }, ...faqCategories.map((c) => ({ id: c, label: c }))];

export function FaqExplorer() {
  const [category, setCategory] = useState<(typeof faqCategories)[number] | "All">("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const matchesCategory = category === "All" || f.category === category;
      const matchesQuery =
        query.trim() === "" ||
        f.question.toLowerCase().includes(query.toLowerCase()) ||
        f.answer.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div>
      <div className="relative mx-auto max-w-xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full rounded-full border border-ink-900/10 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-gold-500"
        />
      </div>

      <div className="mt-6 flex justify-center">
        <Tabs tabs={tabs} defaultTab="All" onChange={setCategory} />
      </div>

      <div className="mt-8">
        {filtered.length > 0 ? (
          <Accordion items={filtered} />
        ) : (
          <p className="py-10 text-center text-sm text-muted">No questions match your search yet, try a different term, or ask us directly.</p>
        )}
      </div>
    </div>
  );
}
