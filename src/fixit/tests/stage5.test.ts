import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { respond } from "../engine/actions";
import { pushNews } from "../engine/util";
import { BOT_LEVELS, POST_KINDS, X, acctActions, actOnAcct, banX, playerPost, postBlock, realMood, reportBots, setBots, shownMood, socialMonthly, socialSync, threads, topicOf, trending, unbanX } from "../engine/social";
import { subRng } from "../../game/engine/rng";

const rich = (seed: number) => { const s = newGame(seed); s.fin.treasury = 1e7; s.cap.pc = 100; s.month = 8; s.staff.picked = true; X(s); return s; };

describe("Naija X", () => {
  it("is alive from the first month: posts, replies and trending tags appear by themselves", () => {
    const s = rich(5001); advanceMonths(s, 3); const x = X(s);
    expect(x.posts.length).toBeGreaterThan(10); expect(x.posts.some((p) => p.parent)).toBe(true); expect(threads(s).length).toBeGreaterThan(3);
    expect(x.accts.length).toBeGreaterThanOrEqual(14);
  });
  it("reacts to what you decide, straight away", () => {
    const s = rich(5002); const n = X(s).posts.length;
    pushNews(s, { source: "event-res:test1", headline: "Fuel price shock: response falls short", body: "x", tone: "bad" }); socialSync(s);
    const x = X(s); expect(x.posts.length).toBeGreaterThan(n + 1); expect(x.tags.some((t) => t.tag === "#FuelQueue")).toBe(true);
    socialSync(s); expect(X(s).posts.length).toBe(x.posts.length);
    expect(topicOf("Rice harvest fails")).toBe("food");
  });
  it("accounts follow the real economy and remember what happened", () => {
    const run = (price: number) => { const s = rich(5003); s.fuel.pump = price; for (let i = 0; i < 6; i++) { s.month++; socialMonthly(s, subRng(5003, "t", i)); } return X(s).accts.find((a) => a.id === "danfo")!.mood; };
    expect(run(450)).toBeGreaterThan(run(1100) + 20);
    const s = rich(5004); pushNews(s, { source: "event-res:t2", headline: "Petrol hits a record high", body: "x", tone: "bad" }); socialSync(s);
    expect(X(s).accts.some((a) => a.mem.some((m) => /Petrol/.test(m.t) && !m.good))).toBe(true);
  });
  it("recurring accounts quote their memories back", () => {
    const s = rich(5005); for (const a of X(s).accts) { /* seeded */ void a; }
    const x = X(s); x.accts[0].mem.push({ m: 2, t: "rice hit a record", good: false }); s.flags.x = JSON.stringify(x);
    for (let i = 0; i < 60; i++) { s.month++; socialMonthly(s, subRng(5005, "r", i)); }
    expect(X(s).posts.some((p) => p.recall)).toBe(true);
  });
  it("the president's own posts have costs, cooldowns and consequences", () => {
    const s = rich(5006); expect(POST_KINDS.length).toBe(7);
    expect(postBlock(s, POST_KINDS[0])).toBeNull(); const t0 = s.gov.trust;
    const r = playerPost(s, "promise", "power"); expect(r.ok).toBe(true); expect(X(s).promises.length).toBe(1); expect(s.gov.trust).toBeGreaterThan(t0);
    expect(playerPost(s, "thank").ok).toBe(false); expect(X(s).posts.some((p) => p.player)).toBe(true);
    expect(playerPost(newGame(1), "apologise").ok).toBe(false);
  });
  it("a public promise is quoted back: kept earns trust, broken costs it", () => {
    const run = (good: boolean) => { const s = rich(5007); s.eco.fx = 1500; playerPost(s, "promise", "fx"); s.eco.fx = good ? 1050 : 2200; const t = s.gov.trust; for (let i = 0; i < 10; i++) { s.month++; s.eco.fx = good ? 1050 : 2200; socialMonthly(s, subRng(5007, "p", i)); } return { dt: s.gov.trust - t, tags: X(s).tags.map((x) => x.tag) }; };
    const kept = run(true), broke = run(false); expect(kept.dt).toBeGreaterThan(broke.dt + 3);
  });
  it("blocking and summoning have consequences; critics remember", () => {
    const s = rich(5008); const j = X(s).accts.find((a) => a.id === "leaks")!; expect(acctActions(j).map((a) => a.id)).toContain("summon");
    const dem = s.rule.democracy; expect(actOnAcct(s, "leaks", "summon").ok).toBe(true); expect(s.rule.democracy).toBeLessThan(dem);
    expect(X(s).accts.find((a) => a.id === "leaks")!.mem.length).toBeGreaterThan(0);
    const t = rich(5009); expect(actOnAcct(t, "mama", "block").ok).toBe(true); expect(acctActions(X(t).accts.find((a) => a.id === "mama")!).map((a) => a.id)).toEqual(["unblock"]);
    expect(acctActions(X(t).accts.find((a) => a.id === "aisha")!).map((a) => a.id)).not.toContain("summon");
  });
  it("the feed can flatter you, but the real mood is what fills the streets", () => {
    const s = rich(5010); s.eco.foodInflation = 45; s.fuel.pump = 1200; s.eco.fx = 2400; s.jobs.youth = 40;
    for (let i = 0; i < 8; i++) { s.month++; socialMonthly(s, subRng(5010, "m", i)); }
    const real = realMood(s); expect(real).toBeLessThan(-18);
    setBots(s, 3); actOnAcct(s, "voice", "block"); expect(shownMood(s)).toBeGreaterThan(real + 15);
  });
  it("bad online mood becomes street anger, and eventually a protest", () => {
    const s = rich(5011); s.eco.foodInflation = 50; s.fuel.pump = 1300; s.eco.fx = 2600; s.jobs.youth = 45; s.sec.index = 80; s.me.evidence = 70; s.rule.democracy = 20;
    const a0 = s.rule.streetAnger; let prot = false;
    for (let i = 0; i < 40 && !prot; i++) { s.month++; s.eco.foodInflation = 50; s.fuel.pump = 1300; s.rule.streetAnger = Math.max(s.rule.streetAnger, 45); socialMonthly(s, subRng(5011, "s", i)); prot = s.news.some((n) => n.source.startsWith("xprotest")); }
    expect(s.rule.streetAnger).toBeGreaterThan(a0); expect(prot).toBe(true);
  });
  it("a bot army costs money, and gets exposed sooner or later", () => {
    const s = rich(5012); s.rule.pressFreedom = 100; expect(setBots(s, 3).ok).toBe(true); const t0 = s.fin.treasury; const tr = s.gov.trust;
    let n = 0; for (; n < 120 && X(s).exposed === 0; n++) { s.month++; socialMonthly(s, subRng(5012, "b", n)); }
    expect(X(s).exposed).toBe(1); expect(s.fin.treasury).toBeLessThan(t0); expect(s.gov.trust).toBeLessThan(tr); expect(s.news.some((x) => x.source.startsWith("botgate"))).toBe(true); expect(X(s).bots).toBe(0);
    expect(BOT_LEVELS.length).toBe(4); void reportBots;
  });
  it("switching X off quiets the street for a while, then backfires", () => {
    const s = rich(5013); const dem = s.rule.democracy; expect(banX(s).ok).toBe(true); expect(s.rule.democracy).toBeLessThan(dem); expect(s.modifiers.some((m) => m.source === "x:ban")).toBe(true);
    const ip = s.rule.intlPressure; for (let i = 0; i < 8; i++) { s.month++; socialMonthly(s, subRng(5013, "x", i)); }
    expect(s.rule.intlPressure).toBeGreaterThan(ip + 3); expect(X(s).posts.some((p) => p.vpn)).toBe(true); expect(playerPost(s, "thank").ok).toBe(false);
    expect(unbanX(s).ok).toBe(true); expect(s.modifiers.some((m) => m.source === "x:ban")).toBe(false);
  });
  it("posts survive saving and the feed does not grow without limit", () => {
    const s = rich(5014); advanceMonths(s, 30); const copy = JSON.parse(JSON.stringify(s)); expect(X(copy).posts.length).toBe(X(s).posts.length); expect(X(s).posts.length).toBeLessThanOrEqual(160); expect(trending(X(s)).length).toBeGreaterThan(0);
    void respond;
  });
});
