import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { createEvent } from "../engine/events";
import { ID_TEMPLATES, identityMonthly, identityVote, leftOut, representation, tension, ticket } from "../engine/identity";
import { stateShare } from "../engine/rival";
import { subRng } from "../../game/engine/rng";

const g = (seed: number, zone = "SW", faith = "christian") => { const s = newGame(seed, "T", { homeZone: zone, faith }); s.fin.treasury = 1e6; s.cap.pc = 100; s.staff.picked = true; return s; };
describe("faith and region", () => {
  it("your home region and faith move votes where they should", () => {
    const n = g(1, "NW", "muslim"), so = g(1, "SE", "christian");
    expect(identityVote(n, "NG-KN")).toBeGreaterThan(identityVote(so, "NG-KN") + 5);
    expect(identityVote(so, "NG-AN")).toBeGreaterThan(identityVote(n, "NG-AN") + 5);
    expect(stateShare(n, "NG-KN")).toBeGreaterThan(stateShare(so, "NG-KN"));
  });
  it("a same-faith, same-half ticket is costly; a balanced one helps", () => {
    const s = g(2, "NW", "muslim"); s.staff.vp = { ...(s.staff.vp ?? {} as never), id: "vp1", kind: "regional", name: "A", bio: "", skill: 50, loyalty: 60, integrity: 50, portrait: { skin: 1, hair: 1, style: 1, accent: 1 }, revealed: true, since: 0, zone: "NE", faith: "muslim" };
    const t1 = ticket(s)!; expect(t1.sameFaith).toBe(true); expect(t1.balancedRegion).toBe(false); const bad = identityVote(s, "NG-EN");
    s.staff.vp = { ...s.staff.vp!, zone: "SE", faith: "christian" }; const t2 = ticket(s)!; expect(t2.sameFaith).toBe(false); expect(t2.balancedRegion).toBe(true);
    expect(identityVote(s, "NG-EN")).toBeGreaterThan(bad + 4);
  });
  it("a zone with nobody at the top table is noticed and gets tense", () => {
    const s = g(3); const out = leftOut(s); const rep = representation(s); expect(Object.keys(rep).length).toBe(6);
    for (const m of Object.values(s.cabinet.members)) if (m) m.zone = "SW"; if (s.staff.cos) s.staff.cos.zone = "SW";
    expect(leftOut(s).length).toBeGreaterThan(out.length - 1); expect(leftOut(s).length).toBeGreaterThanOrEqual(4);
    const e0 = tension(s).eth; for (let i = 0; i < 12; i++) { s.month++; identityMonthly(s, subRng(3, "i", i)); for (const e of s.events) e.status = "resolved"; }
    expect(tension(s).eth).toBeGreaterThan(e0); expect(s.events.some((e) => e.tpl === "idLopsided")).toBe(true);
  });
  it("every faith and region event can be answered every way", () => {
    for (const t of ID_TEMPLATES) for (const o of t.options) for (const ok of [true, false]) { const s = g(4); const e = createEvent(s, t.id, "NG-FC")!; expect(e, t.id).toBeTruthy(); const r = respond(s, e.id, o.id, ok); expect(r.message.length, `${t.id}/${o.id}`).toBeGreaterThan(8); }
  });
  it("high tension brings crises over time, and a long game stays stable", () => {
    const s = g(5); s.flags.relTension = 75; s.flags.ethTension = 75; s.sec.index = 70; const seen = new Set<string>();
    for (let i = 0; i < 60; i++) { s.month++; s.flags.relTension = 75; s.flags.ethTension = 75; identityMonthly(s, subRng(5, "c", i)); for (const e of s.events) { seen.add(e.tpl); e.status = "resolved"; } }
    expect([...seen].filter((x) => x.startsWith("id")).length).toBeGreaterThanOrEqual(3);
    const t = g(6); advanceMonths(t, 36); expect(t.month).toBeGreaterThan(20);
  });
});
