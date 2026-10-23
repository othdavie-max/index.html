"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "./types";
import { getSound, setSound, sfx, unlockAudio, type Sfx } from "./sound";
import { Btn } from "./ui";
import { T } from "./util";

/** Plays sounds for taps and for what happens in the game. */
export function useGameSounds(game: Game | null) {
  const prev = useRef<{ id: string; age: number; alive: boolean; money: number; moments: number; goals: number; ach: number; head: string } | null>(null);

  useEffect(() => {
    const onDown = (e: Event) => {
      unlockAudio();
      const el = (e.target as HTMLElement | null)?.closest?.("button");
      if (!el || (el as HTMLButtonElement).disabled) return;
      sfx((el.getAttribute("data-sfx") as Sfx | null) ?? "tap");
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);

  useEffect(() => {
    if (!game) { prev.current = null; return; }
    const p = game.p;
    const head = game.queue[0] ? (game.queue[0].kind === "kidnap" ? "kidnap" : `ev:${game.queue[0].id}`) : "";
    const now = { id: p.id, age: p.age, alive: p.alive, money: p.money, moments: p.moments?.length ?? 0, goals: (p.goals ?? []).filter((g) => g.done).length, ach: p.achievements.length, head };
    const q = prev.current;
    prev.current = now;
    if (!q || q.id !== now.id) return;
    if (q.alive && !now.alive) { sfx("death"); return; }
    if (now.head === "kidnap" && q.head !== "kidnap") { sfx("alarm"); return; }
    if (now.moments > q.moments || now.goals > q.goals || now.ach > q.ach) { sfx("win"); return; }
    if (now.head && now.head !== q.head && now.head !== "kidnap") { sfx("pop"); return; }
    const d = now.money - q.money;
    const big = 5000 * Math.pow(p.index, 0.92);
    if (d > big) sfx("coin");
    else if (d < -big * 4) sfx("spend");
  }, [game]);
}

export function SoundToggles() {
  const [s, setS] = useState(() => getSound());
  const set = (patch: Partial<typeof s>) => { setSound(patch); setS(getSound()); unlockAudio(); };
  return (
    <div className="grid grid-cols-2 gap-2">
      <Btn tone={s.sfx ? "gold" : "ghost"} onClick={() => set({ sfx: !s.sfx })}>{s.sfx ? "🔊" : "🔇"} {T("Sound effects", "Sound effects")}</Btn>
      <Btn tone={s.music ? "gold" : "ghost"} onClick={() => set({ music: !s.music })}>{s.music ? "🎵" : "🎶"} {T("Music", "Music")} {s.music ? T("on", "on") : T("off", "off")}</Btn>
    </div>
  );
}
