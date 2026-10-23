"use client";

import { useState } from "react";
import type { Action } from "./engine";
import { avatarSvg } from "./avatarSvg";
import { QUEST_BY_ID, doneMilestones, questDone, questsOf } from "./quests";
import { favourBlock, powerOf, rivalCompare, rivalNpc, type FavourKind } from "./rival";
import { shareCard } from "./share";
import { dailyClaimed, dailyFor } from "./daily";
import { liveSeasons } from "./calendar";
import { famNameOf, famNameWord, heirloomsOf } from "./legacy";
import { decodeScore, encodeScore, scoreOf, type Score } from "./scoreCode";
import { naira } from "./util";
import { Bar } from "./ui";
import { useEffect } from "react";
import { ActionSheet, ListGroup, ListRow, cx } from "./ui";
import type { Player } from "./types";
import { T } from "./util";

type Run = (a: Action) => void;

/** Three small goals for the year. */
export function QuestsCard({ p }: { p: Player }) {
  const qs = questsOf(p);
  if (!qs.length || p.age < 6) return null;
  const done = qs.filter((q) => questDone(p, q)).length;
  return (
    <section>
      <h2 className="mb-1.5 flex items-center justify-between px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500"><span>{T("Goals this year", "Goals this year")}</span><span className="text-[11.5px] font-semibold normal-case tracking-normal">{done}/{qs.length}</span></h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
        {qs.map((q) => {
          const d = QUEST_BY_ID[q.id];
          if (!d) return null;
          const ok = questDone(p, q);
          return (
            <div key={q.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[20px]", ok ? "bg-emerald-100" : "bg-slate-100")}>{ok ? "✅" : d.emoji}</span>
              <span className="min-w-0 flex-1"><span className={cx("block text-[13.5px] font-extrabold leading-tight", ok ? "text-emerald-700 line-through" : "text-[#0b2a6b]")}>{T(d.en, d.pcm)}</span>{d.progress && !ok && <span className="block text-[11px] text-slate-500">{d.progress(p, q.base)}</span>}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RivalCard({ p }: { p: Player }) {
  const n = rivalNpc(p);
  const rows = rivalCompare(p);
  if (!n || p.age < 12) return <ListGroup title={T("Your rival", "Your rival")}><ListRow emoji="🥊" tile="bg-slate-100" name={T("No rival yet", "No rival yet")} desc={T("Someone your age will show up as you grow.", "Person wey reach your age go show as you dey grow.")} wrap /></ListGroup>;
  const lead = rows.filter((r) => r.ahead === true).length;
  const behind = rows.filter((r) => r.ahead === false).length;
  return (
    <>
      <ListGroup title={`🥊 ${n.name}`} sub={T(`Your cousin, same age as you. Your mother keeps comparing. You lead in ${lead}, they lead in ${behind}.`, `Your cousin, same age as you. Mama no stop to compare. You lead for ${lead}, dem lead for ${behind}.`)}>
        {rows.map((r) => (
          <ListRow key={r.key} emoji={r.ahead === true ? "🟢" : r.ahead === false ? "🔴" : "⚪"} tile={r.ahead === true ? "bg-emerald-100" : r.ahead === false ? "bg-rose-100" : "bg-slate-100"} name={T(r.en, r.pcm)} desc={`${T("You", "You")}: ${r.you}`} right={<span className="text-[12px] font-bold text-slate-600">{n.name.split(" ")[0]}: {r.them}</span>} />
        ))}
      </ListGroup>
    </>
  );
}

export function FavoursCard({ p, run }: { p: Player; run: Run }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const owing = Object.values(p.npcs).filter((n) => n.alive && (n.owes ?? 0) > 0).sort((a, b) => powerOf(b) - powerOf(a));
  const x = owing.find((n) => n.id === openId);
  const kinds: { k: FavourKind; emoji: string; en: string; pcm: string }[] = [
    { k: "contract", emoji: "📄", en: "Ask for a contract", pcm: "Ask for contract" }, { k: "job", emoji: "💼", en: "Ask for a job", pcm: "Ask for job" },
    { k: "legal", emoji: "⚖️", en: "Ask them to pull strings (prison)", pcm: "Ask dem pull string (prison)" }, { k: "intro", emoji: "🤝", en: "Ask for an introduction", pcm: "Ask for introduction" },
  ];
  return (
    <>
      <ListGroup title={T("Favours people owe you", "Favours wey people owe you")} sub={T("Help people when you can. Years later, the ones who made it remember.", "Help people when you fit. Years later, people wey make am go remember.")}>
        {owing.length === 0 ? <ListRow emoji="🤲🏾" tile="bg-slate-100" name={T("Nobody owes you yet", "Nobody owe you yet")} desc={T("Gift or lend people money and they will remember.", "Gift or lend people money and dem go remember.")} wrap /> : owing.map((n) => (
          <ListRow key={n.id} emoji={n.gender === "female" ? "👩🏾" : "👨🏾"} tile="bg-amber-100" name={n.name} desc={`${n.title ?? n.occupation} · ${T("owes you", "owe you")} ${n.owes} ${T("favour(s)", "favour(s)")}`} onClick={() => setOpenId(n.id)} />
        ))}
      </ListGroup>
      {x && (
        <ActionSheet emoji={x.gender === "female" ? "👩🏾" : "👨🏾"} tile="bg-amber-100" title={x.name} sub={`${x.title ?? x.occupation} · ${T("owes you", "owe you")} ${x.owes}`} onClose={() => setOpenId(null)}>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {kinds.map((o) => { const b = favourBlock(p, x, o.k); return <ListRow key={o.k} emoji={o.emoji} tile="bg-sky-100" name={T(o.en, o.pcm)} note={b} disabled={Boolean(b)} onClick={() => { run({ t: "favour", npc: x.id, kind: o.k }); setOpenId(null); }} />; })}
          </div>
        </ActionSheet>
      )}
    </>
  );
}

export function MilestonesCard({ p }: { p: Player }) {
  const list = doneMilestones(p);
  const [msg, setMsg] = useState("");
  if (!list.length) return null;
  return (
    <ListGroup title={T("Milestones", "Milestones")} sub={msg || undefined}>
      {list.map(({ m, age }) => (
        <ListRow key={m.id} emoji={m.emoji} tile="bg-violet-100" name={T(m.en, m.pcm)} desc={T(`At age ${age}`, `For age ${age}`)} right={<span className="text-[12px] font-bold text-blue-700">{T("Share", "Share")}</span>}
          onClick={async () => { try { const r = await shareCard({ kicker: T("A milestone from my life", "Milestone from my life"), emoji: m.emoji, title: T(m.en, m.pcm), subtitle: `${p.name} ${p.surname}`, avatarSvg: avatarSvg(p.look, p.gender, p.age), stats: [{ label: T("Age", "Age"), value: String(age) }, { label: T("Now", "Now"), value: String(p.age) }], footer: "Naija Life" }, `${m.emoji} ${T(m.en, m.pcm)} at ${age} #NaijaLife`, "post"); setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Saved as an image.", "Saved as image.")); } catch { setMsg(T("Could not share on this device.", "E no work for this device.")); } }} />
      ))}
    </ListGroup>
  );
}

/** Real-calendar banner and today's three small choices. */
export function DailyCard({ p, run }: { p: Player; run: Run }) {
  const [day, setDay] = useState("");
  useEffect(() => { setDay(new Date().toISOString().slice(0, 10)); }, []);
  const seasons = liveSeasons();
  if (p.age < 8) return null;
  return (
    <>
      {seasons.length > 0 && <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900 ring-1 ring-amber-100"><span className="text-base" aria-hidden>{seasons[0].emoji}</span><span className="min-w-0 flex-1">{T(seasons[0].en, seasons[0].pcm)}</span></div>}
      {day && !dailyClaimed(p, day) && (
        <section>
          <h2 className="mb-1.5 flex items-center justify-between px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500"><span>{T("Today's pick", "Today pick")}</span><span className="text-[11.5px] font-semibold normal-case tracking-normal">{Number(p.flags.dailyStreak ?? 0) > 0 ? `🔥 ${p.flags.dailyStreak}` : T("One choice a day", "One choice every day")}</span></h2>
          <div className="grid grid-cols-3 gap-1.5">
            {dailyFor(day).map((d) => (
              <button key={d.id} type="button" onClick={() => run({ t: "daily", id: d.id, day })} className="flex flex-col items-center gap-0.5 rounded-2xl border border-slate-100 bg-white px-1.5 py-2 text-center shadow-sm active:bg-slate-50">
                <span className="text-2xl" aria-hidden>{d.emoji}</span>
                <span className="text-[11.5px] font-extrabold leading-tight text-[#0b2a6b]">{T(d.en, d.pcm)}</span>
                <span className="text-[10px] leading-tight text-slate-500">{T(d.effect[0], d.effect[1])}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export function LegacyCard({ p }: { p: Player }) {
  const fn = famNameOf(p);
  const items = heirloomsOf(p);
  const compound = p.houses.find((h) => h.compound);
  return (
    <>
      <ListGroup title={T("Family name", "Family name")} sub={T("It carries across generations. A good name opens doors; a bad one follows your children.", "E dey waka across generations. Good name dey open door; bad one dey follow your children.")}>
        <div className="px-3.5 py-3"><Bar label={`${famNameWord(fn)} (${fn})`} value={fn} tone="gold" /></div>
        <ListRow emoji="🏛️" tile="bg-amber-100" name={T("Generation", "Generation")} right={String(Number(p.flags.dynasty ?? 1))} />
      </ListGroup>
      <ListGroup title={T("The family compound", "The family compound")}>
        {compound ? <ListRow emoji="🏡" tile="bg-emerald-100" name={`${p.state === compound.state ? T("Home compound", "Home compound") : T("Compound", "Compound")}`} desc={T(`Worth ${naira(compound.value)}. Selling it hurts the family.`, `Worth ${naira(compound.value)}. If you sell am, family go vex.`)} wrap /> : <ListRow emoji="🏚️" tile="bg-slate-100" name={T("No compound yet", "No compound yet")} desc={T("Your heir inherits the family's best house as the compound.", "Your heir go inherit best house as compound.")} wrap />}
      </ListGroup>
      <ListGroup title={T("Heirlooms", "Heirlooms")}>
        {items.length === 0 ? <ListRow emoji="📦" tile="bg-slate-100" name={T("None yet", "None yet")} desc={T("They arrive with inheritance.", "Dem dey come with inheritance.")} /> : items.map((h) => <ListRow key={h.id} emoji={h.emoji} tile="bg-violet-100" name={T(h.en, h.pcm)} desc={h.perk === "rep" ? T("Reputation each year", "Reputation every year") : h.perk === "name" ? T("Strengthens the family name", "E dey strengthen family name") : h.perk === "faith" ? T("Calms your stress", "E dey calm your stress") : T("Keeps the family happy", "E dey keep family happy")} />)}
      </ListGroup>
    </>
  );
}

const BOARD_KEY = "naija-life-friends-v1";
export function FriendBoardCard({ p }: { p: Player }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { try { setCodes(JSON.parse(localStorage.getItem(BOARD_KEY) ?? "[]") as string[]); } catch { /* storage unavailable */ } }, []);
  const mine = scoreOf(p);
  const myCode = encodeScore(mine);
  const list: { s: Score; code: string; me?: boolean }[] = [{ s: mine, code: myCode, me: true }, ...codes.map((c) => ({ s: decodeScore(c), code: c })).filter((x): x is { s: Score; code: string } => Boolean(x.s))].sort((a, b) => b.s.w - a.s.w);
  const persist = (a: string[]) => { setCodes(a); try { localStorage.setItem(BOARD_KEY, JSON.stringify(a)); } catch { /* storage unavailable */ } };
  const add = () => { const s = decodeScore(input); if (!s) { setMsg(T("That code does not look right.", "That code no correct.")); return; } if (!codes.includes(input.trim())) persist([...codes, input.trim()].slice(-20)); setInput(""); setMsg(T(`Added ${s.n}.`, `Added ${s.n}.`)); };
  const copy = async () => { try { await navigator.clipboard.writeText(myCode); setMsg(T("Code copied. Send it to a friend!", "Code don copy. Send am to friend!")); } catch { setMsg(myCode); } };
  return (
    <ListGroup title={T("Compare with friends", "Compare with friends")} sub={msg || T("Share your code, paste theirs, and see whose life is richer.", "Share your code, paste theirs, and see whose life rich pass.")}>
      <div className="flex gap-2 px-3.5 py-3">
        <button type="button" onClick={copy} className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-[13px] font-extrabold text-white active:opacity-90">{T("Copy my code", "Copy my code")}</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={T("Paste a friend's code", "Paste friend code")} className="min-w-0 flex-1 rounded-full border border-slate-200 px-3 text-[13px]" />
        <button type="button" onClick={add} className="shrink-0 rounded-full bg-slate-100 px-3 text-[13px] font-extrabold text-slate-700">{T("Add", "Add")}</button>
      </div>
      {list.map((x, i) => <ListRow key={x.code} emoji={i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"} tile={x.me ? "bg-blue-100" : "bg-amber-100"} name={`${x.s.n}${x.me ? ` (${T("you", "you")})` : ""}`} desc={`${x.s.alive ? T("Age", "Age") : T("Died at", "Die for")} ${x.s.a} · ${x.s.r} ${T("ribbons", "ribbons")} · ${T("gen", "gen")} ${x.s.g}`} right={naira(x.s.w)} />)}
    </ListGroup>
  );
}
