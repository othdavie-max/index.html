"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  tabs,
  defaultTab,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[];
  defaultTab?: T;
  onChange?: (id: T) => void;
  className?: string;
}) {
  const [active, setActive] = useState<T>(defaultTab ?? tabs[0].id);

  function select(id: T) {
    setActive(id);
    onChange?.(id);
  }

  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => select(tab.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
            active === tab.id ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-900 hover:bg-ink-900/15",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
