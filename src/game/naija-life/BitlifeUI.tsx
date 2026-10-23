"use client";

import { useState } from "react";
import type { Action } from "./engine";
import { DNA_COST, PET_KINDS, STYLE_ITEMS, TALENTS, TICKETS, petPrice, petsOf, practiceLeft, styleBlock, styleLeft, talentOf, ticketsLeft } from "./bitlife";
import { ActionSheet, Bar, ListGroup, ListRow } from "./ui";
import { I } from "./helpers";
import type { Player } from "./types";
import { T, naira } from "./util";

type Run = (a: Action) => void;

export function PetsCard({ p, run }: { p: Player; run: Run }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pets = petsOf(p);
  const x = pets.find((q) => q.id === openId);
  const k = x ? PET_KINDS.find((q) => q.id === x.kind) : undefined;
  return (
    <>
      <ListGroup title={T("Your pets", "Your pets")} sub={p.age < 8 ? T("You are too small to look after a pet.", "You still small to keep pet.") : T("Feed, play with and look after them. Pets cost a little every year.", "Feed, play with and look after dem. Pets dey cost small every year.")}>
        {pets.length === 0 ? <ListRow emoji="🐾" tile="bg-slate-100" name={T("No pets yet", "No pet yet")} /> : pets.map((q) => {
          const kk = PET_KINDS.find((z) => z.id === q.kind);
          return <ListRow key={q.id} emoji={kk?.emoji ?? "🐾"} tile="bg-amber-100" name={`${q.name} · ${T(kk?.en ?? "", kk?.pcm ?? "")}`} desc={T(`Age ${q.age} · health ${Math.round(q.health)}% · bond ${Math.round(q.bond)}%`, `Age ${q.age} · health ${Math.round(q.health)}% · bond ${Math.round(q.bond)}%`)} onClick={() => setOpenId(q.id)} />;
        })}
      </ListGroup>
      {p.age >= 8 && pets.length < 3 && (
        <ListGroup title={T("Get a pet", "Get pet")}>
          {PET_KINDS.map((z) => <ListRow key={z.id} emoji={z.emoji} tile="bg-sky-100" name={T(z.en, z.pcm)} desc={T(z.note[0], z.note[1])} right={p.age < 18 ? undefined : naira(petPrice(p, z.id))} disabled={p.age >= 18 && p.money < petPrice(p, z.id)} onClick={() => run({ t: "bl", op: "pet", id: z.id })} wrap />)}
        </ListGroup>
      )}
      {x && (
        <ActionSheet emoji={k?.emoji ?? "🐾"} tile="bg-amber-100" title={`${x.name} · ${T(k?.en ?? "", k?.pcm ?? "")}`} sub={T(`Age ${x.age} · health ${Math.round(x.health)}% · bond ${Math.round(x.bond)}%`, `Age ${x.age} · health ${Math.round(x.health)}% · bond ${Math.round(x.bond)}%`)} onClose={() => setOpenId(null)}>
          <div className="mb-3 grid grid-cols-2 gap-3"><Bar label={T("Health", "Health")} value={x.health} /><Bar label={T("Bond", "Bond")} value={x.bond} tone="blue" /></div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            <ListRow emoji="🎾" tile="bg-emerald-100" name={T("Play", "Play")} onClick={() => run({ t: "bl", op: "petcare", id: x.id, care: "play" })} />
            <ListRow emoji="🍖" tile="bg-amber-100" name={T("Feed well", "Feed well")} desc={naira(I(p, 6_000))} onClick={() => run({ t: "bl", op: "petcare", id: x.id, care: "feed" })} />
            <ListRow emoji="💉" tile="bg-sky-100" name={T("Take to the vet", "Carry go vet")} desc={naira(I(p, 40_000))} onClick={() => run({ t: "bl", op: "petcare", id: x.id, care: "vet" })} />
            <ListRow emoji="🏡" tile="bg-slate-100" name={T("Give to a neighbour", "Give neighbour")} onClick={() => { run({ t: "bl", op: "rehome", id: x.id }); setOpenId(null); }} />
          </div>
        </ActionSheet>
      )}
    </>
  );
}

