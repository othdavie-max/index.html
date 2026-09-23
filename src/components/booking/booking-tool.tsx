"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon3D, type Icon3DName } from "@/components/ui/icon-3d";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ConfettiBurst } from "@/components/booking/confetti-burst";
import { destinations } from "@/data/destinations";
import { upcomingDates, generateDaySlots, consultationTypeLabels } from "@/lib/booking";
import { buildIcsFile, downloadIcsFile } from "@/lib/ics";
import { trackEvent } from "@/lib/analytics";
import { openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { BookingFormValues } from "@/lib/validations";

const fieldClass =
  "w-full min-h-[48px] rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500";
const typeIcons: Record<keyof typeof consultationTypeLabels, Icon3DName> = {
  "video-call": "video-camera",
  "phone-call": "telephone-receiver",
  "in-person": "office-building",
};
const typeShortLabels: Record<keyof typeof consultationTypeLabels, string> = {
  "video-call": "Video call",
  "phone-call": "Phone call",
  "in-person": "In-person",
};

const WAT_LABEL = "WAT";

const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Date & time" },
  { id: 3, label: "Your details" },
] as const;

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BookingTool() {
  const searchParams = useSearchParams();
  const dateStripRef = useRef<HTMLDivElement>(null);
  const dates = useMemo(() => upcomingDates(21), []);
  const allSlots = useMemo(() => generateDaySlots(), []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [consultationType, setConsultationType] = useState<BookingFormValues["consultationType"] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "+234 ", destination: "", level: "", message: "" });
  const [otherDestinationName, setOtherDestinationName] = useState("");
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = searchParams.get("destination") ?? searchParams.get("country");
    if (!prefill) return;
    const known = destinations.find((d) => d.name.toLowerCase() === prefill.toLowerCase());
    if (known) {
      setForm((f) => ({ ...f, destination: known.name }));
    } else {
      setForm((f) => ({ ...f, destination: "Another country" }));
      setOtherDestinationName(prefill);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    fetch(`/api/bookings?date=${toDateKey(selectedDate)}`)
      .then((res) => res.json())
      .then((data) => setBookedTimes(data.bookedTimes ?? []))
      .catch(() => setBookedTimes([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  function selectType(type: BookingFormValues["consultationType"]) {
    setConsultationType(type);
    setStep(2);
  }

  function scrollDates(dir: -1 | 1) {
    dateStripRef.current?.scrollBy({ left: dir * 216, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTime || !selectedDate || !consultationType) return;
    setStatus("loading");
    setError("");

    const payload: BookingFormValues = {
      ...form,
      destination: form.destination === "Another country" && otherDestinationName ? otherDestinationName : form.destination,
      consultationType,
      scheduledDate: toDateKey(selectedDate),
      scheduledTime: selectedTime,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      trackEvent("booking_completed", { consultationType });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function handleAddToCalendar() {
    if (!selectedTime || !selectedDate || !consultationType) return;
    const [h, m] = selectedTime.split(":").map(Number);
    const date = new Date(selectedDate);
    date.setHours(h, m, 0, 0);
    const ics = buildIcsFile([
      {
        title: "Baseline Educational Services, Free Consultation",
        description: `${consultationTypeLabels[consultationType]} with Baseline Educational Services.`,
        date,
      },
    ]);
    downloadIcsFile("baseline-consultation.ics", ics);
  }

  if (status === "done" && selectedDate && selectedTime && consultationType) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-md text-center">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
          <ConfettiBurst />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-white"
          >
            <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
              />
            </svg>
          </motion.div>
        </div>

        <h2 className="mt-5 font-display text-2xl text-ink-900">You&apos;re booked in!</h2>
        <p className="mt-2 text-sm text-muted">We&apos;ve sent a confirmation to {form.email}.</p>

        <div className="mt-6 rounded-2xl border border-ink-900/8 bg-offwhite p-5 text-left">
          <SummaryRow label="Type" value={typeShortLabels[consultationType]} />
          <SummaryRow
            label="When"
            value={`${selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${selectedTime} ${WAT_LABEL}`}
          />
          <SummaryRow label="Name" value={form.name} last />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={handleAddToCalendar} variant="secondary" icon={<CalendarPlus size={16} />}>
            Add to Calendar
          </Button>
          <Button
            onClick={() =>
              openWhatsApp(`Hi Baseline, I just booked a consultation for ${toDateKey(selectedDate)} at ${selectedTime}.`, "booking-success")
            }
            icon={<WhatsAppIcon size={16} />}
          >
            Chat with Us on WhatsApp
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center">
          {STEPS.map((s, i) => {
            const isComplete = step > s.id;
            const isActive = step === s.id;
            const canJump = isComplete;
            return (
              <div key={s.id} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => canJump && setStep(s.id)}
                  className="flex items-center gap-2.5"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                      isActive || isComplete ? "border-gold-500 bg-gold-500 text-white" : "border-ink-900/15 text-ink-900/40",
                    )}
                  >
                    {s.id}
                  </span>
                  <span className={cn("hidden text-sm font-semibold sm:block", isActive ? "text-ink-900" : "text-ink-900/40")}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <span className={cn("mx-3 h-px flex-1", isComplete ? "bg-gold-500" : "bg-ink-900/10")} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">How would you like to talk?</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(Object.keys(consultationTypeLabels) as (keyof typeof consultationTypeLabels)[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => selectType(type)}
                    className="flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-ink-900/10 p-5 text-center text-sm font-medium text-ink-900 transition-all hover:-translate-y-0.5 hover:border-gold-500/50 hover:shadow-hover"
                  >
                    <Icon3D name={typeIcons[type]} size={32} alt="" />
                    {consultationTypeLabels[type]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Choose a Date</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => scrollDates(-1)} aria-label="Earlier dates" className="rounded-full border border-ink-900/10 p-1.5 text-ink-900 hover:bg-ink-100">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={() => scrollDates(1)} aria-label="Later dates" className="rounded-full border border-ink-900/10 p-1.5 text-ink-900 hover:bg-ink-100">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div ref={dateStripRef} className="no-scrollbar mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                {dates.map(({ date, bookable }) => {
                  const isSelected = selectedDate ? toDateKey(date) === toDateKey(selectedDate) : false;
                  return (
                    <button
                      key={toDateKey(date)}
                      type="button"
                      disabled={!bookable}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "flex min-w-[64px] shrink-0 snap-start flex-col items-center rounded-xl border px-3.5 py-2.5 text-xs transition-all",
                        !bookable
                          ? "cursor-not-allowed border-ink-900/5 text-muted/40"
                          : isSelected
                            ? "border-gold-500 bg-gold-500 text-white"
                            : "border-ink-900/10 text-ink-900 hover:border-gold-500/40",
                      )}
                    >
                      <span className="font-semibold">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                      <span>{date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      {!bookable && <span className="mt-0.5 text-[10px]">Closed</span>}
                    </button>
                  );
                })}
              </div>

              <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
                Choose a Time ({WAT_LABEL})
              </p>
              {!selectedDate ? (
                <p className="text-sm text-muted">Pick a date first.</p>
              ) : loadingSlots ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 size={14} className="animate-spin" /> Loading available times…
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {allSlots.map((slot) => {
                    const taken = bookedTimes.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={taken}
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          "min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                          taken
                            ? "cursor-not-allowed border-ink-900/5 bg-ink-900/5 text-muted/50 line-through"
                            : selectedTime === slot
                              ? "border-gold-500 bg-gold-500 text-white"
                              : "border-ink-900/10 text-ink-900 hover:border-gold-500/40",
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.form
              key="step3"
              onSubmit={onSubmit}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-offwhite p-6"
            >
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={fieldClass}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={fieldClass}
              />
              <div>
                <input
                  required
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={fieldClass}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={whatsappSame}
                    onChange={(e) => setWhatsappSame(e.target.checked)}
                    className="h-4 w-4 accent-gold-500"
                  />
                  This is also my WhatsApp number
                </label>
                {!whatsappSame && (
                  <p className="mt-1 text-xs text-muted">No problem, we&apos;ll ask for your WhatsApp number when we reach out.</p>
                )}
              </div>
              <select
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                className={fieldClass}
              >
                <option value="">Destination of interest (optional)</option>
                {destinations.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.name}
                  </option>
                ))}
                <option value="Another country">Another country</option>
                <option value="Not sure yet">Not sure yet</option>
              </select>
              {form.destination === "Another country" && (
                <input
                  type="text"
                  value={otherDestinationName}
                  onChange={(e) => setOtherDestinationName(e.target.value)}
                  placeholder="Which country? (optional)"
                  className={fieldClass}
                />
              )}
              <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} className={fieldClass}>
                <option value="">Level of interest (optional)</option>
                <option value="foundation">Foundation Programme</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="masters">Master&apos;s Degree</option>
                <option value="phd">PhD</option>
              </select>
              <textarea
                placeholder="Anything you'd like us to know? (optional)"
                rows={3}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className={fieldClass}
              />

              {error && <p className="text-xs text-danger-500">{error}</p>}

              <div className="mt-1 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" size="lg" disabled={status === "loading"} className="flex-1 justify-center">
                  {status === "loading" ? "Booking…" : "Confirm Booking"}
                </Button>
              </div>
              <p className="text-center text-[11px] text-muted">
                By booking, you agree to our{" "}
                <a href="/privacy-policy" className="underline">
                  Privacy Policy
                </a>
                .
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky summary card */}
      <div className="hidden lg:col-span-2 lg:block">
        <div className="sticky top-28 rounded-2xl border border-ink-900/10 bg-ink-950 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500">Your Booking</p>
          <div className="mt-4 flex flex-col gap-4">
            <SummaryLine label="Type" value={consultationType ? typeShortLabels[consultationType] : undefined} onEdit={() => setStep(1)} showEdit={step > 1} />
            <SummaryLine
              label="Date & time"
              value={selectedDate && selectedTime ? `${selectedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${selectedTime}` : undefined}
              onEdit={() => setStep(2)}
              showEdit={step > 2}
            />
          </div>
          <p className="mt-6 text-xs text-white/50">Free, no-pressure consultation. We&apos;ll confirm by email right after you book.</p>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  onEdit,
  showEdit,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
  showEdit: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 last:border-0 last:pb-0">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
        <p className="mt-1 text-sm font-medium text-white">{value ?? "Not selected yet"}</p>
      </div>
      {showEdit && (
        <button type="button" onClick={onEdit} className="shrink-0 text-xs font-medium text-gold-500 hover:underline">
          Edit
        </button>
      )}
    </div>
  );
}

function SummaryRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-2.5", !last && "border-b border-ink-900/8")}>
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink-900">{value}</span>
    </div>
  );
}
