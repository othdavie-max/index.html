import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { makeGame, advance, digest, diffKeys } from "./helpers";
import { SaveSystem, MemoryBackend } from "../persistence/saveSystem";
import { SAVE_FORMAT, SaveError, deserialise, serialise, summarise, validateState, type SaveEnvelope } from "../persistence/saveFormat";
import { SIM_VERSION } from "../engine/types";
import { perform } from "../engine/actions";
import type { GameState } from "../engine/types";

const clone = (s: GameState) => JSON.parse(JSON.stringify(s)) as GameState;

describe("save and load", () => {
  it("round-trips the complete state exactly", async () => {
    const s = makeGame({ seed: 5, startAge: 25, backgroundId: "political" });
    perform(s, { t: "joinParty", partyId: "PHP" });
    advance(s, 20, { keepAfloat: 150000 });
    const sys = new SaveSystem(new MemoryBackend());
    await sys.save("1", s);
    const loaded = await sys.load("1");
    expect(diffKeys(s as never, loaded as never)).toEqual([]);
    expect(digest(loaded)).toBe(digest(s));
    // key things the spec requires to survive
    expect(loaded.player.birthLgaId).toBe(s.player.birthLgaId);
    expect(loaded.player.finances.ledger.length).toBe(s.player.finances.ledger.length);
    expect(loaded.player.politics.membership?.partyId).toBe("PHP");
    expect(loaded.meta.seed).toBe(5);
    expect(loaded.clock.monthIndex).toBe(20);
    expect(Object.keys(loaded.lgas)).toHaveLength(774);
    expect(loaded.eventLog.length).toBe(s.eventLog.length);
    expect(loaded.electionLog.length).toBe(s.electionLog.length);
  });
  it("a loaded game continues exactly as the original would have", async () => {
    const s = makeGame({ seed: 6 });
    advance(s, 10, { keepAfloat: 100000 });
    const sys = new SaveSystem(new MemoryBackend());
    await sys.save("auto", s);
    const loaded = await sys.load("auto");
    advance(s, 14, { keepAfloat: 100000 });
    advance(loaded, 14, { keepAfloat: 100000 });
    expect(digest(loaded)).toBe(digest(s));
  });
  it("lists slots with a human-readable summary", async () => {
    const sys = new SaveSystem(new MemoryBackend());
    expect((await sys.list()).every((x) => x.empty)).toBe(true);
    const s = makeGame({ seed: 7 });
    advance(s, 2);
    await sys.save("2", s);
    const slots = await sys.list();
    const two = slots.find((x) => x.slot === "2")!;
    expect(two.empty).toBe(false);
    expect(two.summary!.name).toBe("Test Player");
    expect(two.summary!.dateLabel).toBe("Mar 2026");
    expect(slots.find((x) => x.slot === "1")!.empty).toBe(true);
  });
  it("deletes a slot", async () => {
    const sys = new SaveSystem(new MemoryBackend());
    await sys.save("3", makeGame());
    await sys.delete("3");
    expect((await sys.list()).find((x) => x.slot === "3")!.empty).toBe(true);
    await expect(sys.load("3")).rejects.toMatchObject({ kind: "missing" });
  });
  it("manual saves and autosave are independent slots", async () => {
    const sys = new SaveSystem(new MemoryBackend());
    const s = makeGame();
    await sys.save("auto", s);
    advance(s, 3);
    await sys.save("1", s);
    expect((await sys.load("auto")).clock.monthIndex).toBe(0);
    expect((await sys.load("1")).clock.monthIndex).toBe(3);
  });
});

