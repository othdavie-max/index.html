/** A stable portrait for anyone who has no hand-made one (foreign leaders, Naija X accounts), derived from their id. */
export function faceFor(id: string, skinBias = 0): import("../engine/types").Portrait {
  let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const female = ((h >>> 3) & 3) === 0;
  return { skin: skinBias >= 3 ? 2 + (h % 4) : skinBias === 1 ? 1 + (h % 3) : h % 6, hair: (h >>> 5) % 4, style: female ? [2, 4, 6][(h >>> 9) % 3] : [0, 1, 3, 5, 7][(h >>> 9) % 5], accent: (h >>> 13) % 8, glasses: ((h >>> 16) % 5) === 0 ? 1 + ((h >>> 18) % 2) : 0, beard: female ? 0 : (h >>> 20) % 3, outfit: (h >>> 22) % 4, wear: female && ((h >>> 24) % 3 === 0) ? 2 : 0 };
}
