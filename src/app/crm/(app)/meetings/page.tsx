import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCrmUser } from "@/lib/crm/auth";
import { CRM_TIMEZONE, dayBounds } from "@/lib/crm/lead-utils";

export const dynamic = "force-dynamic";
const DAY = 86_400_000;
const STATUS_CLS: Record<string, string> = {
  booked: "bg-ink-100 text-ink-900", held: "bg-green-100 text-green-800",
  "no-show": "bg-danger-500 text-white", rescheduled: "bg-amber-100 text-amber-800 line-through",
};

type M = { id: string; scheduled_at: string; format: string; status: string; crm_leads: { full_name: string } | null };
const time = (d: string) => new Date(d).toLocaleTimeString("en-GB", { timeZone: CRM_TIMEZONE, hour: "2-digit", minute: "2-digit" });
const dayKey = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: CRM_TIMEZONE, weekday: "short", day: "numeric", month: "short" });

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const { db, profile } = await requireCrmUser();
  if (profile.role !== "owner") redirect("/crm/today");

  const offset = Math.max(-52, Math.min(52, Number(week) || 0));
  const today = dayBounds().start;
  const dow = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Date(today.getTime() + 12 * 3_600_000).toLocaleDateString("en-US", { timeZone: CRM_TIMEZONE, weekday: "short" })) + 6) % 7;
  const weekStart = new Date(today.getTime() - dow * DAY + offset * 7 * DAY);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY);

  const [inWeek, overdue] = await Promise.all([
    db.from("crm_meetings").select("id, scheduled_at, format, status, crm_leads(full_name)")
      .gte("scheduled_at", weekStart.toISOString()).lt("scheduled_at", weekEnd.toISOString()).order("scheduled_at"),
    db.from("crm_meetings").select("id, scheduled_at, format, status, crm_leads(full_name)")
      .eq("status", "booked").lt("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(50),
  ]);
  const meetings = (inWeek.data ?? []) as unknown as M[];
  const needsOutcome = (overdue.data ?? []) as unknown as M[];
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-xl text-ink-900">Meetings</h1>
        <Link href={`/crm/meetings?week=${offset - 1}`} className="text-sm underline">← Prev</Link>
        <span className="text-sm">{dayKey(days[0])} – {dayKey(days[6])}</span>
        <Link href={`/crm/meetings?week=${offset + 1}`} className="text-sm underline">Next →</Link>
        {offset !== 0 && <Link href="/crm/meetings" className="text-sm text-gold-600 underline">This week</Link>}
      </div>

      {needsOutcome.length > 0 && (
        <section className="rounded-2xl border border-danger-500 bg-white p-4">
          <h2 className="font-display text-base text-danger-500">Needs an outcome ({needsOutcome.length})</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {needsOutcome.map((m) => (
              <li key={m.id}><Link href={`/crm/meetings/${m.id}`} className="underline">{m.crm_leads?.full_name}</Link> · {dayKey(new Date(m.scheduled_at))} {time(m.scheduled_at)}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-2 sm:grid-cols-7">
        {days.map((d) => {
          const key = dayKey(d);
          const list = meetings.filter((m) => dayKey(new Date(m.scheduled_at)) === key);
          return (
            <section key={key} className="rounded-xl border border-ink-900/10 bg-white p-2">
              <h2 className="text-xs font-semibold text-ink-900/70">{key}</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {list.map((m) => (
                  <li key={m.id}>
                    <Link href={`/crm/meetings/${m.id}`} className={`block rounded-lg px-2 py-1.5 text-xs ${STATUS_CLS[m.status] ?? ""}`}>
                      <span className="font-medium">{time(m.scheduled_at)}</span> {m.crm_leads?.full_name}
                      <span className="block opacity-70">{m.format} · {m.status}</span>
                    </Link>
                  </li>
                ))}
                {list.length === 0 && <li className="text-xs text-ink-900/40">—</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
