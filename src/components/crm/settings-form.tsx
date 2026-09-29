"use client";

import { useActionState } from "react";
import { saveSettings } from "@/lib/crm/actions";
import type { Availability } from "@/lib/crm/slots";
import { btnCls, inputCls, labelCls } from "./ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SettingsForm({ script, av }: { script: string; av: Availability }) {
  const [state, action, pending] = useActionState(saveSettings, {});
  return (
    <form action={action} className="mt-4 grid gap-4 rounded-2xl border border-ink-900/10 bg-white p-4">
      <label className={labelCls}>Cold-call script (shown beside every call)
        <textarea name="call_script" rows={10} defaultValue={script} className={inputCls} />
      </label>
      <fieldset>
        <legend className="text-xs font-medium text-ink-900">Your available meeting days</legend>
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          {DAYS.map((d, i) => <label key={d} className="flex items-center gap-1"><input type="checkbox" name="days" value={i} defaultChecked={av.days.includes(i)} /> {d}</label>)}
        </div>
      </fieldset>
      <div className="grid grid-cols-3 gap-3">
        <label className={labelCls}>From<input type="time" name="start" defaultValue={av.start} className={inputCls} /></label>
        <label className={labelCls}>To<input type="time" name="end" defaultValue={av.end} className={inputCls} /></label>
        <label className={labelCls}>Slot length
          <select name="slot_minutes" defaultValue={av.slot_minutes} className={inputCls}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
        </label>
      </div>
      <p className="text-xs text-ink-900/60">Times are in the business time zone (CRM_TIMEZONE, default Asia/Dubai).</p>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnCls}>{pending ? "Saving…" : "Save"}</button>
        {state.error && <p className="text-xs text-danger-500">{state.error}</p>}
        {state.ok && <p className="text-xs text-green-700">Saved</p>}
      </div>
    </form>
  );
}
