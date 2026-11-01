import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import map from "../data/worldMap.json";
import { W, saveW, worldMonthly, league } from "../engine/world";
import { answer, inbox, worldLifeMonthly } from "../engine/worldlife";
import { BODIES, PATHS, RESOLUTIONS, bodyBlock, campaign, holds, propose, resBlock, supporters, unMonthly } from "../engine/un";
import { SANDBOX_TOOLS, isSandbox } from "../engine/sandbox";
import { FixSaves, MemoryBackend } from "../persistence";
import { subRng } from "../../game/engine/rng";

const boom = (s: ReturnType<typeof newGame>) => { s.eco.gdpIdx = 900; s.eco.fx = 300; s.eco.priceLevel = 220; s.mil.strength = 85; s.jobs.skills = 85; s.soc.education = 85; s.jobs.productivity = 160; s.foreign.rel = { imf: 80, china: 80, usa: 80, ecowas: 80 }; s.rule.democracy = 85; };
const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.month = 12; s.staff.picked = true; return s; };
const friends = (s: ReturnType<typeof newGame>, rel = 90) => { const w = W(s); for (const c of w.c) c.rel = rel; saveW(s, w); };

describe("the world map", () => {
  it("has real shapes for every league country", () => {
    const ids = new Set(map.c.map((c) => c.id).filter(Boolean)); const s = newGame(1);
    for (const r of league(s)) expect(ids.has(r.id), r.id).toBe(true);
    expect(map.c.length).toBeGreaterThan(150); for (const c of map.c) expect(c.d.startsWith("M")).toBe(true);
  });
});

describe("the world talks back", () => {
  it("countries send requests; helping costs money and wins friends, ignoring them costs goodwill", () => {
    const s = rich(8001); boom(s);
    for (let i = 0; i < 80 && !inbox(s).some((m) => m.kind === "aid" && !m.done); i++) { s.month++; worldLifeMonthly(s, subRng(8001, "r", i)); }
    const m = inbox(s).find((x) => x.kind === "aid" && !x.done)!; expect(m).toBeTruthy(); const c0 = W(s).c.find((c) => c.id === m.from)!.rel; const cash = s.fin.treasury;
    expect(answer(s, m.id, "give").ok).toBe(true); expect(s.fin.treasury).toBe(cash - m.amount!); expect(W(s).c.find((c) => c.id === m.from)!.rel).toBeGreaterThan(c0);
    expect(answer(s, m.id, "give").ok).toBe(false);
    for (let i = 0; i < 200 && !inbox(s).some((x) => x.outcome === "You never replied."); i++) { s.month++; worldLifeMonthly(s, subRng(8002, "r", i)); }
    expect(inbox(s).some((x) => x.outcome === "You never replied.")).toBe(true);
  });
  it("every kind of request can be answered every way", () => {
    for (const kind of ["aid", "loan", "troops", "vote", "refugees"]) {
      const s = rich(8003); boom(s); let found = false;
      for (let i = 0; i < 400 && !found; i++) { s.month++; worldLifeMonthly(s, subRng(8003, kind, i)); const m = inbox(s).find((x) => x.kind === kind && !x.done); if (m) { found = true; for (const o of m.options!) { const t = rich(8004); t.flags.inbox = JSON.stringify([m]); t.flags.world = s.flags.world; const r = answer(t, m.id, o.id); expect(r.ok, `${kind}/${o.id}`).toBe(true); expect(r.message.length).toBeGreaterThan(5); } } }
      expect(found, kind).toBe(true);
    }
  });
  it("loans come back with interest or default, and the world has its own news", () => {
    const s = rich(8005); s.flags.wloans = JSON.stringify([{ id: "gh", amount: 100, due: 13, from: "Ghana" }]); const cash = s.fin.treasury;
    s.month = 14; worldLifeMonthly(s, subRng(1, "l", 1)); expect(inbox(s).some((m) => /repays|cannot repay/.test(m.title))).toBe(true); expect(s.fin.treasury === cash || s.fin.treasury > cash).toBe(true);
    for (let i = 0; i < 30; i++) { s.month++; worldLifeMonthly(s, subRng(8005, "n", i)); } expect(s.news.some((n) => n.source.startsWith("wnews:"))).toBe(true);
  });
  it("a leader calls when you pass them", () => {
    const s = rich(8006); worldMonthly(s, subRng(1, "w", 0)); boom(s); for (let i = 0; i < 3; i++) { s.month++; worldMonthly(s, subRng(1, "w", i + 1)); }
    worldLifeMonthly(s, subRng(1, "c", 1)); expect(inbox(s).some((m) => /A call from/.test(m.title))).toBe(true);
  });
});

