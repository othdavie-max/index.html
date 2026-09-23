import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stand-in for a real photo that hasn't been generated/uploaded yet.
 * Swap for a real <Image> once the asset exists — same rounded shape,
 * so layout doesn't shift when it's replaced.
 */
export function ImagePlaceholder({ label, className, dark = false }: { label: string; className?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-center",
        dark ? "border-white/20 bg-white/5 text-white/50" : "border-ink-900/15 bg-ink-100 text-muted",
        className,
      )}
    >
      <ImageIcon size={28} className="opacity-60" strokeWidth={1.5} />
      <p className="text-xs font-medium leading-snug">{label}</p>
    </div>
  );
}
