import Link from "next/link";
import { requireCrmUser } from "@/lib/crm/auth";
import { CRM_TIMEZONE, dayBounds, formatWait, isStale, waLink } from "@/lib/crm/lead-utils";
import type { CrmLead } from "@/lib/crm/types";

export const dynamic = "force-dynamic";

type Meeting = { id: string; scheduled_at: string; format: string; crm_leads: { id: string; full_name: string; phone: string | null } | null };

const fmtTime = (d: string) => new Date(d).toLocaleString("en-GB", { timeZone: CRM_TIMEZONE, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function LeadRow({ l, note, red }: { l: CrmLead; note: string; red?: boolean }) {
  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm ${red ? "border-danger-500" : "border-ink-900/10"}`}>
      <div className="min-w-0">
        <Link href={`/crm/leads/${l.id}`} className="font-medium text-ink-900 hover:text-gold-600">{l.full_name}</Link>
        <div className="text-xs text-ink-900/60">{l.stage} · {note}</div>
      </div>
      {l.phone && (
        <div className="flex shrink-0 gap-2 text-xs">
          <a href={`tel:${l.phone}`} className="rounded-full bg-ink-900 px-3 py-1.5 text-white">Call</a>
          <a href={waLink(l.phone)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-green-600 px-3 py-1.5 text-white">WhatsApp</a>
        </div>
      )}
    </li>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base text-ink-900">{title} <span className="text-sm text-ink-900/50">({count})</span></h2>
      <ul className="mt-2 flex flex-col gap-2">{children}</ul>
      {count === 0 && <p className="mt-2 text-sm text-ink-900/50">Nothing here.</p>}
    </section>
  );
}

export default async function TodayPage() {
  const { db } = await requireCrmUser();
  const now = new Date();
  const { start, end } = dayBounds(now);
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const [open, meetings, responded] = await Promise.all([
    db.from("crm_leads").select("*").not("stage", "in", "(Won,Lost,Nurture)").limit(2000),
    db.from("crm_meetings").select("id, scheduled_at, format, crm_leads(id, full_name, phone)")
      .eq("status", "booked").gte("scheduled_at", start.toISOString()).lt("scheduled_at", end.toISOString()).order("scheduled_at"),
    db.from("crm_leads").select("created_at, first_contacted_at").not("first_contacted_at", "is", null).gte("created_at", since).limit(2000),
  ]);
  const leads = (open.data ?? []) as CrmLead[];
  const at = (l: CrmLead) => new Date(l.next_follow_up_at!).getTime();

  const fresh = leads.filter((l) => !l.first_contacted_at && l.stage === "New")
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const freshIds = new Set(fresh.map((l) => l.id));
  const rest = leads.filter((l) => !freshIds.has(l.id));
  const overdue = rest.filter((l) => l.next_follow_up_at && at(l) < start.getTime()).sort((a, b) => at(a) - at(b));
  const dueToday = rest.filter((l) => l.next_follow_up_at && at(l) >= start.getTime() && at(l) < end.getTime()).sort((a, b) => at(a) - at(b));
  const noStep = rest.filter((l) => !l.next_follow_up_at);
  const stale = leads.filter((l) => isStale(l));

  const waits = (responded.data ?? []).map((r) => +new Date(r.first_contacted_at as string) - +new Date(r.created_at as string));
  const avgResponse = waits.length ? formatWait(waits.reduce((a, b) => a + b, 0) / waits.length) : "—";
  const compliance = leads.length ? Math.round(((leads.length - noStep.length) / leads.length) * 100) : 100;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl text-ink-900">Today</h1>
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[
          ["Avg first response (30d)", avgResponse],
          ["Follow-up compliance", `${compliance}%`],
          ["Red-flag leads", String(stale.length)],
          ["Meetings today", String((meetings.data ?? []).length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-ink-900/10 bg-white p-3">
            <div className="font-display text-2xl text-ink-900">{v}</div>
            <div className="text-xs text-ink-900/60">{k}</div>
          </div>
        ))}
      </div>

      <Section title="New leads waiting" count={fresh.length}>
        {fresh.map((l) => {
          const wait = now.getTime() - +new Date(l.created_at);
          return <LeadRow key={l.id} l={l} note={`waiting ${formatWait(wait)}`} red={wait > 3_600_000} />;
        })}
      </Section>
      <Section title="Meetings today" count={(meetings.data ?? []).length}>
        {((meetings.data ?? []) as unknown as Meeting[]).map((m) => (
          <li key={m.id} className="rounded-xl border border-ink-900/10 bg-white p-3 text-sm">
            <span className="font-medium">{fmtTime(m.scheduled_at)}</span> · {m.format} ·{" "}
            {m.crm_leads ? <Link href={`/crm/leads/${m.crm_leads.id}`} className="text-gold-600 underline">{m.crm_leads.full_name}</Link> : "—"}
          </li>
        ))}
      </Section>
      <Section title="Overdue follow-ups" count={overdue.length}>
        {overdue.map((l) => <LeadRow key={l.id} l={l} red note={`was due ${fmtTime(l.next_follow_up_at!)}`} />)}
      </Section>
      <Section title="Follow-ups due today" count={dueToday.length}>
        {dueToday.map((l) => <LeadRow key={l.id} l={l} note={`due ${fmtTime(l.next_follow_up_at!)}`} red={isStale(l)} />)}
      </Section>
      {noStep.length > 0 && (
        <Section title="No next step set" count={noStep.length}>
          {noStep.map((l) => <LeadRow key={l.id} l={l} red note="needs a follow-up date, Lost or Nurture" />)}
        </Section>
      )}
    </div>
  );
}
