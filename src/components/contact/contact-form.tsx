"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations";

const fieldClass =
  "w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-colors focus:border-gold-500";
const errorClass = "mt-1 text-xs text-gold-500";

export function ContactForm() {
  const { push } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactFormSchema) });

  async function onSubmit(values: ContactFormValues) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      push("Message sent — we'll get back to you shortly.");
      reset();
    } catch {
      push("Something went wrong. Please try again or reach us on WhatsApp.", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Full Name</label>
          <input {...register("name")} className={fieldClass} placeholder="Your name" />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Phone / WhatsApp</label>
          <input {...register("phone")} className={fieldClass} placeholder="+234…" />
          {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Email</label>
        <input {...register("email")} type="email" className={fieldClass} placeholder="you@example.com" />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Subject</label>
        <input {...register("subject")} className={fieldClass} placeholder="What's this about?" />
        {errors.subject && <p className={errorClass}>{errors.subject.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Message</label>
        <textarea {...register("message")} rows={5} className={fieldClass} placeholder="Tell us a bit about what you need…" />
        {errors.message && <p className={errorClass}>{errors.message.message}</p>}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} icon={isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}>
        {isSubmitting ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
