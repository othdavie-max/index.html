"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";

interface ApplicationRow {
  id: string;
  created_at: string;
  reference_id: string;
  full_name: string;
  email: string;
  phone: string;
  level: string;
  destination_countries: string[];
  course_of_interest: string | null;
  intake: string | null;
  academic_background: Record<string, unknown>;
  english_test: Record<string, unknown>;
  documents: Record<string, { fileName: string; path: string }>;
  status: string;
}

const statuses = ["Submitted", "Under Review", "Documents Requested", "Applied to University", "Offer Received", "Visa Stage", "Closed"];

export default function ApplicationsAdminPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ApplicationRow | null>(null);

  async function load() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    setRows((data as unknown as ApplicationRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, status: string) {
    if (!supabase) return;
    await supabase.from("applications").update({ status }).eq("id", id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setActive((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  }

  async function openDocument(path: string) {
    if (!supabase || path.startsWith("local:")) {
      window.alert("This document was uploaded before Supabase Storage was configured and isn't retrievable.");
      return;
    }
    const { data } = await supabase.storage.from("application-documents").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-navy-900">Applications</h1>
          <p className="mt-1 text-sm text-muted">Submitted applications and their documents.</p>
        </div>
        <button
          onClick={() => downloadCsv("baseline-applications.csv", rows.map(({ documents, academic_background, english_test, ...r }) => r))}
          className="flex items-center gap-1.5 rounded-full border border-navy-900/10 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-white"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {!supabase ? (
        <p className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-muted">Supabase isn&apos;t configured — connect it to view applications.</p>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-900/8 bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-offwhite text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Applicant</th>
                <th className="px-4 py-3 font-semibold">Level</th>
                <th className="px-4 py-3 font-semibold">Destinations</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-navy-900/6">
                  <td className="px-4 py-3 font-mono text-xs text-navy-900">{r.reference_id}</td>
                  <td className="px-4 py-3 text-navy-900">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs capitalize text-navy-900">{r.level}</td>
                  <td className="px-4 py-3 text-xs text-navy-900">{r.destination_countries?.join(", ")}</td>
                  <td className="px-4 py-3 text-xs text-navy-900">{r.status}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setActive(r)} className="text-xs font-medium text-red-500 hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!active} onClose={() => setActive(null)}>
        {active && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy-900">{active.full_name}</h2>
              <button onClick={() => setActive(null)} className="text-navy-900/40 hover:text-navy-900">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Reference" value={active.reference_id} />
              <DetailRow label="Email" value={active.email} />
              <DetailRow label="Phone" value={active.phone} />
              <DetailRow label="Level" value={active.level} />
              <DetailRow label="Course" value={active.course_of_interest ?? "—"} />
              <DetailRow label="Intake" value={active.intake ?? "—"} />
              <DetailRow label="Destinations" value={active.destination_countries?.join(", ")} />
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
              <select value={active.status} onChange={(e) => updateStatus(active.id, e.target.value)} className="rounded-lg border border-navy-900/12 bg-white px-3 py-2 text-sm">
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Documents</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(active.documents ?? {}).map(([key, doc]) => (
                  <button
                    key={key}
                    onClick={() => openDocument(doc.path)}
                    className="flex items-center justify-between rounded-lg border border-navy-900/10 px-3 py-2 text-left text-xs hover:bg-offwhite"
                  >
                    <span>
                      {key}: {doc.fileName}
                    </span>
                    <ExternalLink size={12} />
                  </button>
                ))}
                {Object.keys(active.documents ?? {}).length === 0 && <p className="text-xs text-muted">No documents uploaded.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-navy-900">{value}</p>
    </div>
  );
}
