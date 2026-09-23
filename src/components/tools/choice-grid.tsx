import { cn } from "@/lib/utils";

export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" }[columns];

  return (
    <div className={cn("grid gap-3", cols)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-200",
            value === opt.value
              ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500"
              : "border-ink-900/10 bg-white hover:border-ink-900/30",
          )}
        >
          <p className="font-medium text-ink-900">{opt.label}</p>
          {opt.description && <p className="mt-1 text-xs text-muted">{opt.description}</p>}
        </button>
      ))}
    </div>
  );
}
