"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/tools/donut-chart";
import { destinations } from "@/data/destinations";
import { calculateCost, type CostCalculatorInput } from "@/lib/cost-calculator";
import { formatNaira, formatCurrency } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { CountryCode } from "@/types";

function isCountryCode(value: string): value is CountryCode {
  return destinations.some((d) => d.code === value);
}

const toggleFields: { key: keyof Omit<CostCalculatorInput, "country">; label: string }[] = [
  { key: "includeVisaFee", label: "Visa Fee" },
  { key: "includeHealthCover", label: "Health Insurance / Surcharge" },
  { key: "includeEnglishTest", label: "English Test Fee" },
  { key: "includeFlight", label: "Flight (round trip)" },
  { key: "includeSettlingIn", label: "Travel / Settling-In Money" },
];

const selectClass = "w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500";

export function CostCalculatorTool() {
  const searchParams = useSearchParams();
  const [country, setCountry] = useState<CountryCode | "other">("uk");
  const [otherCountryName, setOtherCountryName] = useState("");

  useEffect(() => {
    const prefill = searchParams.get("country");
    if (prefill && isCountryCode(prefill)) setCountry(prefill);
  }, [searchParams]);
  const [input, setInput] = useState<Omit<CostCalculatorInput, "country">>({
    courseType: "standard",
    cityTier: "standard",
    durationYears: 1,
    accommodationType: "private-shared",
    includeVisaFee: true,
    includeHealthCover: true,
    includeEnglishTest: false,
    includeFlight: true,
    includeSettlingIn: true,
  });

  const isOther = country === "other";
  const breakdown = useMemo(() => (isOther ? null : calculateCost({ ...input, country })), [input, country, isOther]);
  const destination = isOther ? null : destinations.find((d) => d.code === country)!;
  const perYearLocal = breakdown?.lineItems.reduce((sum, item) => sum + item.perYearLocal, 0) ?? 0;

  function update<K extends keyof typeof input>(key: K, value: (typeof input)[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const waMessage = isOther
    ? `Hi Baseline, I'd like a cost estimate for studying in ${otherCountryName || "a country that isn't listed on your website"}.`
    : `Hi Baseline, I used the Cost Calculator for ${destination!.name} (${input.durationYears}yr, ${input.courseType} programme). Estimated total: ${formatNaira(
        breakdown!.totalProgrammeNgn,
      )}. Can we talk about my budget?`;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="flex flex-col gap-4 rounded-2xl border border-ink-900/10 bg-offwhite p-6">
          <Field label="Country">
            <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value as CountryCode | "other")}>
              {destinations.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
              <option value="other">Another country</option>
            </select>
            {isOther && (
              <input
                type="text"
                value={otherCountryName}
                onChange={(e) => setOtherCountryName(e.target.value)}
                placeholder="Which country?"
                className={`${selectClass} mt-2`}
              />
            )}
          </Field>

          {!isOther && (
            <>
              <Field label="Course Type">
                <select className={selectClass} value={input.courseType} onChange={(e) => update("courseType", e.target.value as CostCalculatorInput["courseType"])}>
                  <option value="standard">Standard programme</option>
                  <option value="premium">Premium (medicine, MBA, etc.)</option>
                </select>
              </Field>

              <Field label="City Tier">
                <select className={selectClass} value={input.cityTier} onChange={(e) => update("cityTier", e.target.value as CostCalculatorInput["cityTier"])}>
                  <option value="standard">Standard city</option>
                  <option value="major-city">Major / capital city</option>
                </select>
              </Field>

              <Field label="Accommodation">
                <select
                  className={selectClass}
                  value={input.accommodationType}
                  onChange={(e) => update("accommodationType", e.target.value as CostCalculatorInput["accommodationType"])}
                >
                  <option value="university-halls">University halls</option>
                  <option value="private-shared">Private, shared</option>
                  <option value="private-solo">Private, solo</option>
                </select>
              </Field>

              <Field label={`Programme Duration, ${input.durationYears} year${input.durationYears > 1 ? "s" : ""}`}>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={input.durationYears}
                  onChange={(e) => update("durationYears", Number(e.target.value))}
                  className="w-full accent-gold-500"
                />
              </Field>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Include in estimate</p>
                <div className="flex flex-col gap-2">
                  {toggleFields.map((f) => (
                    <label key={f.key} className="flex items-center gap-2.5 text-sm text-ink-900">
                      <input
                        type="checkbox"
                        checked={Boolean(input[f.key])}
                        onChange={(e) => update(f.key, e.target.checked as (typeof input)[typeof f.key])}
                        className="h-4 w-4 accent-gold-500"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {isOther ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-ink-900/10 bg-white p-8 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              We don&apos;t publish estimates for every country, but we&apos;ll prepare an honest cost breakdown for
              yours.
            </p>
            <div className="mt-5">
              <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} magnetic>
                Ask on WhatsApp
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-900/10 bg-white p-6 sm:p-8">
            <DonutChart data={breakdown!.lineItems.map((i) => ({ label: i.label, value: i.totalNgn }))} total={breakdown!.totalProgrammeNgn} />

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-900/8 pt-6">
              <div>
                <p className="text-xs text-muted">Per year (est.)</p>
                <p className="font-display text-lg text-ink-900">{formatNaira(breakdown!.totalPerYearNgn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Per year in {breakdown!.currency} ≈ {formatCurrency(perYearLocal, breakdown!.currency)}</p>
                <p className="font-display text-lg text-ink-900">Full programme: {formatNaira(breakdown!.totalProgrammeNgn)}</p>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-xs text-muted">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-gold-500" />
              Estimates only. Actual costs vary by university and city. Use this as a planning starting point, not a
              quote.
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} magnetic>
                Send Estimate to WhatsApp
              </Button>
              <Button href="/book" variant="secondary">
                Book a Free Consultation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  );
}
