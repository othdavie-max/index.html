import Link from "next/link";
import { CockpitActions, type SlotGroup } from "@/components/crm/cockpit-actions";
import { requireCrmUser } from "@/lib/crm/auth";
import { callStats } from "@/lib/crm/call-stats";
import { CRM_TIMEZONE, dayBounds, formatWait, partitionLeads, waLink } from "@/lib/crm/lead-utils";
import { DEFAULT_AVAILABILITY, generateSlots, parseAvailability } from "@/lib/crm/slots";
import type { CrmLead } from "@/lib/crm/types";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function CockpitPage({ searchParams }: { searchParams: Promise<{ lead?: string; days?: string }> }) {
  const { lead: leadParam, days: daysParam } = await searchParams;
  const { db, profile } = await requireCrmUser();
  const now = new Date();
  const { start, end } = dayBounds(now);
  const periodDays = [1, 7, 30].includes(Number(daysParam)) ? Number(daysParam) : 7;
  const since = new Date(now.getTime() - periodDays * 86_400_000).toISOString();

  let calls = db.from("crm_interactions").select("outcome, created_by, crm_leads(call_list_id)").eq("type", "call").gte("created_at", since).limit(5000);
  if (profile.role !== "owner") calls = calls.eq("created_by", profile.id);

  const [open, settings, booked, callRows, lists] = await Promise.all([
    db.from("crm_leads").select("*").not("stage", "in", "(Won,Lost,Nurture)").limit(2000),
    db.from("crm_settings").select("key, value"),
    db.rpc("crm_booked_slots", { p_from: now.toISOString(), p_to: new Date(now.getTime() + 9 * 86_400_000).toISOString() }),
    calls,
    profile.role === "owner" ? db.from("crm_call_lists").select("id, name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const cfg = new Map((settings.data ?? []).map((s) => [s.key as string, s.value]));
  const script = typeof cfg.get("call_script") === "string" ? (cfg.get("call_script") as string) : "";
  const av = cfg.has("availability") ? parseAvailability(cfg.get("availability")) : DEFAULT_AVAILABILITY;

  const q = partitionLeads((open.data ?? []) as CrmLead[], start, end);
  // Work order: overdue callbacks, then due today, then brand-new leads waiting.
  const queue = [...q.overdue, ...q.dueToday, ...q.fresh];
  const current = queue.find((l) => l.id === leadParam) ?? queue[0] ?? null;
  const idx = current ? queue.indexOf(current) : -1;
  const nextLeadId = idx >= 0 ? (queue[idx + 1] ?? queue[idx - 1] ?? null)?.id ?? null : null;

  const slotGroups: SlotGroup[] = [];
  for (const iso of generateSlots(av, (booked.data ?? []) as string[], now)) {
    const label = new Date(iso).toLocaleDateString("en-GB", { timeZone: CRM_TIMEZONE, weekday: "short", day: "numeric", month: "short" });
    const time = new Date(iso).toLocaleTimeString("en-GB", { timeZone: CRM_TIMEZONE, hour: "2-digit", minute: "2-digit" });
    let g = slotGroups.find((x) => x.label === label);
    if (!g) slotGroups.push((g = { label, slots: [] }));
    g.slots.push({ iso, time });
  }

  type CallRow = { outcome: string | null; created_by: string | null; crm_leads: { call_list_id: string | null } | null };
  const rows = (callRows.data ?? []) as unknown as CallRow[];
  const mine = callStats(rows);
  const listName = new Map((lists.data ?? []).map((l) => [l.id, l.name]));
  const byList = new Map<string, CallRow[]>();
  for (const r of rows) {
    const key = r.crm_leads?.call_list_id ?? "none";
    byList.set(key, [...(byList.get(key) ?? []), r]);
  }

  const tile = (k: string, v: string) => (
    <div key={k} className="rounded-xl border border-ink-900/10 bg-white p-2 text-center">
      <div className="font-display text-lg text-ink-900">{v}</div><div className="text-[11px] text-ink-900/60">{k}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl text-ink-900">Call cockpit</h1>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_20rem]">
        <aside>
          <h2 className="text-xs font-semibold uppercase text-ink-900/60">Queue ({queue.length})</h2>
          <ul className="mt-2 flex max-h-[28rem] flex-col gap-1 overflow-y-auto">
            {queue.map((l) => (
              <li key={l.id}>
                <Link href={`/crm/cockpit?lead=${l.id}`} className={`block rounded-lg border px-3 py-2 text-sm ${l.id === current?.id ? "border-gold-500 bg-white" : "border-ink-900/10 bg-white/60"}`}>
                  <span className="font-medium">{l.full_name}</span>
                  <span className="block text-xs text-ink-900/60">
                    {q.overdue.includes(l) ? "overdue" : q.fresh.includes(l) ? `new · ${formatWait(now.getTime() - +new Date(l.created_at))}` : "due today"}
                  </span>
                </Link>
              </li>
            ))}
            {queue.length === 0 && <li className="text-sm text-ink-900/60">Queue is clear.</li>}
          </ul>
        </aside>

        <section className="rounded-2xl border border-ink-900/10 bg-white/60 p-4">
          {current ? (
            <>
              <h2 className="font-display text-lg text-ink-900">{current.full_name}</h2>
              <p className="text-sm text-ink-900/70">{current.phone} · {current.stage}{current.country ? ` · ${current.country}` : ""}</p>
              {current.phone && (
                <div className="mt-3 flex gap-2">
                  <a href={`tel:${current.phone}`} className="rounded-full bg-ink-900 px-5 py-2 text-sm text-white">Call now</a>
                  <a href={waLink(current.phone)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-green-600 px-5 py-2 text-sm text-white">WhatsApp</a>
                  <Link href={`/crm/leads/${current.id}`} className="rounded-full border border-ink-900/20 px-4 py-2 text-sm">Full record</Link>
                </div>
              )}
              {current.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{current.notes}</p>}
              <div className="mt-4">
                <CockpitActions key={current.id} leadId={current.id} nextLeadId={nextLeadId} slotGroups={slotGroups} />
              </div>
            </>
          ) : <p className="text-sm text-ink-900/60">Nothing left to call. Check the Today screen for meetings.</p>}
        </section>

        <aside className="rounded-2xl border border-ink-900/10 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase text-ink-900/60">Call script</h2>
          <p className="mt-2 max-h-[26rem] overflow-y-auto whitespace-pre-wrap text-sm">{script || "No script set yet."}</p>
        </aside>
      </div>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base text-ink-900">{profile.role === "owner" ? "Team call performance" : "My performance"}</h2>
          {[1, 7, 30].map((d) => (
            <Link key={d} href={`/crm/cockpit?days=${d}`} className={`text-xs underline ${d === periodDays ? "font-bold" : "text-ink-900/60"}`}>{d === 1 ? "24h" : `${d}d`}</Link>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[tile("Calls made", String(mine.calls)), tile("Connect rate", pct(mine.connectRate)), tile("Interest rate", pct(mine.interestRate)), tile("Meetings booked", String(mine.meetings)),
            tile("Meetings / 100 calls", mine.calls ? (mine.meetings / mine.calls * 100).toFixed(1) : "0")]}
        </div>
        {profile.role === "owner" && (
          <table className="mt-3 w-full overflow-hidden rounded-xl border border-ink-900/10 bg-white text-left text-sm">
            <thead className="bg-ink-100 text-xs uppercase"><tr><th className="p-2">Call list</th><th className="p-2">Calls</th><th className="p-2">Connect</th><th className="p-2">Interest</th><th className="p-2">Meetings</th></tr></thead>
            <tbody>
              {[...byList.entries()].map(([id, r]) => { const s = callStats(r); return (
                <tr key={id} className="border-t border-ink-900/8"><td className="p-2">{id === "none" ? "No list" : listName.get(id) ?? "—"}</td><td className="p-2">{s.calls}</td><td className="p-2">{pct(s.connectRate)}</td><td className="p-2">{pct(s.interestRate)}</td><td className="p-2">{s.meetings}</td></tr>
              ); })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