describe("invalid and incompatible saves are handled safely", () => {
  const env = (s: GameState): SaveEnvelope => ({ format: SAVE_FORMAT, simVersion: SIM_VERSION, savedAt: 1, summary: summarise(s), state: s });
  it("rejects damaged JSON", () => {
    expect(() => deserialise("{not json")).toThrow(SaveError);
    try { deserialise("{not json"); } catch (e) { expect((e as SaveError).kind).toBe("corrupt"); }
  });
  it("rejects files that are not game saves", () => {
    expect(() => deserialise("null")).toThrow(SaveError);
    expect(() => deserialise(JSON.stringify({ hello: "world" }))).toThrow(/not a valid game save/);
  });
  it("rejects saves from a newer format or simulation version", () => {
    const e = env(makeGame());
    expect(() => deserialise(serialise({ ...e, format: SAVE_FORMAT + 1 }))).toThrow(/newer version/);
    try { deserialise(serialise({ ...e, simVersion: SIM_VERSION + 1 })); } catch (x) { expect((x as SaveError).kind).toBe("incompatible"); }
  });
  it("detects missing or inconsistent state", () => {
    const s = clone(makeGame());
    const broken = { ...s } as Record<string, unknown>;
    delete broken.economy;
    expect(validateState(broken as unknown as GameState).length).toBeGreaterThan(0);
    const fewer = clone(s);
    delete fewer.lgas[Object.keys(fewer.lgas)[0]];
    expect(validateState(fewer).join()).toMatch(/774/);
    const orphan = clone(s);
    orphan.seats["pres"].holderId = "c999999";
    expect(validateState(orphan).join()).toMatch(/holder missing/);
    expect(() => deserialise(serialise({ ...env(s), state: fewer }))).toThrow(SaveError);
  });
  it("migrates by filling in defaults and stamping the current version", () => {
    const s = clone(makeGame());
    const old = { ...s, meta: { ...s.meta, simVersion: SIM_VERSION } } as unknown as Record<string, unknown>;
    delete old.customParties; delete old.settings;
    const loaded = deserialise(JSON.stringify({ format: SAVE_FORMAT, simVersion: SIM_VERSION, savedAt: 1, summary: {}, state: old })).state;
    expect(loaded.customParties).toEqual({});
    expect(loaded.settings.autoSave).toBe(true);
    expect(loaded.meta.simVersion).toBe(SIM_VERSION);
  });
  it("a failed load never touches the caller's current game", async () => {
    const sys = new SaveSystem(new MemoryBackend());
    // plant a corrupt slot directly
    const backend = new MemoryBackend();
    await backend.set("save:1", "garbage");
    const bad = new SaveSystem(backend);
    const current = makeGame();
    const before = digest(current);
    await expect(bad.load("1")).rejects.toBeInstanceOf(SaveError);
    expect(digest(current)).toBe(before);
    void sys;
  });
});

describe("offline-first", () => {
  it("the simulation runs with no network access at all", () => {
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (() => { calls++; throw new Error("network disabled"); }) as never;
    try {
      const s = makeGame({ seed: 3 });
      advance(s, 24, { keepAfloat: 100000 });
      expect(s.clock.monthIndex).toBe(24);
      expect(calls).toBe(0);
    } finally { globalThis.fetch = realFetch; }
  });
  it("engine and persistence code contain no network calls or third-party URLs", () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === "tests" || f === "generated" ? [] : walk(p)) : /\.(ts|tsx)$/.test(f) ? [p] : []; });
    const files = walk(join(process.cwd(), "src/game"));
    const forbidden = /(XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|import\(["']https?:)/;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(forbidden.test(text), `${f}`).toBe(false);
      if (!f.endsWith("geoData.ts")) expect(/\bfetch\s*\(/.test(text), `${f} uses fetch`).toBe(false);
    }
    // the only fetch targets the locally served boundary file
    expect(readFileSync(join(process.cwd(), "src/game/ui/geoData.ts"), "utf8")).toContain('fetch("/game/geo.json")');
  });
});

describe("performance and size", () => {
  it("advances a month quickly even late in the game and keeps saves a sensible size", () => {
    const s = makeGame({ seed: 8 });
    const t0 = Date.now();
    advance(s, 36, { keepAfloat: 150000 });
    const per = (Date.now() - t0) / 36;
    expect(per).toBeLessThan(600); // generous ceiling for CI; typical is ~50–150 ms including election months
    const size = serialise({ format: SAVE_FORMAT, simVersion: SIM_VERSION, savedAt: 0, summary: summarise(s), state: s }).length;
    expect(size).toBeLessThan(25_000_000);
    expect(Object.keys(s.chars).length).toBeLessThan(20000);
    expect(s.news.length).toBeLessThanOrEqual(800);
  });
});
