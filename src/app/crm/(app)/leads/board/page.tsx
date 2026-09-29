import Link from "next/link";
import { Board, type BoardLead } from "@/components/crm/board";
import { requireCrmUser } from "@/lib/crm/auth";
import { isStale } from "@/lib/crm/lead-utils";
import type { CrmLead } from "@/lib/crm/types";

export default async function BoardPage() {
  const { db } = await requireCrmUser();
  const { data, error } = await db.from("crm_leads").select("*, crm_sources(name)").order("created_at", { ascending: false }).limit(500);
  const leads: BoardLead[] = ((data ?? []) as (CrmLead & { crm_sources: { name: string } | null })[]).map((l) => ({
    id: l.id, name: l.full_name, phone: l.phone, stage: l.stage, source: l.crm_sources?.name ?? "", stale: isStale(l),
  }));
  return (
    <div>
      <div className="flex items-center gap-4">
        <h1 className="font-display text-xl text-ink-900">Pipeline</h1>
        <Link href="/crm/leads" className="text-sm text-gold-600 underline">List view</Link>
      </div>
      {error && <p className="mt-2 text-sm text-danger-500">{error.message}</p>}
      <p className="mt-1 text-xs text-ink-900/60">Showing the 500 most recent leads. Drag a card to change its stage.</p>
      <Board initial={leads} />
    </div>
  );
}
