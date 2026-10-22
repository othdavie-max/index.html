"use client";

import { useEffect, useState } from "react";
import type { Action } from "./engine";
import { GOAL_BY_ID, UNLOCK_GOAL, challengeFor, dailyBlock, dailyFor, dailyRewardText, gistFor, weekId, type Challenge } from "./engage";
import { shareCard } from "./share";
import type { Player } from "./types";
import type { Look } from "./look";
import { Badge, Btn, Card, H, Sheet, cx } from "./ui";
import { T, naira } from "./util";

// ---------------------------------------------------------------------------
// Small browser storage helpers. Everything works without them.
// ---------------------------------------------------------------------------
const UNLOCK_KEY = "naija-life-unlocks-v1";
const DAILY_KEY = "naija-life-daily-v1";
const CHALLENGE_KEY = "naija-life-challenge-v1";
function read<TV>(key: string, fallback: TV): TV {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as TV) : fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }

export const todayKey = () => new Date().toLocaleDateString("en-CA");
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString("en-CA"); };

export const loadUnlocks = (): string[] => read<string[]>(UNLOCK_KEY, []);
/** Remember cosmetics earned in any life. Returns the ones that are new. */
export function saveUnlocksFrom(p: Player): string[] {
  const have = new Set(loadUnlocks());
  const fresh: string[] = [];
  for (const k of Object.keys(p.flags)) if (k.startsWith("unlock:") && !have.has(k.slice(7))) { have.add(k.slice(7)); fresh.push(k.slice(7)); }
  if (fresh.length) write(UNLOCK_KEY, [...have]);
  return fresh;
}
export function saveChallengeScore(p: Player) {
  if (!p.challenge || p.challenge.score === undefined) return;
  const all = read<Record<string, number>>(CHALLENGE_KEY, {});
  if ((all[p.challenge.id] ?? -Infinity) < p.challenge.score) { all[p.challenge.id] = p.challenge.score; write(CHALLENGE_KEY, all); }
}
export const bestScore = (id: string): number | null => read<Record<string, number>>(CHALLENGE_KEY, {})[id] ?? null;

export function useUnlocks(): Set<string> {
  const [s, setS] = useState<Set<string>>(() => new Set());
  useEffect(() => { setS(new Set(loadUnlocks())); }, []);
  return s;
}
export const isLocked = (kind: "hair" | "wear" | "outfit", id: string, unlocked: Set<string>) => Boolean(UNLOCK_GOAL[`${kind}:${id}`]) && !unlocked.has(`${kind}:${id}`);
export const lockHint = (kind: "hair" | "wear" | "outfit", id: string): string => { const g = UNLOCK_GOAL[`${kind}:${id}`]; return g ? T(`Locked: ${g.en}`, `Locked: ${g.pcm}`) : ""; };
/** Swap anything the player has not earned for a plain option. */
export function sanitizeLook(l: Look, unlocked: Set<string>): Look {
  return {
    ...l,
    hair: isLocked("hair", l.hair, unlocked) ? "low" : l.hair,
    wear: isLocked("wear", l.wear, unlocked) ? "none" : l.wear,
    outfit: isLocked("outfit", l.outfit, unlocked) ? "tshirt" : l.outfit,
  };
}

