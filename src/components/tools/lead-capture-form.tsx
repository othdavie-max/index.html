"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeadSource } from "@/types";

export function LeadCaptureForm({
  source,
  payload,
  title = "See your full results",
  description = "Enter your details to unlock your personalised breakdown. We'll also send it to your WhatsApp.",
  onSuccess,
}: {
  source: LeadSource;
  payload?: Record<string, unknown>;
  title?: string;
  description?: string;
  onSuccess: (values: { name: string; email: string; phone: string }) => void;
}) {
  const [values, setValues] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source, payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      onSuccess(values);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white p-6 sm:p-8">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
        <Lock size={18} />
      </div>
      <h3 className="mt-4 text-center font-display text-lg text-ink-900">{title}</h3>
      <p className="mt-1.5 text-center text-sm text-muted">{description}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          required
          placeholder="Full name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className="rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm outline-none focus:border-gold-500"
        />
        <input
          required
          type="email"
          placeholder="Email address"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          className="rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm outline-none focus:border-gold-500"
        />
        <input
          required
          type="tel"
          placeholder="WhatsApp number"
          value={values.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          className="rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm outline-none focus:border-gold-500"
        />
        {error && <p className="text-xs text-gold-500">{error}</p>}
        <Button type="submit" disabled={status === "loading"} className="mt-1 justify-center" icon={status === "loading" ? <Loader2 size={16} className="animate-spin" /> : undefined}>
          {status === "loading" ? "Unlocking…" : "Unlock My Results"}
        </Button>
        <p className="text-center text-[11px] text-muted">
          By continuing you agree to our{" "}
          <a href="/privacy-policy" className="underline">
            Privacy Policy
          </a>
          . No spam — just your results and relevant follow-up.
        </p>
      </form>
    </div>
  );
}