describe("the world stage", () => {
  it("seats are won by votes: few friends lose, many friends win", () => {
    const s = rich(8010); boom(s); friends(s, 20); expect(supporters(s)).toBe(0); const r = campaign(s, "g20"); expect(r.message).toMatch(/Defeat/); expect(bodyBlock(s, BODIES[0])).toMatch(/lost a vote/);
    const t = rich(8011); boom(t); friends(t); expect(campaign(t, "g20").message).toMatch(/Victory/); expect(holds(t, "g20")).toBe(true); expect(bodyBlock(t, BODIES[0])).toMatch(/Already/);
  });
  it("resolutions need a Council seat, and reform opens the permanent seat", () => {
    const s = rich(8012); boom(s); friends(s); const reform = RESOLUTIONS.find((r) => r.id === "reform")!; expect(resBlock(s, reform)).toMatch(/Security Council seat/);
    expect(campaign(s, "unsc").message).toMatch(/Victory/); expect(resBlock(s, reform)).toBeNull();
    const p5 = BODIES.find((b) => b.id === "p5")!; expect(bodyBlock(s, p5)).toMatch(/reformed/);
    for (let k = 0; k < 6 && !s.flags.unReform; k++) { delete (s.flags as Record<string, unknown>)["rescd:reform"]; propose(s, "reform"); s.month++; }
    expect(s.flags.unReform).toBeTruthy(); expect(bodyBlock(s, p5)).toBeNull(); expect(campaign(s, "p5").message).toMatch(/Victory/);
    unMonthly(s); expect(s.flags["victory:diplo"]).toBeTruthy(); expect(s.news.some((n) => /VICTORY: Diplomatic giant/.test(n.headline))).toBe(true);
  });
  it("every victory path reports progress between 0 and 100", () => { const s = rich(8013); for (const p of PATHS) { const v = p.progress(s); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); } });
});

describe("regressions", () => {
  it("answers that change how a rival feels are kept", async () => {
    const { createEvent } = await import("../engine/events"); const { respond } = await import("../engine/actions");
    const s = rich(8030); boom(s); s.flags.lateRival = "cn"; const r0 = W(s).c.find((c) => c.id === "cn")!.rel;
    const e = createEvent(s, "lateCyber", "NG-FC")!; respond(s, e.id, "blame", true as never); expect(W(s).c.find((c) => c.id === "cn")!.rel).toBeLessThan(r0);
    const t = rich(8031); boom(t); friends(t, 55); expect(campaign(t, "unsc").ok).toBe(true); const poor = W(t).c.filter((c) => c.gdp < 1000).map((c) => c.id);
    friends(t, 95); campaign(t, "unsc"); const before = W(t).c.filter((c) => poor.includes(c.id)).map((c) => c.rel);
    for (let k = 0; k < 8 && !t.news.some((n) => /passes Nigeria's resolution: Debt/.test(n.headline)); k++) { delete (t.flags as Record<string, unknown>)["rescd:debt"]; propose(t, "debt"); t.month++; }
    if (t.news.some((n) => /passes Nigeria's resolution: Debt/.test(n.headline))) expect(W(t).c.filter((c) => poor.includes(c.id)).some((c, i) => c.rel > before[i] || c.rel === 100)).toBe(true);
  });
  it("a successor is not thrown out in their first months", async () => {
    const { continueNigeria, successors } = await import("../engine/succession"); const { finishTerm } = await import("../engine/legacy");
    const s = rich(8032); s.rule.streetAnger = 99; s.rule.uprising = 6; s.gov.approval = 3; s.flags.primarySeen = 1; delete s.flags.primary;
    finishTerm(s, "removed", "test", "uprising"); s.done = true; expect(continueNigeria(s, successors(s)[0].id).ok).toBe(true);
    for (let i = 0; i < 6; i++) { s.rule.streetAnger = 99; s.gov.approval = 3; advanceMonths(s, 1); } expect(s.ended).toBeNull();
  });
});

describe("sandbox and saves", () => {
  it("sandbox starts rich, open and with no term limits, and its tools work", () => {
    const a = newGame(8020); const s = newGame(8020, "Test", { sandbox: true });
    expect(isSandbox(s)).toBe(true); expect(s.fin.treasury).toBeCloseTo(a.fin.treasury * 4); expect(s.cap.legacy).toBe(true); expect(s.cap.pc).toBe(100); expect(s.cap.unlocked.length).toBeGreaterThan(a.cap.unlocked.length);
    const cash = s.fin.treasury; SANDBOX_TOOLS[0].run(s); expect(s.fin.treasury).toBe(cash + 1000); for (const t of SANDBOX_TOOLS) expect(t.run(s).length).toBeGreaterThan(5);
  });
  it("every autosave keeps the previous one as a backup", async () => {
    const saves = new FixSaves(new MemoryBackend()); const s = newGame(8021); s.month = 3; await saves.save("auto", s); expect(await saves.backup()).toBeNull();
    s.month = 7; await saves.save("auto", s); expect((await saves.backup())!.month).toBe(3);
  });
  it("a long game with all of this stays stable", () => { const s = newGame(8022); s.fin.treasury = 1e7; s.staff.picked = true; s.flags.primarySeen = 1; delete s.flags.primary; boom(s); for (let y = 0; y < 6; y++) { for (const e of s.events) e.status = "resolved"; boom(s); advanceMonths(s, 12); } expect(inbox(s).length).toBeGreaterThan(0); });
});
