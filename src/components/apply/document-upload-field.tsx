"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB, type DocumentRequirement } from "@/data/document-checklists";
import { cn } from "@/lib/utils";

export interface UploadedDoc {
  fileName: string;
  path: string;
}

export function DocumentUploadField({
  requirement,
  sessionId,
  value,
  onChange,
}: {
  requirement: DocumentRequirement;
  sessionId: string;
  value: UploadedDoc | undefined;
  onChange: (doc: UploadedDoc | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Only PDF, JPG or PNG files are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulated progress: Supabase's upload() doesn't expose byte-level
    // progress in the browser, so we ease toward 90% while the request is
    // in flight and jump to 100% on completion.
    const tick = setInterval(() => setProgress((p) => Math.min(90, p + Math.random() * 18)), 200);

    const supabase = createClient();
    const path = `${sessionId}/${requirement.id}-${Date.now()}-${file.name}`;

    if (!supabase) {
      // No Supabase configured — attach locally so the rest of the flow
      // (review, submit) is still fully testable.
      clearInterval(tick);
      setProgress(100);
      setUploading(false);
      onChange({ fileName: file.name, path: `local:${path}` });
      return;
    }

    const { error: uploadError } = await supabase.storage.from("application-documents").upload(path, file, { upsert: false });
    clearInterval(tick);
    setUploading(false);

    if (uploadError) {
      setError("Upload failed. Please try again.");
      return;
    }
    setProgress(100);
    onChange({ fileName: file.name, path });
  }

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-900">
          {requirement.label}
          {requirement.required && <span className="ml-1 text-gold-500">*</span>}
        </p>
        {!requirement.required && <span className="text-[11px] text-muted">Optional</span>}
      </div>

      {value ? (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-offwhite px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-ink-900">
            <CheckCircle2 size={14} className="text-gold-500" />
            <FileText size={14} /> {value.fileName}
          </span>
          <button type="button" onClick={() => onChange(undefined)} aria-label="Remove file" className="text-ink-900/40 hover:text-gold-500">
            <X size={14} />
          </button>
        </div>
      ) : uploading ? (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/10">
            <div className="h-full rounded-full bg-gold-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <Loader2 size={12} className="animate-spin" /> Uploading…
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-900/20 py-3 text-xs text-muted hover:border-gold-500/40 hover:text-ink-900",
          )}
        >
          <UploadCloud size={14} /> Upload PDF, JPG or PNG (max {MAX_FILE_SIZE_MB}MB)
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-xs text-danger-500">{error}</p>}
    </div>
  );
}
