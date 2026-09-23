"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { consultationTypeLabels } from "@/lib/booking";

interface BookingRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  consultation_type: keyof typeof consultationTypeLabels;
  scheduled_date: string;
  scheduled_time: string;
  destination: string | null;
  level: string | null;
  message: string | null;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No-show";
}

const statuses = ["Pending", "Confirmed", "Completed", "Cancelled", "No-show"] as const;

export default function BookingsAdminPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("bookings").select("*").order("scheduled_date", { ascending: true }).order("scheduled_time", { ascending: true });
    setRows((data as BookingRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: string, status: BookingRow["status"]) {
    if (!supabase) return;
    await supabase.from("bookings").update({ status }).eq("id", id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div>
      <h1 className="font-display text-xl text-ink-900">Bookings</h1>
      <p className="mt-1 text-sm text-muted">
        Upcoming and past consultations. Availability (hours and slot length) is configured on the{" "}
        <a href="/admin/settings" className="text-gold-500 underline">
          Site Settings
        </a>{" "}
        page.
      </p>

      {!supabase ? (
        <p className="mt-8 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-sm text-muted">Supabase isn&apos;t configured. Connect it to view bookings.</p>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-offwhite text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Destination / Level</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-900/6">
                  <td className="px-4 py-3 text-xs text-ink-900">
                    {new Date(`${r.scheduled_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {r.scheduled_time}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {r.email}
                    <br />
                    {r.phone}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-900">{consultationTypeLabels[r.consultation_type]}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">
                    {r.destination ?? "N/A"} {r.level ? `/ ${r.level}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as BookingRow["status"])} className="rounded-lg border border-ink-900/12 bg-white px-2 py-1 text-xs">
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                    No bookings yet.
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
