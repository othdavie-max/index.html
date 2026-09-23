"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, FileText, CalendarClock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Counts {
  leads: number;
  applications: number;
  bookings: number;
}

interface RecentLead {
  id: string;
  created_at: string;
  name: string;
  source: string;
  status: string;
}

export default function AdminOverviewPage() {
  const supabase = createClient();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [leads, applications, bookings, recent] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id, created_at, name, source, status").order("created_at", { ascending: false }).limit(8),
      ]);
      setCounts({ leads: leads.count ?? 0, applications: applications.count ?? 0, bookings: bookings.count ?? 0 });
      setRecentLeads((recent.data as RecentLead[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = [
    { label: "Total Leads", value: counts?.leads, icon: Users, href: "/admin/leads" },
    { label: "Applications", value: counts?.applications, icon: FileText, href: "/admin/applications" },
    { label: "Bookings", value: counts?.bookings, icon: CalendarClock, href: "/admin/bookings" },
  ];

  return (
    <div>
      <h1 className="font-display text-xl text-ink-900">Overview</h1>
      <p className="mt-1 text-sm text-muted">A snapshot of activity across the site.</p>

      {!supabase ? (
        <p className="mt-8 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-sm text-muted">
          Supabase isn&apos;t configured. Connect it to see live counts and recent activity.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <Link key={c.label} href={c.href} className="rounded-2xl border border-ink-900/8 bg-white p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
                    <c.icon size={18} />
                  </div>
                  <ArrowRight size={14} className="text-ink-900/30" />
                </div>
                <p className="mt-4 font-display text-3xl text-ink-900">{c.value ?? "N/A"}</p>
                <p className="mt-1 text-sm text-muted">{c.label}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-ink-900/8 bg-white p-6">
            <h2 className="font-display text-base text-ink-900">Recent Leads</h2>
            <div className="mt-4 flex flex-col gap-3">
              {recentLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b border-ink-900/6 pb-3 text-sm last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-ink-900">{l.name}</p>
                    <p className="text-xs text-muted">
                      {l.source} · {new Date(l.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-900">{l.status}</span>
                </div>
              ))}
              {recentLeads.length === 0 && <p className="text-sm text-muted">No leads yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
