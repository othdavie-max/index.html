/** A stable portrait for anyone who has no hand-made one (foreign leaders, Naija X accounts), derived from their id. */
export function faceFor(id: string, skinBias = 0): { skin: number; hair: number; style: number; accent: number } {
  let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return { skin: skinBias >= 3 ? 2 + (h % 4) : skinBias === 1 ? 1 + (h % 3) : h % 6, hair: (h >>> 5) % 4, style: (h >>> 9) % 4, accent: (h >>> 13) % 5 };
}
