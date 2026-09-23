import Image from "next/image";
import { cn } from "@/lib/utils";

// Round SVG flags from HatScripts/circle-flags, stored locally under
// public/flags — see ATTRIBUTIONS.md. Replaces emoji flags, which render
// as plain two-letter codes on Windows.
export function Flag({
  code,
  size = 20,
  alt = "",
  className,
}: {
  code: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={`/flags/${code.toLowerCase()}.svg`}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 rounded-full", className)}
      draggable={false}
      unoptimized
    />
  );
}
