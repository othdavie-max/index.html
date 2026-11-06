import type { ReactNode } from "react";

export interface Cat { id: string; label: string; icon: ReactNode; count?: number; badge?: number }

/** A row of big, icon-led category buttons that stays pinned at the top of a long list: tap one and only that part is shown. */
export function CategoryBar({ cats, value, onChange, label = "Category" }: { cats: Cat[]; value: string; onChange: (id: string) => void; label?: string }) {
  return (
    <div className="fx-catbar" role="tablist" aria-label={label}>
      {cats.map((c) => (
        <button key={c.id} role="tab" aria-selected={value === c.id} className="fx-cat" onClick={() => onChange(c.id)}>
          <span className="fx-cat-ic" aria-hidden>{c.icon}</span>
          <span className="fx-cat-tx">{c.label}</span>
          {c.count !== undefined && <i className="fx-cat-n">{c.count}</i>}
          {!!c.badge && <b className="fx-cat-badge" aria-label="in progress">{c.badge}</b>}
        </button>
      ))}
    </div>
  );
}
