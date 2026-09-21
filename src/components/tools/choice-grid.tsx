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
              ? "border-red-500 bg-red-500/5 ring-1 ring-red-500"
              : "border-navy-900/10 bg-white hover:border-navy-900/30",
          )}
        >
          <p className="font-medium text-navy-900">{opt.label}</p>
          {opt.description && <p className="mt-1 text-xs text-muted">{opt.description}</p>}
        </button>
      ))}
    </div>
  );
}
