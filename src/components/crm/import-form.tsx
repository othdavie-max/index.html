"use client";

import { useActionState } from "react";
import { importLeads } from "@/lib/crm/actions";
import { LIST_ORIGINS, PHONE_COUNTRIES } from "@/lib/crm/constants";
import { btnCls, inputCls, labelCls } from "./ui";

type Opt = { id: string; name: string };

export function ImportForm({ sources, users }: { sources: Opt[]; users: Opt[] }) {
  const [state, action, pending] = useActionState(importLeads, {});
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 sm:grid-cols-2">
      <label className={`${labelCls} sm:col-span-2`}>CSV file * (needs a phone column; name, email, country, city, notes are picked up automatically)
        <input name="file" type="file" accept=".csv,text/csv" required className={inputCls} />
      </label>
      <label className={labelCls}>List name *<input name="list_name" required className={inputCls} /></label>
      <label className={labelCls}>Origin *
        <select name="origin" required defaultValue="" className={inputCls}>
          <option value="" disabled>Choose…</option>{LIST_ORIGINS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <label className={labelCls}>Source *
        <select name="source_id" required defaultValue={sources.find((s) => s.name === "Cold Call")?.id ?? ""} className={inputCls}>
          <option value="" disabled>Choose…</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className={labelCls}>Local numbers are from
        <select name="country_code" className={inputCls}>
          {PHONE_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </label>
      <label className={labelCls}>Assign to
        <select name="assigned_to" defaultValue="" className={inputCls}>
          <option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      <p className="text-xs text-ink-900/60 sm:col-span-2">Imported leads start with WhatsApp consent set to No. Numbers already in the system are skipped and listed below.</p>
      <div className="sm:col-span-2">
        <button disabled={pending} className={btnCls}>{pending ? "Importing…" : "Import"}</button>
        {state.error && <p className="mt-2 text-sm text-danger-500">{state.error}</p>}
        {state.ok && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
        {state.details && (
          <ul className="mt-2 list-disc pl-5 text-xs text-ink-900/70">{state.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
        )}
      </div>
    </form>
  );
}
