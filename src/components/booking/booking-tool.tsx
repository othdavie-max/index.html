"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, CheckCircle2, Loader2, Video, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { destinations } from "@/data/destinations";
import { nextBookableDates, generateDaySlots, consultationTypeLabels } from "@/lib/booking";
import { siteSettings } from "@/data/site-settings";
import { buildIcsFile, downloadIcsFile } from "@/lib/ics";
import { trackEvent } from "@/lib/analytics";
import { openWhatsApp } from "@/lib/whatsapp";
import type { BookingFormValues } from "@/lib/validations";

const fieldClass = "w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500";
const typeIcons = { "video-call": Video, "phone-call": Phone, "in-person": MapPin } as const;

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BookingTool() {
  const dates = useMemo(() => nextBookableDates(14), []);
  const allSlots = useMemo(() => generateDaySlots(), []);

  const [consultationType, setConsultationType] = useState<BookingFormValues["consultationType"]>("video-call");
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "", destination: "", level: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingSlots(true);
    setSelectedTime(null);
    fetch(`/api/bookings?date=${toDateKey(selectedDate)}`)
      .then((res) => res.json())
      .then((data) => setBookedTimes(data.bookedTimes ?? []))
      .catch(() => setBookedTimes([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTime) return;
    setStatus("loading");
    setError("");

    const payload: BookingFormValues = {
      ...form,
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
    if (!selectedTime) return;
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

  if (status === "done") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10 text-gold-500">
          <CheckCircle2 size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl text-ink-900">You&apos;re booked in!</h2>
        <p className="mt-2 text-sm text-muted">
          We&apos;ve sent a confirmation to {form.email}. See you{" "}
          {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {selectedTime}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={handleAddToCalendar} variant="secondary" icon={<CalendarPlus size={16} />}>
            Add to Calendar
          </Button>
          <Button
            onClick={() =>
              openWhatsApp(`Hi Baseline, I just booked a consultation for ${toDateKey(selectedDate)} at ${selectedTime}.`, "booking-success")
            }
          >
            Message Us on WhatsApp
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Consultation Type</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(consultationTypeLabels) as (keyof typeof consultationTypeLabels)[]).map((type) => {
            const Icon = typeIcons[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setConsultationType(type)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-all ${
                  consultationType === type ? "border-gold-500 bg-gold-500/5 text-gold-600 ring-1 ring-gold-500" : "border-ink-900/10 text-ink-900"
                }`}
              >
                <Icon size={16} />
                {consultationTypeLabels[type]}
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Choose a Date</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {dates.map((d) => (
            <button
              key={toDateKey(d)}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2.5 text-xs transition-all ${
                toDateKey(d) === toDateKey(selectedDate) ? "border-gold-500 bg-gold-500 text-white" : "border-ink-900/10 text-ink-900"
              }`}
            >
              <span className="font-semibold">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span>{d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Choose a Time ({siteSettings.bookingHours.timezone})</p>
        {loadingSlots ? (
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
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    taken
                      ? "cursor-not-allowed border-ink-900/5 bg-ink-900/5 text-muted/50 line-through"
                      : selectedTime === slot
                        ? "border-gold-500 bg-gold-500 text-white"
                        : "border-ink-900/10 text-ink-900 hover:border-gold-500/40"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-offwhite p-6">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={fieldClass} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={fieldClass} />
          <input required type="tel" placeholder="Phone / WhatsApp" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={fieldClass} />
          <select value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} className={fieldClass}>
            <option value="">Destination of interest (optional)</option>
            {destinations.map((d) => (
              <option key={d.code} value={d.name}>
                {d.flag} {d.name}
              </option>
            ))}
          </select>
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

          <Button type="submit" size="lg" disabled={!selectedTime || status === "loading"} className="mt-1 justify-center">
            {status === "loading" ? "Booking…" : "Confirm Booking"}
          </Button>
          <p className="text-center text-[11px] text-muted">
            By booking, you agree to our{" "}
            <a href="/privacy-policy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </form>
  );
}
