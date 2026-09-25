import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiChoice<T extends string>({
  options,
  values,
  onChange,
  max,
}: {
  options: { value: T; label: string; description?: string }[];
  values: T[];
  onChange: (values: T[]) => void;
  max?: number;
}) {
  const atMax = max !== undefined && values.length >= max;

  return (
    <div>
      {max !== undefined && (
        <p className="mb-3 text-xs font-medium text-muted" aria-live="polite">
          {values.length} of {max} selected
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = values.includes(opt.value);
          const disabled = !selected && atMax;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? values.filter((v) => v !== opt.value) : [...values, opt.value])}
              className={cn(
                "flex min-h-[56px] items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                selected ? "border-gold-500 bg-gold-500/5 ring-1 ring-gold-500" : "border-ink-900/10 bg-white hover:border-ink-900/30",
                disabled && "cursor-not-allowed opacity-45 hover:border-ink-900/10",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  selected ? "border-gold-500 bg-gold-500 text-white" : "border-ink-900/25",
                )}
              >
                {selected && <Check size={13} strokeWidth={3} />}
              </span>
              <span>
                <span className="block font-medium text-ink-900">{opt.label}</span>
                {opt.description && <span className="mt-0.5 block text-xs text-muted">{opt.description}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
