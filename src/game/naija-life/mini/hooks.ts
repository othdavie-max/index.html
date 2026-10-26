import { useEffect, useRef } from "react";

/** Calls `cb(dt, elapsed)` on every animation frame while `active` is true. */
export function useFrame(cb: (dt: number, elapsed: number) => void, active = true) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; });
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    let last = start;
    const loop = (t: number) => {
      ref.current(Math.min(0.05, (t - last) / 1000), (t - start) / 1000);
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const rint = (a: number, b: number) => Math.floor(rnd(a, b + 1));
export const pickOne = <X,>(a: X[]): X => a[Math.floor(Math.random() * a.length)];
export function shuffle<X>(a: X[]): X[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
