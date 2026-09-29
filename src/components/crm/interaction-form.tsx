"use client";

import { useActionState, useState } from "react";
import { logInteraction } from "@/lib/crm/actions";
import { CALL_OUTCOMES, INTERACTION_TYPES, STAGES } from "@/lib/crm/constants";
import { btnCls, inputCls, labelCls } from "./ui";

export function InteractionForm({ leadId, stage, consented }: { leadId: string; stage: string; consented: boolean }) {
  const [state, action, pending] = useActionState(logInteraction, {});
  const [newStage, setNewStage] = useState("");
  const [local, setLocal] = useState("");
  const closing = ["Lost", "Nurture", "Won"].includes(newStage || stage);
  // datetime-local has no timezone; convert in the browser so the server stores the right instant.
  const iso = local ? new Date(local).toISOString() : "";

  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 sm:grid-cols-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="direction" value="outbound" />
      <input type="hidden" name="next_follow_up_at" value={iso} />
      <h2 className="font-display text-base text-ink-900 sm:col-span-2">Log interaction</h2>
      <label className={labelCls}>Type
        <select name="type" className={inputCls} defaultValue="call">{INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <label className={labelCls}>Outcome
        <input name="outcome" list="crm-outcomes" className={inputCls} />
        <datalist id="crm-outcomes">{CALL_OUTCOMES.map((o) => <option key={o} value={o} />)}</datalist>
      </label>
      <label className={`${labelCls} sm:col-span-2`}>Summary<textarea name="summary" rows={2} className={inputCls} /></label>
      <label className={labelCls}>Move to stage
        <select name="new_stage" value={newStage} onChange={(e) => setNewStage(e.target.value)} className={inputCls}>
          <option value="">Keep ({stage})</option>{STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className={labelCls}>Next follow-up {closing ? "(not needed)" : "*"}
        <input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} disabled={closing} required={!closing} className={inputCls} />
      </label>
      {!consented && (
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input type="checkbox" name="consent" /> Lead agreed to be contacted on WhatsApp
        </label>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={btnCls}>{pending ? "Saving…" : "Save"}</button>
        {state.error && <p className="text-xs text-danger-500">{state.error}</p>}
        {state.ok && <p className="text-xs text-green-700">Saved</p>}
      </div>
    </form>
  );
}
