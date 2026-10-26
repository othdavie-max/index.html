import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ADMIN, ADMIN_LGAS, LGAS_BY_STATE, LGA_BY_ID, validateAdmin, searchPlaces, ATTRIBUTION } from "../engine/admin";
import { STATES, STATE_BY_ID, senateSeatsFor, assemblySeatsFor } from "../data/states";

const OFFICIAL: Record<string, number> = {
  "NG-AB": 17, "NG-AD": 21, "NG-AK": 31, "NG-AN": 21, "NG-BA": 20, "NG-BY": 8, "NG-BE": 23, "NG-BO": 27, "NG-CR": 18, "NG-DE": 25, "NG-EB": 13, "NG-ED": 18, "NG-EK": 16,
  "NG-EN": 17, "NG-GO": 11, "NG-IM": 27, "NG-JI": 27, "NG-KD": 23, "NG-KN": 44, "NG-KT": 34, "NG-KE": 21, "NG-KO": 21, "NG-KW": 16, "NG-LA": 20, "NG-NA": 13, "NG-NI": 25,
  "NG-OG": 20, "NG-ON": 18, "NG-OS": 30, "NG-OY": 33, "NG-PL": 17, "NG-RI": 23, "NG-SO": 23, "NG-TA": 16, "NG-YO": 17, "NG-ZA": 14, "NG-FC": 6,
};
const NAMES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory"];

describe("administrative geography", () => {
  it("validates the dataset", () => {
    expect(validateAdmin()).toEqual({ states: 37, lgas: 774 });
  });
  it("has all 36 states and the FCT with the expected names", () => {
    expect(STATES).toHaveLength(37);
    expect(STATES.map((s) => s.name).sort()).toEqual([...NAMES].sort());
    expect(STATES.filter((s) => s.isFct)).toHaveLength(1);
  });
  it("assigns the officially published number of LGAs to every state and the FCT (774 total)", () => {
    expect(ADMIN_LGAS).toHaveLength(774);
    for (const [id, n] of Object.entries(OFFICIAL)) expect(LGAS_BY_STATE[id], id).toHaveLength(n);
    expect(Object.values(OFFICIAL).reduce((a, b) => a + b, 0)).toBe(774);
  });
  it("uses stable, unique ids and correct parent associations", () => {
    const ids = new Set(ADMIN_LGAS.map((l) => l.id));
    expect(ids.size).toBe(774);
    for (const l of ADMIN_LGAS) {
      expect(l.id.startsWith(l.stateId + "-")).toBe(true);
      expect(STATE_BY_ID[l.stateId]).toBeDefined();
      expect(l.sourceId).toMatch(/^\d+B\d+$/); // geoBoundaries shapeID kept for traceability
    }
  });
  it("includes well-known LGAs under the right parents", () => {
    expect(LGA_BY_ID["NG-LA-ikeja"].stateId).toBe("NG-LA");
    expect(ADMIN_LGAS.find((l) => l.name === "Ikeja")!.stateId).toBe("NG-LA");
    expect(ADMIN_LGAS.find((l) => l.name === "Fagge")!.stateId).toBe("NG-KN");
    expect(LGAS_BY_STATE["NG-FC"].map((l) => l.name).sort()).toEqual(["Abaji", "Municipal Area Council", "Bwari", "Gwagwalada", "Kuje", "Kwali"].sort());
  });
  it("keeps constituency seat counts consistent with the constitution", () => {
    expect(STATES.reduce((t, s) => t + s.repsSeats, 0)).toBe(360);
    expect(STATES.reduce((t, s) => t + senateSeatsFor(s), 0)).toBe(109);
    for (const s of STATES) { const a = assemblySeatsFor(s); expect(s.isFct ? a === 0 : a >= 24 && a <= 40).toBe(true); }
  });
  it("carries licence and attribution for the boundary data", () => {
    expect(ATTRIBUTION.licence).toContain("CC BY 4.0");
    expect(ATTRIBUTION.underlyingSource).toContain("GRID3");
    expect(ATTRIBUTION.upstream).toContain("geoBoundaries");
  });
  it("ships boundary geometry for exactly the same ids as the admin data", () => {
    const geo = JSON.parse(readFileSync(join(process.cwd(), "public/game/geo.json"), "utf8"));
    expect(geo.states.map((s: { id: string }) => s.id).sort()).toEqual(ADMIN.states.map((s) => s.id).sort());
    expect(geo.lgas.map((l: { id: string }) => l.id).sort()).toEqual(ADMIN_LGAS.map((l) => l.id).sort());
    for (const l of geo.lgas) {
      expect(l.d.startsWith("M")).toBe(true);
      expect(l.s).toBe(LGA_BY_ID[l.id].stateId);
      expect(l.bb[2]).toBeGreaterThan(l.bb[0]);
      expect(l.bb[3]).toBeGreaterThan(l.bb[1]);
    }
    expect(geo.attribution.licence).toContain("CC BY 4.0");
  });
  it("places every LGA inside the bounding box of its parent state", () => {
    const geo = JSON.parse(readFileSync(join(process.cwd(), "public/game/geo.json"), "utf8"));
    const sb = Object.fromEntries(geo.states.map((s: { id: string; bb: number[] }) => [s.id, s.bb]));
    for (const l of geo.lgas) {
      const b = sb[l.s];
      const tol = 40;
      expect(l.c[0] >= b[0] - tol && l.c[0] <= b[2] + tol && l.c[1] >= b[1] - tol && l.c[1] <= b[3] + tol, l.id).toBe(true);
    }
  });
});

describe("state and LGA search / selection helpers", () => {
  it("finds states and LGAs by name with the parent shown", () => {
    const r = searchPlaces("ikeja");
    expect(r[0]).toMatchObject({ kind: "lga", id: "NG-LA-ikeja", parent: "Lagos" });
    expect(searchPlaces("lagos")[0]).toMatchObject({ kind: "state", id: "NG-LA" });
    expect(searchPlaces("fct")[0]).toMatchObject({ kind: "state", id: "NG-FC" });
  });
  it("ignores too-short queries and limits results", () => {
    expect(searchPlaces("a")).toEqual([]);
    expect(searchPlaces("an", 5).length).toBeLessThanOrEqual(5);
  });
  it("returns every LGA of a state for the list-based alternative to clicking", () => {
    expect(LGAS_BY_STATE["NG-KN"]).toHaveLength(44);
    for (const l of LGAS_BY_STATE["NG-KN"]) expect(searchPlaces(l.name).some((r) => r.id === l.id)).toBe(true);
  });
});
