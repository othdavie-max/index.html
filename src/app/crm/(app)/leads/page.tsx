import Link from "next/link";
import { requireCrmUser } from "@/lib/crm/auth";
import { STAGES } from "@/lib/crm/constants";
import { isStale } from "@/lib/crm/lead-utils";
import { inputCls } from "@/components/crm/ui";
import type { CrmLead } from "@/lib/crm/types";

type Row = CrmLead & { crm_sources: { name: string } | null };
type Params = Promise<{ q?: string; stage?: string; source?: string; assigned?: string; country?: string; project?: string; from?: string; to?: string }>;

export default async function LeadsPage({ searchParams }: { searchParams: Params }) {
  const { q, stage, source, assigned, country, project, from, to } = await searchParams;
  const { db, profile } = await requireCrmUser();

  let query = db.from("crm_leads").select("*, crm_sources(name)").order("created_at", { ascending: false }).limit(200);
  if (q) {
    // Strip characters that have meaning inside a PostgREST or() filter.
    const term = q.replace(/[,()%*\\]/g, " ").trim();
    if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (stage) query = query.eq("stage", stage);
  if (source) query = query.eq("source_id", source);
  if (assigned) query = query.eq("assigned_to", assigned);
  if (country) query = query.ilike("country", `%${country.replace(/[,()%*\\]/g, " ").trim()}%`);
  if (project) query = query.ilike("project_interest", `%${project.replace(/[,()%*\\]/g, " ").trim()}%`);
  const isDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (isDate(from)) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (isDate(to)) query = query.lte("created_at", `${to}T23:59:59Z`);

  const [{ data: leads, error }, { data: sources }, { data: users }] = await Promise.all([
    query,
    db.from("crm_sources").select("id, name").order("name"),
    db.from("crm_users").select("id, name"),
  ]);
  const userName = new Map((users ?? []).map((u) => [u.id as string, u.name as string]));
  const rows = (leads ?? []) as Row[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-ink-900">Leads</h1>
        <div className="flex gap-4 text-sm text-gold-600 underline"><Link href="/crm/leads/board">Board view</Link><Link href="/crm/leads/new">+ New lead</Link></div>
      </div>

      <form className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input name="q" defaultValue={q} placeholder="Search name, phone, email" className={`${inputCls} col-span-2`} />
        <select name="stage" defaultValue={stage ?? ""} className={inputCls}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="source" defaultValue={source ?? ""} className={inputCls}>
          <option value="">All sources</option>
          {(sources ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {profile.role === "owner" ? (
          <select name="assigned" defaultValue={assigned ?? ""} className={inputCls}>
            <option value="">Anyone</option>
            {(users ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        ) : <span />}
        <input name="country" defaultValue={country} placeholder="Country" className={inputCls} />
        <input name="project" defaultValue={project} placeholder="Project" className={inputCls} />
        <input name="from" type="date" defaultValue={from} aria-label="Created from" className={inputCls} />
        <input name="to" type="date" defaultValue={to} aria-label="Created to" className={inputCls} />
        <button className="rounded-full bg-ink-900 px-4 py-2 text-sm text-white sm:col-span-5 sm:w-fit">Filter</button>
      </form>

      {error && <p className="mt-4 text-sm text-danger-500">{error.message}</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-900/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-100 text-xs uppercase text-ink-900/70">
            <tr>
              <th className="p-3">Lead</th><th className="p-3">Stage</th><th className="p-3">Source</th>
              <th className="p-3">Owner</th><th className="p-3">Last contact</th><th className="p-3">Next step</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const stale = isStale(l);
              return (
                <tr key={l.id} className="border-t border-ink-900/8">
                  <td className="p-3">
                    <Link href={`/crm/leads/${l.id}`} className="font-medium text-ink-900 hover:text-gold-600">{l.full_name}</Link>
                    <div className="text-xs text-ink-900/60">{l.phone}</div>
                  </td>
                  <td className="p-3">{l.stage}</td>
                  <td className="p-3">{l.crm_sources?.name}</td>
                  <td className="p-3">{l.assigned_to ? userName.get(l.assigned_to) ?? "—" : "Unassigned"}</td>
                  <td className={`p-3 ${stale ? "font-medium text-danger-500" : ""}`}>
                    {l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : "Never"}
                    {stale && " ⚑"}
                  </td>
                  <td className="p-3">{l.next_follow_up_at ? new Date(l.next_follow_up_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-900/60">No leads match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
