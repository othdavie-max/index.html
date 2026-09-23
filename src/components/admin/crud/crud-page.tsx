"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { RecordForm } from "@/components/admin/crud/record-form";
import { createClient } from "@/lib/supabase/client";
import type { CrudConfig } from "@/lib/admin/field-types";

type Row = Record<string, unknown> & { id: string };

export function CrudPage({ config }: { config: CrudConfig }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  async function load() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from(config.table).select("*");
    if (config.orderBy) query = query.order(config.orderBy, { ascending: true });
    const { data } = await query;
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setModalOpen(true);
  }

  async function handleSave(values: Record<string, unknown>) {
    if (!supabase) throw new Error("Supabase isn't configured.");
    if (editing) {
      const { error } = await supabase.from(config.table).update(values).eq("id", editing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from(config.table).insert(values);
      if (error) throw new Error(error.message);
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete(row: Row) {
    if (!supabase) return;
    if (!window.confirm("Delete this record? This can't be undone.")) return;
    await supabase.from(config.table).delete().eq("id", row.id);
    await load();
  }

  const defaultValues = Object.fromEntries(
    config.fields.map((f) => [f.key, f.type === "boolean" ? false : f.type === "string-array" ? [] : f.type === "number" ? 0 : ""]),
  );
  if (config.hasPublished) defaultValues.published = false;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ink-900">{config.title}</h1>
          <p className="mt-1 text-sm text-muted">{config.description}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-gold-600">
          <Plus size={15} /> New
        </button>
      </div>

      {!supabase ? (
        <p className="mt-8 rounded-xl border border-danger-500/20 bg-danger-500/5 p-4 text-sm text-muted">
          Supabase isn&apos;t configured. Connect it to manage {config.title.toLowerCase()}.
        </p>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No records yet. Click &quot;New&quot; to add one.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-offwhite text-xs uppercase tracking-wide text-muted">
              <tr>
                {config.listColumns.map((col) => (
                  <th key={col} className="px-4 py-3 font-semibold">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-ink-900/6">
                  {config.listColumns.map((col) => (
                    <td key={col} className="max-w-xs truncate px-4 py-3 text-ink-900">
                      {formatCell(row[col])}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(row)} aria-label="Edit" className="rounded-lg p-1.5 text-ink-900/60 hover:bg-offwhite">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(row)} aria-label="Delete" className="rounded-lg p-1.5 text-danger-500/70 hover:bg-danger-500/10">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <h2 className="mb-4 font-display text-lg text-ink-900">{editing ? "Edit" : "New"} {config.title.replace(/s$/, "")}</h2>
        <RecordForm
          fields={config.fields}
          initialValues={editing ?? defaultValues}
          onSubmit={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && value.length > 80) return value.slice(0, 80) + "…";
  return String(value);
}
