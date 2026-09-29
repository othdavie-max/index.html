import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import { InteractionForm } from "@/components/crm/interaction-form";
import { requireCrmUser } from "@/lib/crm/auth";
import { isStale, waLink } from "@/lib/crm/lead-utils";
import type { CrmInteraction, CrmLead } from "@/lib/crm/types";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db } = await requireCrmUser();

  // RLS hides leads that aren't assigned to a non-owner, so a foreign id is simply "not found".
  const { data } = await db.from("crm_leads").select("*, crm_sources(name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const lead = data as CrmLead & { crm_sources: { name: string } | null };

  const [{ data: timeline }, { data: users }] = await Promise.all([
    db.from("crm_interactions").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    db.from("crm_users").select("id, name"),
  ]);
  const userName = new Map((users ?? []).map((u) => [u.id as string, u.name as string]));
  const stale = isStale(lead);

  const facts: [string, string | null][] = [
    ["Source", lead.crm_sources?.name ?? null], ["Campaign", lead.campaign],
    ["Email", lead.email], ["Location", [lead.city, lead.country].filter(Boolean).join(", ") || null],
    ["Project interest", lead.project_interest], ["Budget", lead.budget_range],
    ["Payment", lead.payment_preference], ["Purpose", lead.purchase_purpose], ["Timeline", lead.timeline],
    ["Assigned to", lead.assigned_to ? (userName.get(lead.assigned_to) ?? null) : "Unassigned"],
    ["WhatsApp consent", lead.consent_whatsapp ? `Yes — ${fmt(lead.consent_whatsapp_at)} (${lead.consent_source})` : "No"],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <Link href="/crm/leads" className="text-xs text-ink-900/60 underline">← Leads</Link>
        <h1 className="mt-1 font-display text-2xl text-ink-900">{lead.full_name}</h1>
        <p className="text-sm text-ink-900/70">{lead.stage} · created {fmt(lead.created_at)}</p>
        {stale && <p className="mt-2 inline-block rounded-full bg-danger-500 px-3 py-1 text-xs text-white">No contact for 3+ days</p>}
        {lead.phone && (
          <div className="mt-4 flex gap-2">
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm text-white"><Phone size={14} /> Call</a>
            <a href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm text-white"><MessageCircle size={14} /> WhatsApp</a>
          </div>
        )}
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border border-ink-900/10 bg-white p-4 text-sm">
          <dt className="text-ink-900/60">Phone</dt><dd>{lead.phone ?? "—"}</dd>
          {facts.filter(([, v]) => v).map(([k, v]) => (<Fragment key={k}><dt className="text-ink-900/60">{k}</dt><dd>{v}</dd></Fragment>))}
          <dt className="text-ink-900/60">Last contact</dt><dd>{fmt(lead.last_contacted_at)}</dd>
          <dt className="text-ink-900/60">Next follow-up</dt><dd>{fmt(lead.next_follow_up_at)}</dd>
          {lead.notes && (<><dt className="text-ink-900/60">Notes</dt><dd className="whitespace-pre-wrap">{lead.notes}</dd></>)}
        </dl>
      </div>

      <div className="flex flex-col gap-6">
        <InteractionForm leadId={lead.id} stage={lead.stage} consented={lead.consent_whatsapp} />
        <section>
          <h2 className="font-display text-base text-ink-900">Timeline</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {((timeline ?? []) as CrmInteraction[]).map((i) => (
              <li key={i.id} className="rounded-xl border border-ink-900/10 bg-white p-3 text-sm">
                <div className="flex justify-between text-xs text-ink-900/60">
                  <span className="font-medium capitalize text-ink-900">{i.type}{i.outcome ? ` · ${i.outcome}` : ""}</span>
                  <span>{fmt(i.created_at)}{i.created_by ? ` · ${userName.get(i.created_by) ?? ""}` : ""}</span>
                </div>
                {i.summary && <p className="mt-1 whitespace-pre-wrap">{i.summary}</p>}
              </li>
            ))}
            {(timeline ?? []).length === 0 && <li className="text-sm text-ink-900/60">No interactions yet.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}
