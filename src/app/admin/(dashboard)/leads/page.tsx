"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";
import type { LeadSource } from "@/types";

interface LeadRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  status: "New" | "Contacted" | "In progress" | "Converted" | "Closed";
  notes: string | null;
}

const statuses = ["New", "Contacted", "In progress", "Converted", "Closed"] as const;
const sources: (LeadSource | "all")[] = ["all", "course-matcher", "ai-chat", "guide-download", "contact", "booking", "newsletter", "timeline-planner", "application"];

export default function LeadsAdminPage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function load() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data as LeadRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateLead(id: string, patch: Partial<LeadRow>) {
    if (!supabase) return;
    await supabase.from("leads").update(patch).eq("id", id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  const filtered = leads.filter((l) => (sourceFilter === "all" || l.source === sourceFilter) && (statusFilter === "all" || l.status === statusFilter));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-ink-900">Leads</h1>
          <p className="mt-1 text-sm text-muted">All leads from every source across the site.</p>
        </div>
        <button
          onClick={() => downloadCsv("baseline-leads.csv", filtered as unknown as Record<string, unknown>[])}
          className="flex items-center gap-1.5 rounded-full border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-900 hover:bg-white"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as LeadSource | "all")} className="rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-sm">
          {sources.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All sources" : s}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {!supabase ? (
        <p className="mt-8 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-sm text-muted">Supabase isn&apos;t configured. Connect it to view leads.</p>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-offwhite text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t border-ink-900/6 align-top">
                  <td className="px-4 py-3 text-xs text-muted">{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{lead.name}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {lead.email}
                    <br />
                    {lead.phone}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-900">{lead.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadRow["status"] })}
                      className="rounded-lg border border-ink-900/12 bg-white px-2 py-1 text-xs"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      defaultValue={lead.notes ?? ""}
                      onBlur={(e) => updateLead(lead.id, { notes: e.target.value })}
                      rows={2}
                      placeholder="Add a note…"
                      className="w-48 rounded-lg border border-ink-900/12 bg-white px-2 py-1 text-xs outline-none focus:border-gold-500"
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    No leads match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
