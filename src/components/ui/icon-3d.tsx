import Image from "next/image";
import { cn } from "@/lib/utils";

// Glossy 3D icons from Microsoft Fluent Emoji (assets/*/3D), stored locally
// under public/icons/3d — see ATTRIBUTIONS.md. Decorative by default.
export type Icon3DName =
  | "compass"
  | "graduation-cap"
  | "open-book"
  | "passport-control"
  | "speaking-head"
  | "bullseye"
  | "money-bag"
  | "spiral-calendar"
  | "trophy"
  | "shield"
  | "sparkling-heart"
  | "handshake"
  | "speech-balloon"
  | "globe-europe-africa"
  | "page-facing-up"
  | "office-building"
  | "video-camera"
  | "telephone-receiver"
  | "check-mark-button"
  | "cross-mark"
  | "outbox-tray"
  | "world-map"
  | "memo"
  | "airplane-departure";

export function Icon3D({
  name,
  size = 56,
  alt = "",
  className,
}: {
  name: Icon3DName;
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/3d/${name}.webp`}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={size}
      height={size}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}

// A soft rounded tile behind an Icon3D, used on service/value/tool/step cards.
export function Icon3DTile({
  name,
  size = 56,
  tileSize = 72,
  alt = "",
  className,
}: {
  name: Icon3DName;
  size?: number;
  tileSize?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      style={{ width: tileSize, height: tileSize }}
      className={cn(
        "flex items-center justify-center rounded-2xl bg-[#F5EDE4] shadow-[0_6px_16px_-6px_rgba(42,24,16,0.25)] transition-all duration-300",
        "motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:shadow-[0_12px_24px_-8px_rgba(42,24,16,0.3)]",
        className,
      )}
    >
      <Icon3D name={name} size={size} alt={alt} />
    </div>
  );
}
