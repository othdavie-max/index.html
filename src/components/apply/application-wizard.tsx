"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizProgress } from "@/components/tools/quiz-progress";
import { DocumentUploadField, type UploadedDoc } from "@/components/apply/document-upload-field";
import { destinations } from "@/data/destinations";
import { documentChecklists } from "@/data/document-checklists";
import { applicationFullSchema, type ApplicationFormValues } from "@/lib/validations";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

const DRAFT_KEY = "bes-application-draft";
const fieldClass = "w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none focus:border-gold-500";
const errorClass = "mt-1 text-xs text-gold-500";

const stepFieldGroups: (keyof ApplicationFormValues)[][] = [
  ["fullName", "email", "phone", "dateOfBirth", "nationality"],
  ["level", "destinationCountries", "courseOfInterest", "intake"],
  ["highestQualification", "institution", "gradeOrGpa", "graduationYear"],
  ["englishTest", "englishScore", "testDate"],
  [],
  ["consent"],
];

const stepTitles = ["Personal Details", "Study Plans", "Academic Background", "English Test", "Documents", "Review & Submit"];

export function ApplicationWizard() {
  const [step, setStep] = useState(0);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [documents, setDocuments] = useState<Record<string, UploadedDoc>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFullSchema),
    defaultValues: { destinationCountries: [] },
  });

  // Autosave draft to localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        Object.entries(draft).forEach(([key, value]) => setValue(key as keyof ApplicationFormValues, value as never));
      } catch {
        // ignore corrupt draft
      }
    }
  }, [setValue]);

  useEffect(() => {
    const subscription = watch((values) => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const level = watch("level");
  const checklist = useMemo(() => documentChecklists[level] ?? documentChecklists.masters, [level]);
  const documentsComplete = checklist.filter((d) => d.required).every((d) => documents[d.id]);

  async function goNext() {
    if (step === 4) {
      if (!documentsComplete) return;
      setStep((s) => s + 1);
      return;
    }
    const fields = stepFieldGroups[step];
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep((s) => Math.min(5, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function onSubmit(values: ApplicationFormValues) {
    setStatus("loading");
    setServerError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, documents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      trackEvent("application_submitted", { level: values.level });
      localStorage.removeItem(DRAFT_KEY);
      setReferenceId(data.referenceId);
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (referenceId) {
    const values = getValues();
    const waMessage = `Hi Baseline, I just submitted my application (Reference: ${referenceId}). I'm applying for ${values.level} in ${values.destinationCountries.join(
      ", ",
    )}. Can we talk about next steps?`;
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/10 text-gold-500">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-5 font-display text-2xl text-ink-900">Application submitted!</h2>
        <p className="mt-2 text-sm text-muted">
          Your reference number is <span className="font-semibold text-ink-900">{referenceId}</span>. We&apos;ve emailed a
          copy of your submission — our team will review your documents and reach out with next steps.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href={buildWhatsAppLink(waMessage)} target="_blank" rel="noopener noreferrer" icon={<MessageCircle size={16} />} magnetic>
            Follow Up on WhatsApp
          </Button>
          <Button href="/" variant="secondary">
            Back to Home
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <QuizProgress step={step} total={stepTitles.length} />
      <h2 className="mt-6 font-display text-xl text-ink-900 sm:text-2xl">{stepTitles[step]}</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="mt-6 flex flex-col gap-4"
          >
            {step === 0 && (
              <>
                <Field label="Full Name" error={errors.fullName?.message}>
                  <input {...register("fullName")} className={fieldClass} />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Email" error={errors.email?.message}>
                    <input {...register("email")} type="email" className={fieldClass} />
                  </Field>
                  <Field label="Phone / WhatsApp" error={errors.phone?.message}>
                    <input {...register("phone")} type="tel" className={fieldClass} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
                    <input {...register("dateOfBirth")} type="date" className={fieldClass} />
                  </Field>
                  <Field label="Nationality" error={errors.nationality?.message}>
                    <input {...register("nationality")} placeholder="e.g. Nigerian" className={fieldClass} />
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Study Level" error={errors.level?.message}>
                  <select {...register("level")} className={fieldClass}>
                    <option value="">Select level</option>
                    <option value="foundation">Foundation Programme</option>
                    <option value="undergraduate">Undergraduate</option>
                    <option value="masters">Master&apos;s Degree</option>
                    <option value="phd">PhD</option>
                  </select>
                </Field>
                <Field label="Preferred Countries (choose at least one)" error={errors.destinationCountries?.message}>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {destinations.map((d) => {
                      const selected = (watch("destinationCountries") ?? []).includes(d.code);
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => {
                            const current = getValues("destinationCountries") ?? [];
                            const next = selected ? current.filter((c) => c !== d.code) : [...current, d.code];
                            setValue("destinationCountries", next, { shouldValidate: true });
                          }}
                          className={`rounded-xl border p-3 text-center transition-all ${
                            selected ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white"
                          }`}
                        >
                          <span className="text-lg">{d.flag}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Course of Interest" error={errors.courseOfInterest?.message}>
                  <input {...register("courseOfInterest")} placeholder="e.g. MSc Data Science" className={fieldClass} />
                </Field>
                <Field label="Target Intake" error={errors.intake?.message}>
                  <input {...register("intake")} placeholder="e.g. September 2026" className={fieldClass} />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Highest Qualification" error={errors.highestQualification?.message}>
                  <input {...register("highestQualification")} placeholder="e.g. BSc Computer Science" className={fieldClass} />
                </Field>
                <Field label="Institution" error={errors.institution?.message}>
                  <input {...register("institution")} className={fieldClass} />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Grade / GPA" error={errors.gradeOrGpa?.message}>
                    <input {...register("gradeOrGpa")} placeholder="e.g. Second Class Upper" className={fieldClass} />
                  </Field>
                  <Field label="Graduation Year" error={errors.graduationYear?.message}>
                    <input {...register("graduationYear")} placeholder="e.g. 2024" className={fieldClass} />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="English Test" error={errors.englishTest?.message}>
                  <select {...register("englishTest")} className={fieldClass}>
                    <option value="">Select test</option>
                    <option value="ielts">IELTS</option>
                    <option value="toefl">TOEFL</option>
                    <option value="pte">PTE Academic</option>
                    <option value="duolingo">Duolingo English Test</option>
                    <option value="none">Not taken yet</option>
                  </select>
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Score (if available)">
                    <input {...register("englishScore")} placeholder="e.g. 7.0" className={fieldClass} />
                  </Field>
                  <Field label="Test Date (if available)">
                    <input {...register("testDate")} type="date" className={fieldClass} />
                  </Field>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-sm text-muted">
                  Required documents for <strong>{level || "your level"}</strong>. Accepted formats: PDF, JPG, PNG.
                </p>
                <div className="flex flex-col gap-3">
                  {checklist.map((req) => (
                    <DocumentUploadField
                      key={req.id}
                      requirement={req}
                      sessionId={sessionId}
                      value={documents[req.id]}
                      onChange={(doc) =>
                        setDocuments((prev) => {
                          const next = { ...prev };
                          if (doc) next[req.id] = doc;
                          else delete next[req.id];
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
                {!documentsComplete && <p className={errorClass}>Please upload all required documents before continuing.</p>}
              </>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-5">
                <ReviewSummary values={getValues()} documents={documents} />
                <label className="flex items-start gap-3 rounded-xl border border-ink-900/10 bg-offwhite p-4 text-sm text-ink-900">
                  <input type="checkbox" {...register("consent")} className="mt-0.5 h-4 w-4 accent-gold-500" />
                  <span>
                    I consent to Baseline Educational Services processing this information in line with the{" "}
                    <a href="/privacy-policy" className="text-gold-500 underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </a>
                    , including sharing relevant documents with universities as part of my application.
                  </span>
                </label>
                {errors.consent && <p className={errorClass}>{errors.consent.message}</p>}
                {serverError && <p className={errorClass}>{serverError}</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0} icon={<ArrowLeft size={16} />}>
            Back
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={goNext} icon={<ArrowRight size={16} />}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={status === "loading"} icon={status === "loading" ? <Loader2 size={16} className="animate-spin" /> : undefined}>
              {status === "loading" ? "Submitting…" : "Submit Application"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      {children}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

function ReviewSummary({ values, documents }: { values: ApplicationFormValues; documents: Record<string, UploadedDoc> }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-900/10 bg-offwhite p-5 text-sm">
      <SummaryRow label="Name" value={values.fullName} />
      <SummaryRow label="Email" value={values.email} />
      <SummaryRow label="Phone" value={values.phone} />
      <SummaryRow label="Level" value={values.level} />
      <SummaryRow label="Countries" value={(values.destinationCountries ?? []).join(", ")} />
      <SummaryRow label="Course" value={values.courseOfInterest} />
      <SummaryRow label="Intake" value={values.intake} />
      <SummaryRow label="English Test" value={values.englishTest} />
      <SummaryRow label="Documents" value={`${Object.keys(documents).length} uploaded`} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-900/8 pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink-900">{value || "—"}</span>
    </div>
  );
}
