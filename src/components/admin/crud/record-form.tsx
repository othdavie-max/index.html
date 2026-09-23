"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/admin/crud/richtext-editor";
import type { FieldSchema } from "@/lib/admin/field-types";

const fieldClass = "w-full rounded-xl border border-ink-900/12 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-gold-500";

export function RecordForm({
  fields,
  initialValues,
  onSubmit,
  onCancel,
}: {
  fields: FieldSchema[];
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, value: unknown) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            {field.label} {field.required && <span className="text-gold-500">*</span>}
          </label>

          {field.type === "text" && (
            <input
              required={field.required}
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => update(field.key, e.target.value)}
              className={fieldClass}
            />
          )}
          {field.type === "number" && (
            <input
              type="number"
              required={field.required}
              value={(values[field.key] as number) ?? ""}
              onChange={(e) => update(field.key, Number(e.target.value))}
              className={fieldClass}
            />
          )}
          {field.type === "textarea" && (
            <textarea
              required={field.required}
              rows={4}
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => update(field.key, e.target.value)}
              className={fieldClass}
            />
          )}
          {field.type === "richtext" && (
            <RichTextEditor value={(values[field.key] as string) ?? ""} onChange={(html) => update(field.key, html)} />
          )}
          {field.type === "boolean" && (
            <label className="flex items-center gap-2 text-sm text-ink-900">
              <input
                type="checkbox"
                checked={Boolean(values[field.key])}
                onChange={(e) => update(field.key, e.target.checked)}
                className="h-4 w-4 accent-gold-500"
              />
              {field.helpText ?? "Yes"}
            </label>
          )}
          {field.type === "select" && (
            <select value={(values[field.key] as string) ?? ""} onChange={(e) => update(field.key, e.target.value)} className={fieldClass}>
              <option value="">Select…</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {field.type === "string-array" && (
            <input
              placeholder="Comma-separated"
              value={Array.isArray(values[field.key]) ? (values[field.key] as string[]).join(", ") : ""}
              onChange={(e) => update(field.key, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              className={fieldClass}
            />
          )}
          {field.helpText && field.type !== "boolean" && <p className="mt-1 text-[11px] text-muted">{field.helpText}</p>}
        </div>
      ))}

      {error && <p className="text-xs text-danger-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-ink-900/10 px-5 py-2.5 text-sm text-ink-900 hover:bg-offwhite">
          Cancel
        </button>
      </div>
    </form>
  );
}
