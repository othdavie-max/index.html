"use client";
/** Visiting another country: its map, its leader, and what you can ask for. */
import { Button, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { ARCH, ASKS, MEET_MIN, TRIP_COST, TRIP_PC, askBlock, chance, flyHome, leaderOf, negotiate, respect, travel, tripBlock, word } from "../engine/diplomacy";
import { W, league } from "../engine/world";
import { nb } from "../engine/util";
import { sfx } from "./sound";

function hexCells(id: string, n = 26): { q: number; r: number }[] {
  let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const key = (q: number, r: number) => `${q},${r}`; const cells = [{ q: 0, r: 0 }]; const seen = new Set([key(0, 0)]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  while (cells.length < n) { const b = cells[Math.floor(rnd() * cells.length)]; const d = dirs[Math.floor(rnd() * 6)]; const q = b.q + d[0], r = b.r + d[1]; if (!seen.has(key(q, r))) { seen.add(key(q, r)); cells.push({ q, r }); } }
  return cells;
}
const heat = (v: number) => (v >= 70 ? "#34d399" : v >= 55 ? "#a3e635" : v >= 42 ? "#fbbf24" : v >= 30 ? "#fb923c" : "#ef4444");
function CountryMap({ id, stab, tech, slump, boom }: { id: string; stab: number; tech: number; slump: boolean; boom: boolean }) {
  const cells = hexCells(id); const S = 17; let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pts = cells.map((c, i) => ({ x: S * Math.sqrt(3) * (c.q + c.r / 2), y: S * 1.5 * c.r, v: stab * 0.45 + tech * 0.35 + 8 + (((h >> (i % 20)) & 7) - 3.5) * 4 + (slump ? -16 : 0) + (boom ? 9 : 0), cap: i === 0 }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); const x0 = Math.min(...xs) - S, y0 = Math.min(...ys) - S, w = Math.max(...xs) - x0 + S, hh = Math.max(...ys) - y0 + S;
  const hex = (x: number, y: number) => Array.from({ length: 6 }, (_, k) => { const a = (Math.PI / 180) * (60 * k - 30); return `${(x + (S - 1) * Math.cos(a)).toFixed(1)},${(y + (S - 1) * Math.sin(a)).toFixed(1)}`; }).join(" ");
  return (
    <svg viewBox={`${x0} ${y0} ${w} ${hh}`} className="fx-vmap" role="img" aria-label="Regional health of the country, green is healthy">
      {pts.map((p, i) => <polygon key={i} points={hex(p.x, p.y)} fill={heat(p.v)} stroke="#0b1f36" strokeOpacity={0.35} strokeWidth={0.8} />)}
      {pts.filter((p) => p.cap).map((p, i) => <text key={i} x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14">★</text>)}
    </svg>
  );
}
const face = (r: number) => (r >= 0.75 ? "😍" : r >= 0.55 ? "🙂" : r >= 0.35 ? "😐" : r >= MEET_MIN ? "😒" : "🙄");

export function VisitModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useS();
  const { act, tx } = useFix();
  const w = W(s); const c = w.c.find((x) => x.id === id);
  if (!c) return null;
  const row = league(s).find((r) => r.id === id)!;
  const L = leaderOf(s, c); const R = respect(s, c); const here = w.at === id; const invited = w.invites.includes(id);
  const block = tripBlock(s, id);
  return (
    <Modal title={<>{c.flag} {c.name}</>} wide onClose={onClose}>
      <div className="fx-visit">
        <div className="g-col" style={{ gap: 8 }}>
          <CountryMap id={c.id} stab={c.stab} tech={c.tech} slump={!!c.slump} boom={!!c.boom} />
          <div className="g-tiny g-muted">Each hex is a region. Green is doing well, red is struggling. ★ is the capital.</div>
          <div className="fx-vnums">
            <div><span className="g-tiny g-muted">GDP</span><b>{c.gdp >= 1000 ? `$${(c.gdp / 1000).toFixed(1)}tn` : `$${Math.round(c.gdp)}bn`}</b></div>
            <div><span className="g-tiny g-muted">Growth</span><b>{c.g.toFixed(1)}%</b></div>
            <div><span className="g-tiny g-muted">Military</span><b>{Math.round(c.mil)}</b></div>
            <div><span className="g-tiny g-muted">Tech</span><b>{Math.round(c.tech)}</b></div>
            <div><span className="g-tiny g-muted">Influence</span><b>{Math.round(c.inf)}</b></div>
            <div><span className="g-tiny g-muted">Stability</span><b>{Math.round(c.stab)}</b></div>
          </div>
          <div className="g-small">{tx(c.blurb)} <b>{row.trendText}.</b> Ranked #{row.rank} in the world.</div>
        </div>
        <div className="g-col" style={{ gap: 10 }}>
          <div className="fx-leader">
            <div style={{ fontSize: 30 }} aria-hidden>{ARCH[L.arch].icon}</div>
            <div className="g-grow"><b>{L.title} {L.name}</b><div className="g-tiny g-muted">{ARCH[L.arch].label}. {tx(ARCH[L.arch].wants)}</div></div>
            <div style={{ fontSize: 28 }} aria-label={word(R)}>{face(R)}</div>
          </div>
          <div className="g-small"><b>{word(R)}.</b> {R < MEET_MIN ? tx(ARCH[L.arch].poor[0]) : `Relationship ${Math.round(c.rel)}/100.`}</div>
          {!here ? (
            <div className="g-col" style={{ gap: 6 }}>
              {invited && <div className="g-small" style={{ color: "#047857" }}>✉️ They invited you. The trip is free and they will be warmer.</div>}
              <Button variant="primary" disabled={!!block} onClick={() => { sfx("fanfare"); act((g) => travel(g, id)); }}>{invited ? "Accept the invitation" : `Fly there ⚡${TRIP_PC} · ${nb(TRIP_COST)}`}</Button>
              {block && <div className="g-tiny" style={{ color: "#92400e" }}>{block}</div>}
              {!block && R < MEET_MIN && !invited && <div className="g-tiny" style={{ color: "#92400e" }}>They may not even see you right now. The trip would be wasted. Build Nigeria up first.</div>}
            </div>
          ) : (
            <div className="g-col" style={{ gap: 6 }}>
              <div className="g-section-title">What you can ask for</div>
              {ASKS.map((a) => {
                const b = askBlock(s, c, a); const p = chance(s, c, a); const cost = a.cost(s, c);
                return (
                  <div key={a.id} className="fx-ask" data-blocked={b ? "1" : undefined}>
                    <span style={{ fontSize: 22 }} aria-hidden>{a.icon}</span>
                    <div className="g-grow"><b className="g-small">{a.title}</b><div className="g-tiny g-muted">{tx(a.blurb)}</div>{b ? <div className="g-tiny" style={{ color: "#92400e" }}>{b}</div> : <div className="g-tiny g-muted">{p >= 0.6 ? "Good odds" : p >= 0.35 ? "Even odds" : "Long shot"}{cost ? ` · ${nb(cost)}` : ""}</div>}</div>
                    <Button size="sm" disabled={!!b} onClick={() => { sfx("tap"); act((g) => negotiate(g, id, a.id)); }}>Ask</Button>
                  </div>
                );
              })}
              <Button onClick={() => { sfx("tap"); act(flyHome, { silent: true }); onClose(); }}>Fly home</Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
