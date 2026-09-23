"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "@/components/tools/lead-capture-form";
import { Flag } from "@/components/ui/flag";
import { getDestination } from "@/data/destinations";
import type { MatcherResult, MatcherAnswers } from "@/data/matcher-rules";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

export function MatcherResults({ results, answers }: { results: MatcherResult[]; answers: MatcherAnswers }) {
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const top = results[0];
  const topDestination = getDestination(top.code)!;

  const waMessage = `Hi Baseline, I just took the Course Matcher quiz. My top match was ${topDestination.name} (${top.score}%). I'm interested in ${answers.fieldOfInterest} at ${answers.level} level, targeting the ${answers.intake} intake. Can we talk?`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">Your Top Match</p>
        <h2 className="mt-2 flex items-center justify-center gap-2 font-display text-3xl text-ink-900">
          <Flag code={topDestination.flagCode} size={28} alt={`${topDestination.name} flag`} /> {topDestination.name}
        </h2>
        <p className="mt-1 text-muted">{top.score}% match based on your answers</p>
      </div>

      <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-ink-900/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${top.score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gold-500"
        />
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {top.reasons.map((r) => (
          <li key={r} className="text-sm text-muted">
            · {r}
          </li>
        ))}
      </ul>

      {!unlocked ? (
        <div className="mt-8">
          <LeadCaptureForm
            source="course-matcher"
            payload={{ answers, results }}
            title="See your full ranked results"
            description="Unlock your full personalised breakdown, and we'll also flag your top matches on WhatsApp."
            onSuccess={(v) => {
              setName(v.name);
              setUnlocked(true);
              trackEvent("course_matcher_lead_captured");
            }}
          />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <p className="text-center text-sm text-muted">Thanks{name ? `, ${name}` : ""}, here&apos;s your full ranking:</p>
          <div className="mt-4 flex flex-col gap-3">
            {results.map((r, i) => {
              const d = getDestination(r.code)!;
              return (
                <div key={r.code} className="flex items-center gap-4 rounded-xl border border-ink-900/8 bg-offwhite p-4">
                  <span className="font-display text-lg text-ink-900/30">#{i + 1}</span>
                  <Flag code={d.flagCode} size={28} alt={`${d.name} flag`} />
                  <div className="flex-1">
                    <p className="font-medium text-ink-900">{d.name}</p>
                    <p className="text-xs text-muted">{d.topCourses.slice(0, 3).join(", ")}</p>
                  </div>
                  <span className="font-display text-lg text-gold-500">{r.score}%</span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} magnetic>
              Talk to a Counsellor on WhatsApp
            </Button>
            <Button href="/book" variant="secondary">
              Book a Free Consultation
            </Button>
          </div>

          <div className="mt-6 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-center">
            <p className="text-sm text-ink-900">
              Thinking about a country that isn&apos;t here? Our counsellors can help with any destination.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button
                href={buildWhatsAppLink("Hi Baseline, I took the Course Matcher quiz but I'm interested in a country that wasn't listed. Can you help?")}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="sm"
                icon={<MessageCircle size={14} />}
              >
                Ask on WhatsApp
              </Button>
              <Button href="/destinations/other" variant="ghost" size="sm">
                Explore other destinations
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink-900"
        >
          <RotateCcw size={12} /> Retake the quiz
        </button>
      </div>
    </div>
  );
}
