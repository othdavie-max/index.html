"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createLead } from "@/lib/crm/actions";
import { PAYMENT_PREFERENCES, PHONE_COUNTRIES, PURCHASE_PURPOSES } from "@/lib/crm/constants";
import { btnCls, inputCls, labelCls } from "./ui";

type Opt = { id: string; name: string };

export function LeadForm({ sources, users }: { sources: Opt[]; users: Opt[] | null }) {
  const [state, action, pending] = useActionState(createLead, {});
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 sm:grid-cols-2">
      <label className={labelCls}>Name *<input name="full_name" required className={inputCls} autoFocus /></label>
      <label className={labelCls}>Phone *
        <div className="flex gap-2">
          <select name="country_code" className={`${inputCls} w-28`} aria-label="Phone country">
            {PHONE_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
          <input name="phone" required inputMode="tel" placeholder="0803 123 4567 or +234…" className={inputCls} />
        </div>
      </label>
      <label className={labelCls}>Source *
        <select name="source_id" required defaultValue="" className={inputCls}>
          <option value="" disabled>Choose a source…</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className={labelCls}>Email<input name="email" type="email" className={inputCls} /></label>
      <label className={labelCls}>Country<input name="country" className={inputCls} /></label>
      <label className={labelCls}>City<input name="city" className={inputCls} /></label>
      <label className={labelCls}>Project interest<input name="project_interest" className={inputCls} /></label>
      <label className={labelCls}>Budget range<input name="budget_range" className={inputCls} /></label>
      <label className={labelCls}>Payment preference
        <select name="payment_preference" defaultValue="" className={inputCls}>
          <option value="">—</option>{PAYMENT_PREFERENCES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className={labelCls}>Purpose
        <select name="purchase_purpose" defaultValue="" className={inputCls}>
          <option value="">—</option>{PURCHASE_PURPOSES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className={labelCls}>Timeline<input name="timeline" className={inputCls} /></label>
      <label className={labelCls}>Campaign<input name="campaign" className={inputCls} /></label>
      {users && (
        <label className={labelCls}>Assign to
          <select name="assigned_to" defaultValue="" className={inputCls}>
            <option value="">Me</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      )}
      <label className={`${labelCls} sm:col-span-2`}>Notes<textarea name="notes" rows={2} className={inputCls} /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={btnCls}>{pending ? "Saving…" : "Save lead"}</button>
        {state.error && <p className="text-xs text-danger-500">{state.error}</p>}
        {state.ok && <p className="text-xs text-green-700">Saved. <Link href={`/crm/leads/${state.message}`} className="underline">Open lead</Link></p>}
      </div>
    </form>
  );
}
