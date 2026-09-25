"use client";

import { useMemo, useState } from "react";
import { Globe2, Search, X } from "lucide-react";
import { Flag } from "@/components/ui/flag";
import {
  REGIONS,
  countriesAlphabetical,
  popularCountries,
  regionalFallbacks,
  type StudyCountry,
  type StudyRegion,
} from "@/data/study-countries";
import { cn } from "@/lib/utils";

type Filter = "all" | "popular" | StudyRegion;

function CountryButton({ country, selected, onSelect }: { country: StudyCountry; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-medium text-ink-900 transition-colors",
        selected ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white hover:border-ink-900/30",
      )}
    >
      <Flag code={country.flagCode} size={22} />
      <span className="min-w-0 leading-tight">{country.name}</span>
    </button>
  );
}

export function CountryPicker({
  value,
  onChange,
  otherName,
  onOtherNameChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
  otherName: string;
  onOtherNameChange: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const selectedIsOther = !!value?.startsWith("region-");
  const [showOther, setShowOther] = useState(selectedIsOther);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = countriesAlphabetical;
    if (filter === "popular") list = popularCountries;
    else if (filter !== "all") list = list.filter((c) => c.region === filter);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q));
    return list;
  }, [query, filter]);

  const grouped = filter === "all" && !query.trim();
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${countriesAlphabetical.length})` },
    { id: "popular", label: "Popular" },
    ...REGIONS.map((r) => ({ id: r as Filter, label: r })),
  ];

  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries…"
          aria-label="Search countries"
          className="min-h-[48px] w-full rounded-xl border border-ink-900/12 bg-white py-3 pl-10 pr-4 text-sm text-ink-900 outline-none focus:border-gold-500"
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "min-h-[36px] shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors",
              filter === f.id ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-900 hover:bg-ink-900/10",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[24rem] overflow-y-auto rounded-xl pr-1">
        {grouped && (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Popular with Nigerian students</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {popularCountries.map((c) => (
                <CountryButton key={c.id} country={c} selected={value === c.id} onSelect={() => onChange(c.id)} />
              ))}
            </div>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">All countries A–Z</p>
          </>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(grouped ? results.filter((c) => !c.popular) : results).map((c) => (
            <CountryButton key={c.id} country={c} selected={value === c.id} onSelect={() => onChange(c.id)} />
          ))}
        </div>
        {results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            No match for &ldquo;{query}&rdquo;. Use &ldquo;Somewhere else&rdquo; below: we help with every country.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-ink-900/15 p-4">
        {!showOther ? (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className="flex min-h-[44px] w-full items-center gap-2.5 text-left text-sm font-semibold text-ink-900"
          >
            <Globe2 size={20} className="text-gold-500" />
            Somewhere else? We help students go anywhere in the world.
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Globe2 size={18} className="text-gold-500" /> Somewhere else
              </p>
              <button
                type="button"
                onClick={() => setShowOther(false)}
                aria-label="Close"
                className="rounded-full p-2 text-muted hover:bg-ink-100"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={otherName}
              onChange={(e) => onOtherNameChange(e.target.value)}
              placeholder="Which country? (e.g. Luxembourg, Greece, Qatar)"
              className="mt-3 min-h-[48px] w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500"
            />
            <p className="mt-3 text-xs text-muted">Which region is it in? We&apos;ll use regional averages until a counsellor confirms exact figures.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const id = regionalFallbacks[r].id;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChange(id)}
                    aria-pressed={value === id}
                    className={cn(
                      "min-h-[40px] rounded-full border px-3.5 text-xs font-semibold transition-colors",
                      value === id ? "border-gold-500 bg-gold-500/5 text-ink-900 ring-1 ring-gold-500" : "border-ink-900/10 text-ink-900 hover:border-ink-900/30",
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
