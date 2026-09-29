"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markMeeting, rescheduleMeeting } from "@/lib/crm/actions";
import type { SlotGroup } from "@/lib/crm/slots";
import { SlotPicker } from "./slot-picker";
import { inputCls } from "./ui";

const STAGES_AFTER = ["Meeting Held", "Proposal Sent", "Negotiation", "Won", "Lost", "Nurture"];

export function MeetingActions({ meetingId, slotGroups }: { meetingId: string; slotGroups: SlotGroup[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"none" | "held" | "resched">("none");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState("Meeting Held");
  const [next, setNext] = useState("");
  const [slot, setSlot] = useState("");
  const [error, setError] = useState("");
  const closing = ["Won", "Lost", "Nurture"].includes(stage);

  function run(fn: () => Promise<{ error?: string }>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error); else { setMode("none"); router.refresh(); }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setMode(mode === "held" ? "none" : "held")} className="rounded-full bg-green-600 px-4 py-2 text-sm text-white">Mark held</button>
        <button disabled={pending} onClick={() => confirm("Mark as no-show? The lead goes back to Contacted with a follow-up tomorrow.") && run(() => markMeeting(meetingId, "no-show"))}
          className="rounded-full bg-danger-500 px-4 py-2 text-sm text-white disabled:opacity-60">No-show</button>
        <button onClick={() => setMode(mode === "resched" ? "none" : "resched")} className="rounded-full bg-amber-600 px-4 py-2 text-sm text-white">Reschedule</button>
      </div>

      {mode === "held" && (
        <div className="grid gap-2 rounded-xl border border-ink-900/10 bg-white p-3">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Outcome notes" className={inputCls} />
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls} aria-label="Lead stage after meeting">
            {STAGES_AFTER.map((s) => <option key={s}>{s}</option>)}
          </select>
          {!closing && <input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} aria-label="Next follow-up" />}
          <button disabled={pending || (!closing && !next)} onClick={() => run(() => markMeeting(meetingId, "held", { notes, stage, nextAt: next ? new Date(next).toISOString() : undefined }))}
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm text-white disabled:opacity-60">Save outcome</button>
        </div>
      )}

      {mode === "resched" && (
        <div className="rounded-xl border border-ink-900/10 bg-white p-3">
          <SlotPicker groups={slotGroups} value={slot} onChange={setSlot} />
          <button disabled={pending || !slot} onClick={() => run(async () => { const r = await rescheduleMeeting(meetingId, slot); if (r.ok && r.message) router.push(`/crm/meetings/${r.message}`); return r; })}
            className="mt-3 rounded-xl bg-ink-900 px-4 py-2 text-sm text-white disabled:opacity-60">Move meeting</button>
        </div>
      )}
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}
