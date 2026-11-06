/** True on phones that are short on graphics power or memory (touch screen, 4 GB or less, or six cores or fewer). The game then starts on the flat map and drops the pulsing and glowing effects. */
let cached: boolean | null = null;
export function isLite(): boolean {
  if (cached !== null) return cached;
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
    const fewCores = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 6;
    cached = touch && (lowMem || fewCores);
  } catch { cached = false; }
  return cached;
}
