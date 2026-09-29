"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { moveLead } from "@/lib/crm/actions";
import { STAGES } from "@/lib/crm/constants";
import { inputCls } from "./ui";

export type BoardLead = { id: string; name: string; phone: string | null; stage: string; source: string; stale: boolean };

export function Board({ initial }: { initial: BoardLead[] }) {
  const [leads, setLeads] = useState(initial);
  const [error, setError] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();

  function move(id: string, stage: string) {
    const prev = leads;
    if (prev.find((l) => l.id === id)?.stage === stage) return;
    setError("");
    setLeads(prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    start(async () => {
      const res = await moveLead(id, stage);
      if (res.error) { setLeads(prev); setError(res.error); }
    });
  }

  return (
    <>
      {error && <p className="mt-3 text-sm text-danger-500">{error}</p>}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage);
          return (
            <section
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
              onDragLeave={() => setOver((o) => (o === stage ? null : o))}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, stage); }}
              className={`w-64 shrink-0 rounded-2xl border p-2 ${over === stage ? "border-gold-500 bg-gold-500/5" : "border-ink-900/10 bg-ink-100/60"}`}
            >
              <h2 className="px-1 py-1 text-xs font-semibold uppercase text-ink-900/70">{stage} <span className="font-normal">({col.length})</span></h2>
              <div className="flex flex-col gap-2">
                {col.map((l) => (
                  <article
                    key={l.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                    className={`cursor-grab rounded-xl border bg-white p-3 text-sm ${l.stale ? "border-danger-500" : "border-ink-900/10"}`}
                  >
                    <Link href={`/crm/leads/${l.id}`} className="font-medium text-ink-900 hover:text-gold-600">{l.name}</Link>
                    <div className="text-xs text-ink-900/60">{l.phone} · {l.source}</div>
                    {l.stale && <div className="text-xs text-danger-500">No contact 3+ days</div>}
                    {/* touch-friendly alternative to dragging */}
                    <select aria-label={`Move ${l.name}`} value={l.stage} onChange={(e) => move(l.id, e.target.value)} className={`${inputCls} mt-2 py-1 text-xs`}>
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
