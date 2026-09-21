import { destinations } from "@/data/destinations";

// Lightweight static fallback for reduced-motion, small screens, or when the
// WebGL globe fails/hasn't loaded yet — no canvas, no JS animation loop.
export function GlobeFallback() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(224,58,62,0.35),transparent_55%),radial-gradient(circle_at_65%_70%,rgba(20,52,107,0.9),rgba(5,14,36,1)_70%)] shadow-[0_0_80px_-10px_rgba(224,58,62,0.4)]" />
      <div className="relative grid grid-cols-3 gap-3 p-8">
        {destinations.map((d) => (
          <span
            key={d.code}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl backdrop-blur-sm"
            aria-label={d.name}
          >
            {d.flag}
          </span>
        ))}
      </div>
    </div>
  );
}
