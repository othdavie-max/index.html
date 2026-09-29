"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookMeeting, recordOutcome } from "@/lib/crm/actions";
import type { SlotGroup } from "@/lib/crm/slots";
import { SlotPicker } from "./slot-picker";
import { inputCls } from "./ui";

const ONE_TAP = [
  ["no answer", "No answer", "bg-ink-900"],
  ["wrong number", "Wrong number", "bg-ink-900"],
  ["not interested", "Not interested", "bg-ink-900"],
  ["interested + WhatsApp consent", "Interested + WhatsApp OK", "bg-green-600"],
] as const;

export function CockpitActions({ leadId, nextLeadId, slotGroups }: { leadId: string; nextLeadId: string | null; slotGroups: SlotGroup[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"none" | "callback" | "meeting">("none");
  const [note, setNote] = useState("");
  const [callback, setCallback] = useState("");
  const [slot, setSlot] = useState("");
  const [format, setFormat] = useState("video");
  const [error, setError] = useState("");

  // After a result, jump to the next lead in the queue.
  function done() {
    setMode("none"); setNote(""); setCallback(""); setSlot("");
    router.push(nextLeadId ? `/crm/cockpit?lead=${nextLeadId}` : "/crm/cockpit");
    router.refresh();
  }
  function run(fn: () => Promise<{ error?: string }>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error); else done();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Call note (optional)" className={inputCls} />
      <div className="grid grid-cols-2 gap-2">
        {ONE_TAP.map(([key, label, bg]) => (
          <button key={key} disabled={pending} onClick={() => run(() => recordOutcome(leadId, key, { note }))}
            className={`${bg} rounded-xl px-3 py-3 text-sm font-medium text-white disabled:opacity-60`}>{label}</button>
        ))}
        <button disabled={pending} onClick={() => setMode(mode === "callback" ? "none" : "callback")} className="rounded-xl bg-amber-600 px-3 py-3 text-sm font-medium text-white">Callback requested</button>
        <button disabled={pending} onClick={() => setMode(mode === "meeting" ? "none" : "meeting")} className="rounded-xl bg-gold-500 px-3 py-3 text-sm font-medium text-white">Meeting booked</button>
      </div>

      {mode === "callback" && (
        <div className="flex gap-2">
          <input type="datetime-local" value={callback} onChange={(e) => setCallback(e.target.value)} className={inputCls} aria-label="Callback time" />
          <button disabled={pending || !callback} onClick={() => run(() => recordOutcome(leadId, "callback requested", { note, callbackAt: new Date(callback).toISOString() }))}
            className="rounded-xl bg-ink-900 px-4 text-sm text-white disabled:opacity-60">Save</button>
        </div>
      )}

      {mode === "meeting" && (
        <div className="rounded-xl border border-ink-900/10 bg-white p-3">
          <SlotPicker groups={slotGroups} value={slot} onChange={setSlot} />
          {slotGroups.length > 0 && (
            <div className="mt-3 flex gap-2">
              <select value={format} onChange={(e) => setFormat(e.target.value)} className={inputCls} aria-label="Meeting format">
                <option value="video">Video</option><option value="in person">In person</option><option value="phone">Phone</option>
              </select>
              <button disabled={pending || !slot} onClick={() => run(() => bookMeeting(leadId, slot, format, note))}
                className="rounded-xl bg-ink-900 px-4 text-sm text-white disabled:opacity-60">Book</button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}