// ---------------------------------------------------------------------------
// Daily gist banner and sheet
// ---------------------------------------------------------------------------
export function DailyBanner({ p, run }: { p: Player; run: (a: Action) => void }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ streak: number; claimedToday: boolean }>({ streak: 0, claimedToday: false });
  const day = todayKey();
  const refresh = () => { const d = read<{ last?: string; streak?: number }>(DAILY_KEY, {}); setInfo({ streak: d.streak ?? 0, claimedToday: d.last === day }); };
  useEffect(refresh, [day]);
  if (!p.alive || p.age < 6) return null;
  const def = dailyFor(day);
  const blocked = dailyBlock(p, day);
  const done = info.claimedToday || p.flags.dailyDay === day;
  const nextStreak = (read<{ last?: string; streak?: number }>(DAILY_KEY, {}).last === yesterdayKey() ? (info.streak || 0) + 1 : 1);
  const choose = (i: number) => {
    const streak = nextStreak;
    run({ t: "daily", day, choice: i, streak });
    write(DAILY_KEY, { last: day, streak });
    setInfo({ streak, claimedToday: true });
    setOpen(false);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-100">
        <span className="text-[18px]">🗞️</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#0b2a6b]">{done ? T("Today's gist done. Come back tomorrow!", "Today gist don finish. Come back tomorrow!") : T(def.en, def.pcm)}</span>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">🔥 {info.claimedToday ? info.streak : nextStreak - 1 > 0 ? nextStreak - 1 : 0}</span>
      </button>
      {open && (
        <Sheet title={T("Today's gist", "Today gist")} onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-700">{T(def.en, def.pcm)}</p>
          <p className="mt-1 text-[11px] text-slate-500">{T(`Streak: ${info.streak} day${info.streak === 1 ? "" : "s"}. ${(() => { const r = dailyRewardText(nextStreak); return `Reward: ${r.en}`; })()}`, `Streak: ${info.streak} day. ${(() => { const r = dailyRewardText(nextStreak); return `Reward: ${r.pcm}`; })()}`)}</p>
          <div className="mt-3 space-y-2">
            {def.choices.map((c, i) => <Btn key={i} tone="gold" className="w-full" disabled={done || Boolean(blocked)} onClick={() => choose(i)}>{T(c.en, c.pcm)}</Btn>)}
          </div>
          {done && <p className="mt-2 text-xs text-slate-500">{T("You have taken today's gist. Come back tomorrow to keep your streak.", "You don take today gist. Come back tomorrow to keep your streak.")}</p>}
        </Sheet>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Legacy panels
// ---------------------------------------------------------------------------
export function MomentsPanel({ p }: { p: Player }) {
  const [msg, setMsg] = useState("");
  const moments = [...(p.moments ?? [])].reverse();
  const share = async (m: NonNullable<Player["moments"]>[number]) => {
    const caption = p.lang === "en" ? m.en : m.pcm;
    const r = await shareCard({ kicker: "Naija Life", title: `${m.emoji} ${m.title}`, stats: [{ label: T("Age", "Age"), value: String(m.age) }, { label: T("Net worth", "Net worth"), value: naira(p.peakWorth || p.money) }], lines: [caption, `${p.name} ${p.surname}`], footer: T("Play Naija Life", "Play Naija Life") }, `${caption} #NaijaLife`);
    setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  return (
    <Card>
      <H sub={T("Funny highlights from your life. Share them with your friends.", "Funny highlights from your life. Share am give your friends.")}>{T("Moments", "Moments")}</H>
      {moments.length === 0 && <p className="text-sm text-slate-500">{T("Nothing yet. Become president, escape kidnappers, go viral or graduate with First Class and a moment appears.", "Nothing yet. Become president, escape kidnappers, go viral or make First Class and moment go show.")}</p>}
      <div className="space-y-2">
        {moments.map((m) => (
          <div key={m.id} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between"><span className="text-sm font-extrabold text-[#0b2a6b]">{m.emoji} {m.title}</span><Badge>{T("Age", "Age")} {m.age}</Badge></div>
            <p className="mt-1 text-[13px] leading-snug text-slate-700">{p.lang === "en" ? m.en : m.pcm}</p>
            <Btn small tone="gold" className="mt-2" onClick={() => share(m)}>{T("Share", "Share")}</Btn>
          </div>
        ))}
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
    </Card>
  );
}

export function GoalsPanel({ p }: { p: Player }) {
  const unlocked = useUnlocks();
  return (
    <Card>
      <H sub={T("Finish a goal to unlock a cosmetic for every future character. Nothing here costs money.", "Finish goal to unlock cosmetic for every next character. Nothing here dey cost money.")}>{T("Bucket list", "Bucket list")}</H>
      <div className="space-y-2">
        {(p.goals ?? []).map((g) => {
          const d = GOAL_BY_ID[g.id];
          if (!d) return null;
          return (
            <div key={g.id} className={cx("flex items-center gap-3 rounded-xl p-3", g.done ? "bg-emerald-50" : "bg-slate-50")}>
              <span className="text-2xl">{g.done ? "✅" : "🎯"}</span>
              <div className="min-w-0 flex-1"><div className="text-sm font-bold text-[#0b2a6b]">{T(d.en, d.pcm)}</div><div className="text-[11px] text-slate-500">{d.unlock ? T(`Reward: ${d.unlock.en}`, `Reward: ${d.unlock.pcm}`) : T("Reward: pride", "Reward: pride")}{g.done ? ` · ${T("age", "age")} ${g.doneAge}` : ""}</div></div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">{T(`Cosmetics unlocked so far: ${unlocked.size}`, `Cosmetic wey you don unlock: ${unlocked.size}`)}</p>
    </Card>
  );
}

export function GistPanel({ p }: { p: Player }) {
  const day = todayKey();
  return (
    <Card>
      <H sub={T("What people are saying today. These stories are generated by the game; a live feed from real players comes with online play.", "Wetin people dey talk today. Na the game generate these stories; live feed from real players go come with online play.")}>{T("Naija Gist", "Naija Gist")}</H>
      <ul className="space-y-2">
        {gistFor(day, p).map((g, i) => <li key={i} className={cx("rounded-xl px-3 py-2 text-[13px] leading-snug", g.you ? "bg-blue-50 text-blue-900" : "bg-slate-50 text-slate-700")}>{p.lang === "en" ? g.en : g.pcm}</li>)}
      </ul>
    </Card>
  );
}

export function ChallengePanel({ p }: { p: Player }) {
  const c = challengeFor(weekId(new Date()));
  const [msg, setMsg] = useState("");
  const best = bestScore(c.id);
  const mine = p.challenge?.id === c.id ? p.challenge : undefined;
  const share = async () => {
    const score = mine?.score ?? best;
    const r = await shareCard({ kicker: T("Weekly challenge", "Weekly challenge"), title: c.title, stats: [{ label: T("My score", "My score"), value: score != null ? naira(score) : "–" }, { label: T("Goal", "Goal"), value: c.goal }], lines: [T("Can you beat me? Same start, same week.", "You fit beat me? Same start, same week.")], footer: "Naija Life" }, `${c.title}: ${score != null ? naira(score) : ""}. Beat me! #NaijaLife`);
    setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  return (
    <Card>
      <H sub={T("Everyone gets the same start this week. Start it from the main menu.", "Everybody get the same start this week. Start am from main menu.")}>{T("Weekly challenge", "Weekly challenge")}</H>
      <p className="text-sm font-bold text-[#0b2a6b]">{c.title}</p>
      <p className="text-xs text-slate-500">{c.goal}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <Badge tone="gold">{T("Your best", "Your best")}: {best != null ? naira(best) : "–"}</Badge>
        {mine && <Badge tone="green">{mine.score !== undefined ? T(`This life: ${naira(mine.score)}`, `This life: ${naira(mine.score)}`) : T("In progress: score locks in at 40", "E dey go: score go lock for 40")}</Badge>}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{T("Scores are saved on this device. A shared leaderboard needs online play, so for now post your card and challenge your friends.", "Score dey save for this device. Shared leaderboard need online play, so for now post your card challenge your friends.")}</p>
      <Btn small tone="ghost" className="mt-2" onClick={share}>{T("Share my score", "Share my score")}</Btn>
      {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
    </Card>
  );
}

/** Shown on the start screen. */
export function ChallengeBanner({ onPlay }: { onPlay: (c: Challenge) => void }) {
  const [c, setC] = useState<Challenge | null>(null);
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => { const ch = challengeFor(weekId(new Date())); setC(ch); setBest(bestScore(ch.id)); }, []);
  if (!c) return null;
  return (
    <button type="button" onClick={() => onPlay(c)} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left">
      <span className="text-3xl">🏆</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold uppercase tracking-wide text-amber-700">{T("This week's challenge", "This week challenge")}</span>
        <span className="block text-sm font-extrabold text-[#0b2a6b]">{c.title}</span>
        <span className="block text-[11.5px] text-slate-600">{c.goal}{best != null ? ` · ${T("best", "best")} ${naira(best)}` : ""}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-blue-600">{T("Play ›", "Play ›")}</span>
    </button>
  );
}
