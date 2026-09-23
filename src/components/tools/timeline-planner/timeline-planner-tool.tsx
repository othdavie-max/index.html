"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarPlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "@/components/tools/lead-capture-form";
import { destinations } from "@/data/destinations";
import { getMilestones } from "@/data/timeline-milestones";
import { buildIcsFile, downloadIcsFile } from "@/lib/ics";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
import type { CountryCode, StudyLevel } from "@/types";

const selectClass = "w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500";

function nextIntakeDates() {
  const now = new Date();
  const options: { label: string; date: Date }[] = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({ label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), date: d });
  }
  return options;
}

export function TimelinePlannerTool() {
  const intakeOptions = useMemo(() => nextIntakeDates(), []);
  const [now] = useState(() => Date.now());
  const [country, setCountry] = useState<CountryCode | "other">("uk");
  const [otherCountryName, setOtherCountryName] = useState("");
  const [level, setLevel] = useState<StudyLevel>("masters");
  const [intakeIndex, setIntakeIndex] = useState(6);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  const isOther = country === "other";
  const intakeDate = intakeOptions[intakeIndex].date;
  const destination = isOther ? null : destinations.find((d) => d.code === country)!;
  const milestones = isOther ? [] : getMilestones(country, level);

  const timeline = milestones
    .map((m) => {
      const due = new Date(intakeDate);
      due.setDate(due.getDate() - m.offsetDays);
      return { ...m, dueDate: due, overdue: due.getTime() < now };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const daysToIntake = Math.round((intakeDate.getTime() - now) / 86_400_000);
  const isTight = daysToIntake < 90;

  function handleDownloadIcs() {
    if (!destination) return;
    trackEvent("timeline_ics_download");
    const ics = buildIcsFile(
      timeline.map((t) => ({ title: `Baseline: ${t.label}`, description: t.description, date: t.dueDate })),
    );
    downloadIcsFile(`baseline-timeline-${destination.slug}.ics`, ics);
  }

  const waMessage = destination
    ? `Hi Baseline, I planned my timeline for ${destination.name} (${level}, ${intakeOptions[intakeIndex].label} intake). ${
        isTight ? "My timeline looks tight. " : ""
      }Can we talk about next steps?`
    : `Hi Baseline, I'd like a study timeline for ${otherCountryName || "a country that isn't listed on your website"} (${level}, ${intakeOptions[intakeIndex].label} intake). Can you help?`;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-ink-900/10 bg-offwhite p-6 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Destination</label>
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
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Level</label>
          <select className={selectClass} value={level} onChange={(e) => setLevel(e.target.value as StudyLevel)}>
            <option value="foundation">Foundation Programme</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="masters">Master&apos;s Degree</option>
            <option value="phd">PhD</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Target Intake</label>
          <select className={selectClass} value={intakeIndex} onChange={(e) => setIntakeIndex(Number(e.target.value))}>
            {intakeOptions.map((opt, i) => (
              <option key={opt.label} value={i}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isOther ? (
        <div className="mt-10 rounded-2xl border border-gold-500/20 bg-gold-500/5 p-6 text-center">
          <p className="text-sm leading-relaxed text-ink-900">
            We don&apos;t publish generic timelines for every country, but we&apos;ll build you a real one, milestone
            by milestone, once we know where you&apos;re headed.
          </p>
          <div className="mt-4 flex justify-center">
            <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} magnetic>
              Ask on WhatsApp
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isTight && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/5 p-4 text-sm text-ink-900">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gold-500" />
              <p>
                You&apos;re on a tight schedule. Your intake is only {daysToIntake} days away. Some milestones below are
                already overdue. Let&apos;s talk about what&apos;s still realistic.
              </p>
            </div>
          )}

          <div className="relative mt-10 pl-8">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
              className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-0.5 bg-ink-900/10"
            />
            <div className="flex flex-col gap-8">
              {timeline.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="relative"
                >
                  <span
                    className={`absolute -left-8 top-1 h-4 w-4 rounded-full border-2 border-white ${t.overdue ? "bg-gold-500" : "bg-ink-900"}`}
                  />
                  <p className={`text-xs font-semibold uppercase tracking-wide ${t.overdue ? "text-gold-500" : "text-muted"}`}>
                    {t.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {t.overdue && " · Overdue"}
                  </p>
                  <p className="mt-1 font-display text-base text-ink-900">{t.label}</p>
                  <p className="mt-0.5 text-sm text-muted">{t.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={handleDownloadIcs} variant="secondary" icon={<CalendarPlus size={16} />}>
              Add to Calendar (.ics)
            </Button>
            <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} magnetic>
              Send to My WhatsApp
            </Button>
          </div>
        </>
      )}

      {!emailCaptured && (
        <div className="mt-10">
          {!showCapture ? (
            <button
              type="button"
              onClick={() => setShowCapture(true)}
              className="text-sm font-medium text-gold-500 underline-offset-4 hover:underline"
            >
              Email me this timeline too →
            </button>
          ) : (
            <div className="max-w-md">
              <LeadCaptureForm
                source="timeline-planner"
                payload={{ country, level, intake: intakeOptions[intakeIndex].label }}
                title="Get this timeline by email"
                description="We'll send this timeline to your inbox and WhatsApp."
                onSuccess={() => setEmailCaptured(true)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