export function LotteryCard({ p, run }: { p: Player; run: Run }) {
  if (p.age < 18) return <ListGroup title={T("Lottery", "Lottery")}><ListRow emoji="🔒" tile="bg-slate-100" name={T("Adults only (18+)", "Na only adult (18+)")} /></ListGroup>;
  return (
    <ListGroup title={T("Lottery and scratch cards", "Lottery and scratch cards")} sub={T(`${ticketsLeft(p)} plays left this year. The house always wins, mostly.`, `${ticketsLeft(p)} plays remain this year. The house dey win, mostly.`)}>
      {TICKETS.map((t) => <ListRow key={t.id} emoji={t.emoji} tile="bg-amber-100" name={T(t.en, t.pcm)} desc={T(t.blurb[0], t.blurb[1])} right={naira(I(p, t.cost))} disabled={ticketsLeft(p) <= 0 || p.money < I(p, t.cost)} onClick={() => run({ t: "bl", op: "lotto", id: t.id })} wrap />)}
    </ListGroup>
  );
}

export function StyleCard({ p, run }: { p: Player; run: Run }) {
  return (
    <ListGroup title={T("Style and body", "Style and body")} sub={T(`${styleLeft(p)} visits left this year. Surgery has real risks.`, `${styleLeft(p)} visits remain this year. Surgery get real risk.`)}>
      {STYLE_ITEMS.map((s) => {
        const b = styleBlock(p, s.id);
        return <ListRow key={s.id} emoji={s.emoji} tile="bg-rose-100" name={T(s.en, s.pcm)} desc={T(s.note[0], s.note[1])} right={naira(Math.round(I(p, s.cost)))} note={b} disabled={Boolean(b)} onClick={() => run({ t: "bl", op: "style", id: s.id })} wrap />;
      })}
    </ListGroup>
  );
}

export function TalentCard({ p, run }: { p: Player; run: Run }) {
  const t = talentOf(p);
  const def = TALENTS.find((x) => x.id === t.kind);
  if (p.age < 6) return null;
  if (!def) {
    return (
      <ListGroup title={T("Choose your craft", "Choose your craft")} sub={T("Pick one thing to get really good at. Train it, audition, chase a big break.", "Pick one thing to master. Train am, audition, chase big break.")}>
        {TALENTS.map((x) => <ListRow key={x.id} emoji={x.emoji} tile="bg-violet-100" name={T(x.en, x.pcm)} desc={T(x.blurb[0], x.blurb[1])} onClick={() => run({ t: "bl", op: "talent", id: x.id })} wrap />)}
      </ListGroup>
    );
  }
  return (
    <ListGroup title={`${def.emoji} ${T(def.en, def.pcm)}`} sub={p.flags.bigBreak ? T("You have had your big break. Keep it going.", "You don get your big break. Keep am going.") : T("Practise, audition, and hit level 70 for a big break.", "Practise, audition, and reach level 70 for big break.")}>
      <div className="px-3.5 py-3"><Bar label={T("Skill", "Skill")} value={t.level} tone="blue" /></div>
      <ListRow emoji="🏋🏾" tile="bg-emerald-100" name={T("Practise", "Practise")} desc={T(`${practiceLeft(p)} sessions left this year`, `${practiceLeft(p)} sessions remain this year`)} right={p.age >= 16 ? naira(I(p, 20_000)) : undefined} disabled={practiceLeft(p) <= 0} onClick={() => run({ t: "bl", op: "practice" })} />
    </ListGroup>
  );
}

export function DnaRow({ p, run }: { p: Player; run: Run }) {
  if (p.age < 16) return null;
  return <ListRow emoji="🧬" tile="bg-violet-100" name={T("DNA ancestry test", "DNA ancestry test")} desc={p.flags.dnaText ? String(p.flags.dnaText) : T("Find out where your people really come from", "Find where your people really come from")} right={p.flags.dnaText ? undefined : naira(I(p, DNA_COST))} disabled={Boolean(p.flags.dnaText) || p.money < I(p, DNA_COST)} onClick={() => run({ t: "bl", op: "dna" })} wrap />;
}
