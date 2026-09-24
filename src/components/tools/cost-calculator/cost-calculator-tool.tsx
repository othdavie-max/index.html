"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MessageCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { QuizProgress } from "@/components/tools/quiz-progress";
import { ChoiceGrid } from "@/components/tools/choice-grid";
import { DonutChart } from "@/components/tools/donut-chart";
import { destinations } from "@/data/destinations";
import { calculateCost, type CostCalculatorInput } from "@/lib/cost-calculator";
import { formatNaira, formatCurrency } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
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

const STEPS = ["country", "courseType", "cityTier", "accommodation", "duration", "extras"] as const;

export function CostCalculatorTool() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
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

  function next() {
    if (isOther || step === STEPS.length - 1) {
      trackEvent("cost_calculator_completed");
      setShowResults(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    if (showResults) {
      setShowResults(false);
      return;
    }
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  if (!showResults) {
    return (
      <div className="mx-auto max-w-xl">
        <QuizProgress step={step} total={STEPS.length} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-8"
          >
            {STEPS[step] === "country" && (
              <>
                <h2 className="font-display text-xl text-ink-900 sm:text-2xl">Where do you want to study?</h2>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {destinations.map((d) => (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() => setCountry(d.code)}
                      className={`min-h-[64px] rounded-xl border p-4 text-center transition-all duration-200 ${
                        country === d.code ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white hover:border-ink-900/30"
                      }`}
                    >
                      <Flag code={d.flagCode} size={26} alt="" />
                      <p className="mt-1 text-xs font-medium text-ink-900">{d.name}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCountry("other")}
                    className={`min-h-[64px] rounded-xl border p-4 text-center transition-all duration-200 ${
                      isOther ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white hover:border-ink-900/30"
                    }`}
                  >
                    <p className="text-xs font-medium text-ink-900">Another country</p>
                  </button>
                </div>
                {isOther && (
                  <input
                    type="text"
                    value={otherCountryName}
                    onChange={(e) => setOtherCountryName(e.target.value)}
                    placeholder="Which country?"
                    className="mt-4 w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500"
                  />
                )}
              </>
            )}

            {STEPS[step] === "courseType" && (
              <>
                <h2 className="font-display text-xl text-ink-900 sm:text-2xl">What type of programme?</h2>
                <div className="mt-6">
                  <ChoiceGrid
                    value={input.courseType}
                    onChange={(v) => update("courseType", v)}
                    columns={1}
                    options={[
                      { value: "standard", label: "Standard programme" },
                      { value: "premium", label: "Premium", description: "Medicine, MBA, and similar high-cost programmes" },
                    ]}
                  />
                </div>
              </>
            )}

            {STEPS[step] === "cityTier" && (
              <>
                <h2 className="font-display text-xl text-ink-900 sm:text-2xl">Which kind of city?</h2>
                <div className="mt-6">
                  <ChoiceGrid
                    value={input.cityTier}
                    onChange={(v) => update("cityTier", v)}
                    columns={1}
                    options={[
                      { value: "standard", label: "Standard city" },
                      { value: "major-city", label: "Major / capital city", description: "Higher living costs, e.g. London, Toronto" },
                    ]}
                  />
                </div>
              </>
            )}

            {STEPS[step] === "accommodation" && (
              <>
                <h2 className="font-display text-xl text-ink-900 sm:text-2xl">Where will you live?</h2>
                <div className="mt-6">
                  <ChoiceGrid
                    value={input.accommodationType}
                    onChange={(v) => update("accommodationType", v)}
                    columns={1}
                    options={[
                      { value: "university-halls", label: "University halls" },
                      { value: "private-shared", label: "Private, shared" },
                      { value: "private-solo", label: "Private, solo" },
                    ]}
                  />
                </div>
              </>
            )}

            {STEPS[step] === "duration" && (
              <>
                <h2 className="font-display text-xl text-ink-900 sm:text-2xl">
                  How long is your programme? <span className="text-gold-500">{input.durationYears} year{input.durationYears > 1 ? "s" : ""}</span>
                </h2>
                <div className="mt-8 px-2">
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={input.durationYears}
                    onChange={(e) => update("durationYears", Number(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted">
                    <span>1 year</span>
                    <span>4 years</span>
                  </div>
                </div>
              </>
            )}

            {STEPS[step] === "extras" && (
              <>
                <h2 className="font-display text-xl text-ink-900 sm:text-2xl">What should we include in the estimate?</h2>
                <div className="mt-6 flex flex-col gap-2">
                  {toggleFields.map((f) => (
                    <label
                      key={f.key}
                      className="flex min-h-[48px] items-center gap-3 rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-sm text-ink-900"
                    >
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
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0} icon={<ArrowLeft size={16} />}>
            Back
          </Button>
          <Button onClick={next} icon={<ArrowRight size={16} />}>
            {isOther || step === STEPS.length - 1 ? "See My Estimate" : "Next"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <button type="button" onClick={back} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink-900">
        <ArrowLeft size={14} /> Edit my answers
      </button>

      {isOther ? (
        <div className="flex flex-col items-center rounded-2xl border border-ink-900/10 bg-white p-8 text-center">
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
            <Button href="/book" magnetic>
              Book a Free Consultation
            </Button>
            <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" variant="secondary" icon={<MessageCircle size={16} />} magnetic>
              Send Estimate to WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
