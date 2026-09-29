import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MeetingActions } from "@/components/crm/meeting-actions";
import { requireCrmUser } from "@/lib/crm/auth";
import { CRM_TIMEZONE, waLink } from "@/lib/crm/lead-utils";
import { getOpenSlots } from "@/lib/crm/open-slots";
import { groupSlots } from "@/lib/crm/slots";
import type { CrmInteraction, CrmLead } from "@/lib/crm/types";

export const dynamic = "force-dynamic";
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB", { timeZone: CRM_TIMEZONE }) : "—");

export default async function MeetingBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db, profile } = await requireCrmUser();
  if (profile.role !== "owner") redirect("/crm/today");

  const { data: m } = await db.from("crm_meetings").select("*, crm_leads(*, crm_sources(name))").eq("id", id).maybeSingle();
  if (!m) notFound();
  const lead = m.crm_leads as (CrmLead & { crm_sources: { name: string } | null }) | null;
  if (!lead) notFound();

  const [{ data: history }, { data: others }, { data: deals }, open] = await Promise.all([
    db.from("crm_interactions").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
    db.from("crm_meetings").select("id, scheduled_at, status").eq("lead_id", lead.id).neq("id", id).order("scheduled_at", { ascending: false }),
    db.from("crm_deals").select("project, unit, value, status").eq("lead_id", lead.id),
    m.status === "booked" ? getOpenSlots(db) : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <Link href="/crm/meetings" className="text-xs text-ink-900/60 underline">← Meetings</Link>
          <h1 className="mt-1 font-display text-2xl text-ink-900">{lead.full_name}</h1>
          <p className="text-sm text-ink-900/70">{fmt(m.scheduled_at)} · {m.format} · {m.duration_minutes} min · <b>{m.status}</b></p>
          <div className="mt-3 flex gap-2">
            {lead.phone && <a href={`tel:${lead.phone}`} className="rounded-full bg-ink-900 px-4 py-2 text-sm text-white">Call</a>}
            {lead.phone && <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-green-600 px-4 py-2 text-sm text-white">WhatsApp</a>}
            <Link href={`/crm/leads/${lead.id}`} className="rounded-full border border-ink-900/20 px-4 py-2 text-sm">Full record</Link>
          </div>
        </div>
        {m.status === "booked" && open && <MeetingActions meetingId={m.id} slotGroups={groupSlots(open.slots)} />}
        {m.outcome_notes && <div className="rounded-xl border border-ink-900/10 bg-white p-3 text-sm"><b>Outcome notes:</b> <span className="whitespace-pre-wrap">{m.outcome_notes}</span></div>}
        <section className="rounded-2xl border border-ink-900/10 bg-white p-4">
          <h2 className="font-display text-base text-ink-900">Pre-meeting brief</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.lead_summary ?? "No summary recorded."}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-900/60">Stage</dt><dd>{lead.stage}</dd>
            <dt className="text-ink-900/60">Source</dt><dd>{lead.crm_sources?.name}</dd>
            <dt className="text-ink-900/60">WhatsApp consent</dt><dd>{lead.consent_whatsapp ? `Yes (${fmt(lead.consent_whatsapp_at)})` : "No"}</dd>
          </dl>
          {(deals ?? []).length > 0 && <p className="mt-2 text-sm"><b>Deals:</b> {(deals ?? []).map((d) => `${d.project ?? "—"} ${d.unit ?? ""} (${d.status})`).join("; ")}</p>}
          {(others ?? []).length > 0 && <p className="mt-2 text-xs text-ink-900/60">Other meetings: {(others ?? []).map((o) => (<Link key={o.id} href={`/crm/meetings/${o.id}`} className="underline mr-2">{fmt(o.scheduled_at)} ({o.status})</Link>))}</p>}
        </section>
      </div>
      <section>
        <h2 className="font-display text-base text-ink-900">History with this lead</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {((history ?? []) as CrmInteraction[]).map((i) => (
            <li key={i.id} className="rounded-xl border border-ink-900/10 bg-white p-3 text-sm">
              <div className="flex justify-between text-xs text-ink-900/60"><span className="font-medium capitalize text-ink-900">{i.type}{i.outcome ? ` · ${i.outcome}` : ""}</span><span>{fmt(i.created_at)}</span></div>
              {i.summary && <p className="mt-1 whitespace-pre-wrap">{i.summary}</p>}
            </li>
          ))}
          {(history ?? []).length === 0 && <li className="text-sm text-ink-900/60">No history yet.</li>}
        </ol>
      </section>
    </div>
  );
}
