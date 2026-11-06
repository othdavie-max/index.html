import { useState, type ReactNode } from "react";
import { CategoryBar } from "./CategoryBar";

export interface Section { id: string; label: string; icon: ReactNode; node: ReactNode; badge?: number }

/** Splits a long screen into a few icon-led sections: tap one and only that part is shown, so there is no endless scrolling. */
export function Sections({ items, label = "Section", initial }: { items: Section[]; label?: string; initial?: string }) {
  const [v, setV] = useState(initial ?? items[0]?.id ?? "");
  const cur = items.find((i) => i.id === v) ?? items[0];
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <CategoryBar label={label} value={cur?.id ?? ""} onChange={setV} cats={items.map((i) => ({ id: i.id, label: i.label, icon: i.icon, badge: i.badge }))} />
      {cur?.node}
    </div>
  );
}
