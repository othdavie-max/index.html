import { cn } from "@/lib/utils";

// Old call sites still pass emphasis text with a trailing "." from the
// previous italic-emphasis design; strip it here so we don't double up
// with the accent period this component always renders. A trailing "?"
// or "!" is preserved as-is (no accent period appended after those).
function stripTrailingPeriod(text: string) {
  return text.replace(/\.+$/, "");
}

export function SectionHeading({
  eyebrow,
  title,
  emphasis,
  description,
  align = "left",
  dark = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  emphasis?: string;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
}) {
  const cleanTitle = stripTrailingPeriod(title);
  const cleanEmphasis = emphasis ? stripTrailingPeriod(emphasis) : undefined;
  const lastChar = (cleanEmphasis ?? cleanTitle).trim().slice(-1);
  const skipAccentPeriod = lastChar === "?" || lastChar === "!";

  return (
    <div className={cn(align === "center" ? "text-center mx-auto" : "text-left", "max-w-2xl", className)}>
      {eyebrow && (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">{eyebrow}</p>
          <span className={cn("mt-2 block h-[3px] w-8 rounded-full bg-gold-500", align === "center" && "mx-auto")} />
        </>
      )}
      <h2
        className={cn(
          "mt-4 font-display text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-tight",
          dark ? "text-white" : "text-ink-900",
        )}
      >
        {cleanTitle}
        {cleanEmphasis && <span className="text-gold-500"> {cleanEmphasis}</span>}
        {!skipAccentPeriod && <span className="text-gold-500">.</span>}
      </h2>
      {description && (
        <p className={cn("mt-5 text-base leading-relaxed md:text-lg", dark ? "text-white/70" : "text-muted")}>{description}</p>
      )}
    </div>
  );
}
