"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { ChoiceGrid } from "@/components/tools/choice-grid";
import { CountryPicker } from "@/components/tools/country-picker";
import { StepShell } from "@/components/tools/step-shell";
import { CostResults } from "@/components/tools/cost-calculator/cost-results";
import { getStudyCountry } from "@/data/study-countries";
import {
  LEVEL_LABELS,
  defaultYears,
  tuitionRange,
  typicalTuition,
  type Accommodation,
  type CostInput,
  type CostLevel,
  type Lifestyle,
  type UniversityTier,
} from "@/lib/study-costs";
import { trackEvent } from "@/lib/analytics";
import { cn, formatCurrency } from "@/lib/utils";

const STEPS = ["country", "level", "tier", "duration", "living", "lifestyle", "extras"] as const;
const LEVELS = Object.keys(LEVEL_LABELS) as CostLevel[];

export type CostSettings = Omit<CostInput, "country" | "years" | "rateAdjustment"> & { years: number | null };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 first:mt-0">
      <p className="mb-3 text-sm font-semibold text-ink-900">{title}</p>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[56px] cursor-pointer items-start gap-3 rounded-xl border border-ink-900/10 bg-white px-4 py-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-gold-500" />
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function CostCalculatorTool() {
  const searchParams = useSearchParams();
  const prefillCountry = getStudyCountry(searchParams.get("country"))?.id ?? null;
  const prefillLevel = LEVELS.find((l) => l === searchParams.get("level"));

  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(() => !!prefillCountry && !!prefillLevel);
  const [countryId, setCountryId] = useState<string | null>(prefillCountry);
  const [otherName, setOtherName] = useState("");
  const [settings, setSettings] = useState<CostSettings>({
    level: prefillLevel ?? "masters",
    tier: "mid",
    years: null,
    bigCity: false,
    accommodation: "shared",
    lifestyle: "moderate",
    scholarshipPct: 0,
    applications: 3,
    includeEnglishTest: true,
    includeFlight: true,
    includeSettlingIn: true,
  });

  const country = getStudyCountry(countryId);

  function set<K extends keyof CostSettings>(key: K, value: CostSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  if (showResults && country) {
    return (
      <CostResults
        country={country}
        otherName={otherName}
        settings={settings}
        onChange={setSettings}
        onEdit={(toStep) => {
          setShowResults(false);
          setStep(toStep);
        }}
      />
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const years = country ? settings.years ?? defaultYears(country, settings.level) : 1;

  const shell = {
    step,
    total: STEPS.length,
    onBack: () => setStep((s) => Math.max(0, s - 1)),
    onNext: () => {
      if (isLast) {
        trackEvent("cost_calculator_completed");
        setShowResults(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setStep((s) => s + 1);
    },
    canNext: current !== "country" || !!country,
    nextLabel: isLast ? "See my estimate" : "Next",
  };

  switch (current) {
    case "country":
      return (
        <StepShell {...shell} title="Where do you want to study?" hint="Pick from 39 countries, or choose “Somewhere else” for any other country.">
          <CountryPicker value={countryId} onChange={setCountryId} otherName={otherName} onOtherNameChange={setOtherName} />
        </StepShell>
      );
    case "level":
      return (
        <StepShell {...shell} title="What will you study?">
          <ChoiceGrid
            value={settings.level}
            onChange={(v) => setSettings((s) => ({ ...s, level: v, years: null }))}
            options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
          />
        </StepShell>
      );
    case "tier": {
      const [min, max] = tuitionRange(country!, settings.level);
      const mid = typicalTuition(country!, settings.level) ?? Math.round((min + max) / 2);
      const fmt = (n: number) => (n === 0 ? "often funded" : `≈ ${formatCurrency(n, country!.currency)} a year`);
      return (
        <StepShell {...shell} title="What kind of university?" hint={country!.tuitionNote}>
          <ChoiceGrid<UniversityTier>
            value={settings.tier}
            onChange={(v) => set("tier", v)}
            columns={1}
            options={[
              { value: "budget", label: "Lower-cost university", description: `Public or less expensive institutions: ${fmt(min)}` },
              { value: "mid", label: "Mid-range university", description: `Most students: ${fmt(mid)}` },
              { value: "top", label: "Top-ranked or premium", description: `Leading or specialist institutions: ${fmt(max)}` },
            ]}
          />
        </StepShell>
      );
    }
    case "duration":
      return (
        <StepShell
          {...shell}
          title="How long is your programme?"
          hint={`A typical ${LEVEL_LABELS[settings.level].toLowerCase()} in ${country!.name} takes ${defaultYears(country!, settings.level)} year${
            defaultYears(country!, settings.level) === 1 ? "" : "s"
          }.`}
        >
          <div className="flex items-center justify-center gap-6 rounded-2xl border border-ink-900/10 bg-offwhite p-6">
            <button
              type="button"
              onClick={() => set("years", Math.max(1, years - 1))}
              aria-label="Fewer years"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-900/15 bg-white text-ink-900 hover:border-gold-500"
            >
              <Minus size={18} />
            </button>
            <p className="min-w-[7rem] text-center font-display text-3xl text-ink-900" aria-live="polite">
              {years} <span className="text-base text-muted">year{years === 1 ? "" : "s"}</span>
            </p>
            <button
              type="button"
              onClick={() => set("years", Math.min(7, years + 1))}
              aria-label="More years"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-900/15 bg-white text-ink-900 hover:border-gold-500"
            >
              <Plus size={18} />
            </button>
          </div>
        </StepShell>
      );
    case "living":
      return (
        <StepShell {...shell} title="Where and how will you live?">
          <Section title="City">
            <ChoiceGrid
              value={settings.bigCity ? "big" : "standard"}
              onChange={(v) => set("bigCity", v === "big")}
              options={[
                { value: "standard", label: "A typical university city" },
                { value: "big", label: `A big, expensive city`, description: `e.g. ${country!.bigCities}` },
              ]}
            />
          </Section>
          <Section title="Accommodation">
            <ChoiceGrid<Accommodation>
              value={settings.accommodation}
              onChange={(v) => set("accommodation", v)}
              options={[
                { value: "halls", label: "University halls", description: "Often cheapest and simplest in year one" },
                { value: "shared", label: "Shared private flat" },
                { value: "solo", label: "Private studio / own flat" },
                { value: "family", label: "With family or friends", description: "Contributing towards bills only" },
              ]}
            />
          </Section>
        </StepShell>
      );
    case "lifestyle":
      return (
        <StepShell {...shell} title="Lifestyle and scholarships">
          <Section title="How do you plan to live?">
            <ChoiceGrid<Lifestyle>
              value={settings.lifestyle}
              onChange={(v) => set("lifestyle", v)}
              columns={3}
              options={[
                { value: "frugal", label: "Careful", description: "Cook at home, budget tightly" },
                { value: "moderate", label: "Moderate", description: "Some eating out and travel" },
                { value: "comfortable", label: "Comfortable", description: "More eating out and trips" },
              ]}
            />
          </Section>
          <Section title="Expecting a scholarship or tuition discount?">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[0, 10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  aria-pressed={settings.scholarshipPct === pct}
                  onClick={() => set("scholarshipPct", pct)}
                  className={cn(
                    "min-h-[48px] rounded-xl border text-sm font-semibold transition-colors",
                    settings.scholarshipPct === pct ? "border-gold-500 bg-gold-500/5 text-ink-900 ring-1 ring-gold-500" : "border-ink-900/10 text-ink-900 hover:border-ink-900/30",
                  )}
                >
                  {pct === 0 ? "None" : pct === 100 ? "Full fees" : `${pct}% off`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{country!.scholarshipNote}</p>
          </Section>
        </StepShell>
      );
    case "extras":
      return (
        <StepShell {...shell} title="What else should we include?">
          <Section title="How many universities will you apply to?">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => set("applications", Math.max(0, settings.applications - 1))}
                aria-label="Fewer applications"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-900/15 text-ink-900 hover:border-gold-500"
              >
                <Minus size={18} />
              </button>
              <span className="w-8 text-center font-display text-2xl text-ink-900" aria-live="polite">
                {settings.applications}
              </span>
              <button
                type="button"
                onClick={() => set("applications", Math.min(10, settings.applications + 1))}
                aria-label="More applications"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-900/15 text-ink-900 hover:border-gold-500"
              >
                <Plus size={18} />
              </button>
              <span className="text-xs text-muted">
                {country!.applicationFee > 0 ? `≈ ${formatCurrency(country!.applicationFee, country!.currency)} each` : "Usually free to apply"}
              </span>
            </div>
          </Section>
          <Section title="One-off costs">
            <div className="flex flex-col gap-2">
              <Toggle
                label="English test (IELTS)"
                description="Untick if you already have your results"
                checked={settings.includeEnglishTest}
                onChange={(v) => set("includeEnglishTest", v)}
              />
              <Toggle label="Flight from Nigeria" checked={settings.includeFlight} onChange={(v) => set("includeFlight", v)} />
              <Toggle
                label="Settling-in money"
                description="Rent deposit, bedding, winter clothing and your first weeks' shopping"
                checked={settings.includeSettlingIn}
                onChange={(v) => set("includeSettlingIn", v)}
              />
            </div>
          </Section>
        </StepShell>
      );
  }
}
