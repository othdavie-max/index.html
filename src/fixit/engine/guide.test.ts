import { describe, expect, it } from "vitest";
import { ABOUT, RULES, TOPICS, TOUR } from "../ui/guideData";

const ruleFor = (label: string) => RULES.find((r) => r.re.test(label));
describe("guide content", () => {
  it("explains the main controls by their labels", () => {
    for (const l of ["NEXT TURN", "+3 mo", "Cash", "Naira", "Approval", "Capital", "Build", "Economy", "Power", "People", "News", "Debt & lending", "Assembly", "Governors", "Ask my advisers", "Mood", "Electricity"]) expect(ruleFor(l), l).toBeTruthy();
  });
  it("has a one-line note for every main screen", () => {
    for (const k of ["presidency", "plans", "projects", "policies", "nation", "trade", "debt", "oil", "deals", "power", "assembly", "moves", "foreign", "league", "military", "cabinet", "governors", "party", "advisers", "enemies", "x", "street"]) expect(ABOUT[k], k).toBeTruthy();
  });
  it("tour and topics are well formed", () => {
    expect(TOUR.length).toBeGreaterThan(10);
    for (const s of TOUR) { expect(s.title.length).toBeGreaterThan(2); expect(s.text.length).toBeGreaterThan(10); }
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });
});
