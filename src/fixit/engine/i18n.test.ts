import { describe, expect, it } from "vitest";
import { ui, LANGS } from "./i18n";
describe("i18n", () => {
  it("translates known UI text, keeps icons and spacing, falls back to English", () => {
    expect(ui("ha", "Budget")).toBe("Kasafi");
    expect(ui("yo", "🔊 Sound on")).toContain("Ohùn");
    expect(ui("ig", " Start ")).toBe(" Malite ");
    expect(ui("ig", "Unknown sentence here")).toBe("Unknown sentence here");
    expect(ui("en", "Budget")).toBe("Budget");
  });
  it("lists five languages", () => expect(LANGS.map((l) => l.id)).toEqual(["en", "pcm", "ha", "yo", "ig"]));
});
