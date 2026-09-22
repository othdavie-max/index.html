"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { trackEvent } from "@/lib/analytics";
import type { Guide } from "@/types";

const fieldClass = "rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm outline-none focus:border-gold-500";

export function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/guides/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, guideSlug: guide.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      trackEvent("guide_download", { guide: guide.slug });
      setFileUrl(data.fileUrl);
      window.open(data.fileUrl, "_blank", "noopener,noreferrer");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-2xl border border-ink-900/8 bg-offwhite p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white">
          <FileText size={20} />
        </div>
        <h3 className="mt-4 font-display text-lg text-ink-900">{guide.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{guide.description}</p>
        {guide.pageCount && <p className="mt-2 text-xs text-muted">{guide.pageCount} pages · Free PDF</p>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-gold-600"
        >
          <Download size={15} /> Get Free Guide
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        {status === "done" && fileUrl ? (
          <div className="text-center">
            <h3 className="font-display text-lg text-ink-900">Your guide is ready</h3>
            <p className="mt-2 text-sm text-muted">It should have opened in a new tab. If not, use the link below.</p>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-medium text-gold-500 underline">
              Open {guide.title}
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <h3 className="text-center font-display text-lg text-ink-900">{guide.title}</h3>
            <p className="text-center text-sm text-muted">Enter your details and we&apos;ll open the guide right away.</p>
            <input required placeholder="Full name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} className={fieldClass} />
            <input required type="email" placeholder="Email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} className={fieldClass} />
            <input required type="tel" placeholder="WhatsApp number" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} className={fieldClass} />
            {error && <p className="text-xs text-danger-500">{error}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gold-500 px-5 py-3 text-sm font-medium text-ink-900 hover:bg-gold-600 disabled:opacity-60"
            >
              {status === "loading" && <Loader2 size={15} className="animate-spin" />}
              {status === "loading" ? "Unlocking…" : "Get Free Guide"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
