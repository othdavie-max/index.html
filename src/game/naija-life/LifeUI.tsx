"use client";

import { useState } from "react";
import type { Action } from "./engine";
import { avatarSvg } from "./avatarSvg";
import { QUEST_BY_ID, doneMilestones, questDone, questsOf } from "./quests";
import { favourBlock, powerOf, rivalCompare, rivalNpc, type FavourKind } from "./rival";
import { shareCard } from "./share";
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
