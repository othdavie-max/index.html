/** Real-calendar seasons. Only the browser sets this, so tests and saves stay deterministic. */
export interface LiveSeason { id: string; emoji: string; en: string; pcm: string; boost: Record<string, number> }
let LIVE: LiveSeason[] = [];

function hijri(d: Date): { m: number; d: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric", day: "numeric" }).formatToParts(d);
    const m = Number(parts.find((x) => x.type === "month")?.value);
    const day = Number(parts.find((x) => x.type === "day")?.value);
    return Number.isFinite(m) && Number.isFinite(day) ? { m, d: day } : null;
  } catch { return null; }
}

export function seasonsFor(d: Date): LiveSeason[] {
  const out: LiveSeason[] = [];
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 12) out.push({ id: "december", emoji: "🎄", en: "It's December: Detty December and Christmas in the village are live", pcm: "December don reach: Detty December and Christmas for village dey live", boost: { detty_december: 4, christmas_village: 4 } });
  if (m === 10 && day <= 6) out.push({ id: "independence", emoji: "🇳🇬", en: "Independence Day week", pcm: "Independence Day week", boost: { independence_day: 5 } });
  if (m >= 11 || m <= 2) out.push({ id: "harmattan", emoji: "🌫️", en: "Harmattan season", pcm: "Harmattan season", boost: { harmattan: 3 } });
  const h = hijri(d);
  if (h) {
    if (h.m === 9) out.push({ id: "ramadan", emoji: "🌙", en: "It's Ramadan", pcm: "Ramadan don reach", boost: { ramadan_fast: 5 } });
    if ((h.m === 10 && h.d <= 3) || (h.m === 12 && h.d >= 8 && h.d <= 13)) out.push({ id: "sallah", emoji: "🐏", en: "It's Sallah", pcm: "Sallah don reach", boost: { eid_sallah: 5 } });
  }
  return out;
}
export function setLiveSeason(d: Date | null) { LIVE = d ? seasonsFor(d) : []; }
export const liveSeasons = () => LIVE;
export const seasonBoost = (id: string): number => LIVE.reduce((m, s) => Math.max(m, s.boost[id] ?? 1), 1);
