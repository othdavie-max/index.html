import { describe, expect, it } from "vitest";
import { newGame } from "./init";
import { cosCandidates, pickChiefOfStaff, pickVice, vpCandidates } from "./dayone";
import { FACES, photoFile, setClaimed } from "../../game/ui/photos";

describe("face ownership", () => {
  it("has 14 men and 14 women", () => { expect(FACES.filter((f) => f.female).length).toBe(14); expect(FACES.filter((f) => !f.female).length).toBe(14); });
  it("president, VP and Chief of Staff never share a face", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = newGame({ seed, president: "Test" } as never);
      s.meta.portrait = { ...s.meta.portrait, face: FACES[seed % 28].id };
      setClaimed([s.meta.portrait.face]);
      pickVice(s, vpCandidates(s)[0].id); pickChiefOfStaff(s, cosCandidates(s)[0].id);
      const ids = [s.meta.portrait.face, s.staff.vp?.portrait.face, s.staff.cos?.portrait.face];
      expect(new Set(ids).size).toBe(3);
      setClaimed(ids);
      for (const c of vpCandidates(s)) expect(photoFile(c.portrait).split("-")[0]).not.toBe(ids[0]);
    }
    setClaimed([]);
  });
});
