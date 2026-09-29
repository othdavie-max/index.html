"use client";

import { useState } from "react";
import type { SlotGroup } from "@/lib/crm/slots";

export function SlotPicker({ groups, value, onChange }: { groups: SlotGroup[]; value: string; onChange: (iso: string) => void }) {
  const [day, setDay] = useState(0);
  if (groups.length === 0) return <p className="text-sm text-ink-900/60">No open slots in the next 7 days.</p>;
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {groups.map((g, i) => (
          <button type="button" key={g.label} onClick={() => setDay(i)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${i === day ? "border-ink-900 bg-ink-900 text-white" : "border-ink-900/20"}`}>{g.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(groups[day]?.slots ?? []).map((s) => (
          <button type="button" key={s.iso} onClick={() => onChange(s.iso)}
            className={`rounded-lg border py-1.5 text-xs ${value === s.iso ? "border-gold-500 bg-gold-500 text-white" : "border-ink-900/20"}`}>{s.time}</button>
        ))}
      </div>
    </div>
  );
}
