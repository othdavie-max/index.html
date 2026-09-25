"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Globe2, Info, MessageCircle, Pencil, PiggyBank, Printer, ShieldAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { DonutChart } from "@/components/tools/donut-chart";
import type { CostSettings } from "@/components/tools/cost-calculator/cost-calculator-tool";
import { DATA_REVIEWED, countriesAlphabetical, getStudyCountry, type StudyCountry } from "@/data/study-countries";
import { RATES_UPDATED, exchangeRates } from "@/data/exchange-rates";
import { LEVEL_LABELS, calculateStudyCost, defaultYears, type CostInput } from "@/lib/study-costs";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn, formatCurrency, formatNaira } from "@/lib/utils";

const TIER_LABEL = { budget: "lower-cost university", mid: "mid-range university", top: "top-ranked university" };
const ACCOM_LABEL = { halls: "university halls", shared: "shared flat", solo: "own flat", family: "living with family" };

function toInput(country: StudyCountry, s: CostSettings, rateAdjustment = 1, sameYears = true): CostInput {
  return { ...s, country, years: (sameYears ? s.years : null) ?? defaultYears(country, s.level), rateAdjustment };
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-5", highlight ? "bg-ink-900 text-white" : "border border-ink-900/10 bg-white")}>
      <p className={cn("text-xs", highlight ? "text-white/60" : "text-muted")}>{label}</p>
      <p className={cn("mt-1 font-display text-2xl tabular-nums", highlight ? "text-white" : "text-ink-900")}>{value}</p>
      {sub && <p className={cn("mt-1 text-xs", highlight ? "text-white/60" : "text-muted")}>{sub}</p>}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-900/10 bg-white p-5 sm:p-7">
      <h3 className="flex items-center gap-2 font-display text-lg text-ink-900">
        {icon}
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CostResults({
  country,
  otherName,
  settings,
  onChange,
  onEdit,
}: {
  country: StudyCountry;
  otherName: string;
  settings: CostSettings;
  onChange: (s: CostSettings) => void;
  onEdit: (step: number) => void;
}) {
  const [weakerPct, setWeakerPct] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const cur = country.currency;
  const years = settings.years ?? defaultYears(country, settings.level);
  const b = useMemo(() => calculateStudyCost(toInput(country, settings)), [country, settings]);
  const stressed = useMemo(() => calculateStudyCost(toInput(country, settings, 1 + weakerPct / 100)), [country, settings, weakerPct]);
  const place = country.generic ? `${otherName.trim() || country.name} (regional estimate)` : country.name;

  const donutData = [
    ...b.yearly.map((l) => ({ label: l.label, value: l.ngn })),
    { label: "One-off costs", value: b.oneOff.reduce((s, l) => s + l.ngn, 0) },
  ].filter((d) => d.value > 0);

  const savings = useMemo(() => {
    const alt = (patch: Partial<CostSettings>, label: string) => {
      const total = calculateStudyCost(toInput(country, { ...settings, ...patch })).totalNgn;
      return { label, saving: b.totalNgn - total };
    };
    const list = [];
    if (settings.tier !== "budget") list.push(alt({ tier: "budget" }, "Choose a lower-cost university"));
    if (settings.bigCity) list.push(alt({ bigCity: false }, `Study outside ${country.bigCities}`));
    if (settings.accommodation === "solo") list.push(alt({ accommodation: "shared" }, "Share a flat instead of living alone"));
    if (settings.accommodation === "shared") list.push(alt({ accommodation: "halls" }, "Live in university halls"));
    if (settings.lifestyle === "comfortable") list.push(alt({ lifestyle: "moderate" }, "Keep a moderate lifestyle"));
    if (settings.scholarshipPct < 25) list.push(alt({ scholarshipPct: 25 }, "Win a 25% tuition scholarship"));
    return list.filter((s) => s.saving > 0).sort((x, y) => y.saving - x.saving);
  }, [b.totalNgn, country, settings]);

  const comparisons = compareIds
    .map((id) => getStudyCountry(id))
    .filter((c): c is StudyCountry => !!c)
    .map((c) => ({ country: c, years: defaultYears(c, settings.level), result: calculateStudyCost(toInput(c, settings, 1, false)) }));
  const compareRows = [{ country, years, result: b }, ...comparisons];
  const maxTotal = Math.max(...compareRows.map((r) => r.result.totalNgn));

  const summary = `${LEVEL_LABELS[settings.level]}, ${years} yr, ${TIER_LABEL[settings.tier]}, ${ACCOM_LABEL[settings.accommodation]}${
    settings.bigCity ? `, ${country.bigCities}` : ""
  }${settings.scholarshipPct ? `, ${settings.scholarshipPct}% scholarship` : ""}`;
  const waMessage = `Hi Baseline, I used your Cost Calculator for ${place}: ${summary}. Estimated total ${formatNaira(b.totalNgn)} (${formatNaira(
    b.firstYearNgn,
  )} in year one). Can we talk about my budget and funding?`;

  const maxYear = Math.max(...b.years.map((y) => y.ngn));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">Your estimate</p>
          <h2 className="mt-2 flex items-center gap-3 font-display text-2xl text-ink-900 sm:text-3xl">
            {country.generic ? <Globe2 size={30} className="text-gold-500" /> : <Flag code={country.flagCode} size={32} alt="" />}
            {place}
          </h2>
          <p className="mt-2 text-sm text-muted">{summary}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={() => onEdit(0)} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gold-500 hover:underline">
            <Pencil size={14} /> Edit answers
          </button>
        </div>
      </div>

      {country.generic && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold-500/25 bg-gold-500/5 p-4 text-sm text-ink-900">
          <Info size={16} className="mt-0.5 shrink-0 text-gold-500" />
          This uses typical costs across {country.region}. Send it to us on WhatsApp and a counsellor will replace it with real figures for{" "}
          {otherName.trim() || "your country"}.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat highlight label={`Total for ${years} year${years === 1 ? "" : "s"}`} value={formatNaira(b.totalNgn)} sub={`≈ ${formatCurrency(b.totalLocal, cur)} + naira costs`} />
        <Stat label="Year one (incl. one-off costs)" value={formatNaira(b.firstYearNgn)} />
        <Stat label="Average per year" value={formatNaira(b.averageYearNgn)} />
        <Stat label="Living costs per month" value={formatCurrency(b.monthlyLivingLocal, cur)} sub={`≈ ${formatNaira(b.monthlyLivingNgn)}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <Card title="Where the money goes">
          <DonutChart data={donutData} total={b.totalNgn} />
        </Card>

        <Card title="Full breakdown">
          <div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 text-xs text-muted">
                  <th className="py-2 font-medium">Item</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Year one ({cur})</th>
                  <th className="py-2 pl-3 text-right font-medium">Whole programme (₦)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-gold-500">
                    Every year
                  </td>
                </tr>
                {b.yearly.map((l) => (
                  <tr key={l.id} className="border-b border-ink-900/5">
                    <td className="py-2.5">
                      <span className="text-ink-900">{l.label}</span>
                      {l.note && <span className="block text-xs text-muted">{l.note}</span>}
                      <span className="block text-xs text-muted sm:hidden">Year one: {formatCurrency(l.firstYearLocal, cur)}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted sm:table-cell">{formatCurrency(l.firstYearLocal, cur)}</td>
                    <td className="py-2.5 pl-3 text-right align-top font-medium tabular-nums text-ink-900">{formatNaira(l.ngn)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-gold-500">
                    One-off
                  </td>
                </tr>
                {b.oneOff.map((l) => (
                  <tr key={l.id} className="border-b border-ink-900/5">
                    <td className="py-2.5">
                      <span className="text-ink-900">{l.label}</span>
                      {l.note && <span className="block text-xs text-muted">{l.note}</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted sm:table-cell">{l.firstYearLocal ? formatCurrency(l.firstYearLocal, cur) : "—"}</td>
                    <td className="py-2.5 pl-3 text-right align-top font-medium tabular-nums text-ink-900">{formatNaira(l.ngn)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-4 font-semibold text-ink-900">Total</td>
                  <td className="hidden sm:table-cell" />
                  <td className="pl-3 pt-4 text-right font-display text-lg tabular-nums text-ink-900">{formatNaira(b.totalNgn)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted">Years 2 onwards include a 3% yearly rise in fees and living costs.</p>
        </Card>

        {b.years.length > 1 && (
          <Card title="Year by year">
            <div className="flex flex-col gap-3">
              {b.years.map((y) => (
                <div key={y.year} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-muted">Year {y.year}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/8">
                    <div className="h-full rounded-full bg-ink-900" style={{ width: `${(y.ngn / maxYear) * 100}%` }} />
                  </div>
                  <span className="font-medium tabular-nums text-ink-900">{formatNaira(y.ngn)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title="Money you'll need before your visa" icon={<Wallet size={18} className="text-gold-500" />}>
          <ul className="flex flex-col divide-y divide-ink-900/5">
            {b.beforeVisaLines.map((l) => (
              <li key={l.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="text-ink-900">{l.label}</span>
                <span className="shrink-0 font-medium tabular-nums text-ink-900">{formatNaira(l.ngn)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-offwhite px-4 py-3">
            <span className="text-sm font-semibold text-ink-900">Roughly available before you apply</span>
            <span className="font-display text-lg tabular-nums text-ink-900">{formatNaira(b.beforeVisaNgn)}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            <strong className="text-ink-900">{country.visa.name}:</strong> {country.visa.funds}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{country.tuitionNote}</p>
        </Card>

        <Card title="What if the naira weakens?" icon={<ShieldAlert size={18} className="text-gold-500" />}>
          <label htmlFor="naira-slider" className="text-sm text-muted">
            Naira {weakerPct === 0 ? "at today's rate" : `${weakerPct}% weaker`}: 1 {cur} ≈ {formatNaira((exchangeRates[cur] ?? exchangeRates.USD) * (1 + weakerPct / 100))}
          </label>
          <input
            id="naira-slider"
            type="range"
            min={0}
            max={50}
            step={5}
            value={weakerPct}
            onChange={(e) => setWeakerPct(Number(e.target.value))}
            className="mt-3 w-full accent-gold-500"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Today</span>
            <span>50% weaker</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-offwhite p-4">
              <p className="text-xs text-muted">Total at this rate</p>
              <p className="mt-1 font-display text-xl tabular-nums text-ink-900">{formatNaira(stressed.totalNgn)}</p>
            </div>
            <div className="rounded-xl bg-offwhite p-4">
              <p className="text-xs text-muted">Extra you&apos;d need</p>
              <p className="mt-1 font-display text-xl tabular-nums text-gold-600">+{formatNaira(stressed.totalNgn - b.totalNgn)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Fees are charged in {cur}, so a weaker naira raises your cost. Many families plan with a 20–30% buffer.
          </p>
        </Card>

        {savings.length > 0 && (
          <Card title="Ways to bring the cost down" icon={<PiggyBank size={18} className="text-gold-500" />}>
            <ul className="flex flex-col gap-2">
              {savings.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-4 rounded-xl border border-ink-900/8 px-4 py-3 text-sm">
                  <span className="text-ink-900">{s.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-gold-600">save ≈ {formatNaira(s.saving)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">{country.scholarshipNote}</p>
          </Card>
        )}

        <Card title="Compare with other countries">
          <p className="text-sm text-muted">Same study level and choices, each country&apos;s usual programme length.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row print:hidden">
            {[0, 1].map((slot) => (
              <select
                key={slot}
                value={compareIds[slot] ?? ""}
                onChange={(e) => {
                  const next = [...compareIds];
                  next[slot] = e.target.value;
                  setCompareIds(next.filter(Boolean));
                }}
                aria-label={`Country to compare ${slot + 1}`}
                className="min-h-[48px] flex-1 rounded-xl border border-ink-900/12 bg-white px-3 text-sm text-ink-900 outline-none focus:border-gold-500"
              >
                <option value="">Compare with…</option>
                {countriesAlphabetical
                  .filter((c) => c.id !== country.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-4">
            {compareRows.map((r) => (
              <div key={r.country.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink-900">
                    {r.country.generic ? <Globe2 size={18} className="text-gold-500" /> : <Flag code={r.country.flagCode} size={20} alt="" />}
                    {r.country.generic ? place : r.country.name}
                    <span className="text-xs font-normal text-muted">
                      {r.years} yr
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-ink-900">{formatNaira(r.result.totalNgn)}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-900/8">
                  <div
                    className={cn("h-full rounded-full", r.country.id === country.id ? "bg-gold-500" : "bg-ink-700")}
                    style={{ width: `${(r.result.totalNgn / maxTotal) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  Year one {formatNaira(r.result.firstYearNgn)} · living {formatCurrency(r.result.monthlyLivingLocal, r.country.currency)}/month
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
        <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} className="justify-center">
          Send this estimate on WhatsApp
        </Button>
        <Button href="/book" variant="secondary" className="justify-center">
          Book a free consultation
        </Button>
        {!country.generic && (
          <Button href={`/tools/timeline-planner?country=${country.id}&level=${settings.level}`} variant="ghost" icon={<CalendarClock size={16} />} className="justify-center">
            Plan my timeline
          </Button>
        )}
        <Button onClick={() => window.print()} variant="ghost" icon={<Printer size={16} />} className="justify-center">
          Print / save as PDF
        </Button>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-ink-900/10 bg-offwhite p-4 text-xs leading-relaxed text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-ink-900/40" />
        <p>
          Estimates only, for planning. Costs data reviewed {DATA_REVIEWED}; exchange rates from {RATES_UPDATED} (slightly above the official rate). Actual
          fees depend on your university, course and city. {country.healthNote} Always confirm current figures before paying anything.
        </p>
      </div>

      <div className="mt-4 text-center print:hidden">
        <button
          type="button"
          onClick={() => onChange({ ...settings, tier: "mid", bigCity: false, accommodation: "shared", lifestyle: "moderate", scholarshipPct: 0 })}
          className="inline-flex min-h-[44px] items-center text-xs text-muted hover:text-ink-900"
        >
          Reset to typical choices
        </button>
      </div>
    </div>
  );
}
