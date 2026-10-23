"use client";

import { useState } from "react";
import { JOBS, STATE_BY_ID, payMult, type JobDef } from "./data";
import { applyBlock, expandCost, type Action } from "./engine";
import { eligibleJobs, jobDef, qualifyBlock } from "./helpers";
import { officeTitle } from "./politics";
import { meritOf } from "./military";
import { DegreeCard } from "./CampusUI";
import { ActionSheet, Bar, Btn, ListGroup, ListRow } from "./ui";
import { KIT_NAMES, MARK_KINDS, kitCost, kitLevel, launderCost, marksOf, sessionsLeft, skillOf } from "./yahoo";
import { candidatesFor } from "./realtor";
import { PPA_BY_ID } from "./nysc";
import { HOUSE_KINDS } from "./data";
import { LOCATION_BY_ID } from "./locations";
import type { Player } from "./types";
import { T, naira } from "./util";

type Run = (a: Action) => void;

const JOB_EMOJI: Record<string, string> = {
  akara: "🥘", corn: "🌽", purewater: "💧", pos: "💳", suya: "🍢", thrift: "👕", barber: "💈", tailor: "🧵", salon: "💇", phone: "📱", mechanic: "🔧", keke: "🛺", provisions: "🛒", conductor: "🚌", guard: "💂", rideapp: "🚖", attendant: "🏪",
  teacher: "📚", nurse: "🩺", doctor: "👨‍⚕️", lawyer: "⚖️", engineer: "🏗️", dev: "💻", banker: "🏦", accountant: "🧮", civil: "🏛️", oil: "🛢️", police: "👮", soldier: "🪖", navy: "⚓", airforce: "✈️", journalist: "📰",
  actor: "🎬", singer: "🎤", creator: "🎥", tiktoker: "🎵", influencer: "📸", youtuber: "▶️", streamer: "🎮", fitness: "💪", comedian: "😂", model: "👗", yahoo: "💻", kidnapper: "🕶️",
};
const GROUP_TILE: Record<string, string> = { petty: "bg-amber-100", formal: "bg-sky-100", creative: "bg-violet-100", crime: "bg-rose-100" };

const HUSTLE_CATS: { id: string; title: () => string; sub: () => string }[] = [
  { id: "food", title: () => T("Food and market hustles", "Food and market hustle"), sub: () => T("Start small, sell daily, grow into a brand.", "Start small, sell daily, grow am reach brand.") },
  { id: "move", title: () => T("Transport and delivery", "Transport and delivery"), sub: () => T("Bikes, buses and parcels.", "Bike, bus and parcel.") },
  { id: "trade", title: () => T("Skilled trades", "Skilled trades"), sub: () => T("Work with your hands. Contracts follow reputation.", "Work with your hand. Contract dey follow name.") },
  { id: "style", title: () => T("Beauty, fashion and events", "Beauty, fashion and events"), sub: () => T("Owambe season is your season.", "Owambe season na your season.") },
  { id: "money", title: () => T("Money, property and trading", "Money, property and trading"), sub: () => T("POS, agents, dealers and brokers.", "POS, agent, dealer and broker.") },
];
const CAT_OF: Record<string, string> = {
  akara: "food", corn: "food", purewater: "food", suya: "food", bole: "food", marketwoman: "food", fishseller: "food", breadseller: "food", provisions: "food", scrap: "food",
  keke: "move", okada: "move", dispatch: "move",
  mechanic: "trade", mason: "trade", plumber: "trade", electrician: "trade", carpenter: "trade", tiler: "trade", generator: "trade", solar: "trade", phone: "trade", gasretail: "trade", cobbler: "trade", laundry: "trade",
  barber: "style", tailor: "style", salon: "style", makeup: "style", photographer: "style", decor: "style", dj: "style", mc: "style", graphic: "style", thrift: "style", tutor: "style",
  pos: "money", bdc: "money", recharge: "money", realtor: "money", cement: "money",
};
const catOf = (id: string) => CAT_OF[id] ?? "money";

export function lockReason(p: Player, j: JobDef): string | null {
  const q = qualifyBlock(p, j);
  if (q) return q;
  const st = STATE_BY_ID[p.state];
  if (st.opp < j.minOpp) return T(`Needs a bigger market (opportunity ${j.minOpp}+)`, `E need bigger market (opportunity ${j.minOpp}+)`);
  return null;
}

function JobSheet({ p, j, run, onClose }: { p: Player; j: JobDef; run: Run; onClose: () => void }) {
  const st = STATE_BY_ID[p.state];
  const block = applyBlock(p, j.id);
  const pay = naira(j.ladder[0].pay * payMult(j, st) * Math.pow(p.index, 0.92));
  const go = (a: Action) => { run(a); onClose(); };
  return (
    <ActionSheet emoji={j.emoji ?? JOB_EMOJI[j.id] ?? "💼"} tile={GROUP_TILE[j.group]} title={j.title} sub={`~${pay}${T("/yr to start", "/yr to start")}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">{j.blurb}</p>
      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
        {j.ladder.slice(0, 4).map((r, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5">{r.title}</span>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn disabled={Boolean(block)} onClick={() => go({ t: "apply", job: j.id })}>
          {j.selfEmployed ? T(`Start (${naira(j.startCost * Math.pow(p.index, 0.9))})`, `Start (${naira(j.startCost * Math.pow(p.index, 0.9))})`) : T("Apply", "Apply")}
        </Btn>
        {!j.selfEmployed && j.group === "formal" && (
          <Btn tone="ghost" disabled={Boolean(block) || p.money < 300_000 * p.index} onClick={() => go({ t: "apply", job: j.id, bribe: true })}>
            {T(`Apply + 'settle' (${naira(300_000 * p.index)})`, `Apply + 'settle' (${naira(300_000 * p.index)})`)}
          </Btn>
        )}
      </div>
      {block && <p className="mt-2 text-xs text-red-600">{block}</p>}
    </ActionSheet>
  );
}

export function JobsView({ p, run }: { p: Player; run: Run }) {
  const [pick, setPick] = useState<JobDef | null>(null);
  const [mine, setMine] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const st = STATE_BY_ID[p.state];
  const cur = jobDef(p);
  const eligible = eligibleJobs(p);
  const cost = expandCost(p);
  const locked = JOBS.filter((j) => j.id !== "kidnapper" && !eligible.includes(j));
  const pay = (j: JobDef) => `~${naira(j.ladder[0].pay * payMult(j, st) * Math.pow(p.index, 0.92))}${T("/yr", "/yr")}`;
  const rows = (jobs: JobDef[]) => jobs.map((j) => (
    <ListRow key={j.id} emoji={j.emoji ?? JOB_EMOJI[j.id] ?? "💼"} tile={GROUP_TILE[j.group]} name={j.title} desc={j.blurb} right={pay(j)} onClick={() => setPick(j)} />
  ));
  const section = (title: string, sub: string, jobs: JobDef[]) => jobs.length > 0 && <ListGroup title={title} sub={sub}>{rows(jobs)}</ListGroup>;
  return (
    <>
      <ListGroup title={T("You", "You")}>
        <ListRow
          emoji={cur ? cur.emoji ?? JOB_EMOJI[cur.id] ?? "💼" : "🧑"} tile="bg-blue-100"
          name={p.job && cur ? cur.ladder[Math.min(p.job.rank, cur.ladder.length - 1)].title : p.politics && p.politics.office >= 0 ? officeTitle(p) : T("Not working", "No dey work")}
          desc={p.job && cur ? `${cur.title} · ${T(`${p.job.years} yr in this role`, `${p.job.years} yr for this role`)}${["soldier", "navy", "airforce", "police"].includes(cur.id) ? ` · ${T("service record", "service record")} ${meritOf(p)}/100` : ""}` : T("Pick something below or hustle", "Pick one thing below or go hustle")}
          onClick={p.job && cur ? () => setMine(true) : undefined}
        />
        <ListRow
          emoji="🎓" tile="bg-violet-100" name={T("Education", "Education")}
          desc={p.school ? T(`In school · ${p.school.yearsLeft} yr left`, `You dey school · ${p.school.yearsLeft} yr remain`) : p.edu === "none" ? T("No schooling yet", "You never go school yet") : `${p.edu}${p.course ? ` · ${p.course}` : ""}`}
        />
      </ListGroup>
      <div className="-mt-2 mb-3 px-1"><DegreeCard p={p} run={run} /></div>
      {p.age >= 14 && (
        <>
          {p.edu === "tertiary" && section(T("Careers for your degree", "Careers for your degree"), T("Your degree decides which of these you can apply for.", "Your degree go decide which of these you fit apply for."), eligible.filter((j) => j.group === "formal" && j.edu === "tertiary"))}
          {HUSTLE_CATS.map((c) => section(c.title(), c.sub(), eligible.filter((j) => j.selfEmployed && catOf(j.id) === c.id)))}
          {section(T("Everyday jobs", "Everyday jobs"), T("Apply and get hired. Promotions come with time and connections.", "Apply and get hired. Promotion dey come with time and connections."), eligible.filter((j) => !j.selfEmployed && j.group === "petty"))}
          {p.edu !== "tertiary" && section(T("Professional careers", "Professional careers"), T("Your degree decides which of these you can apply for.", "Your degree go decide which of these you fit apply for."), eligible.filter((j) => j.group === "formal" && j.edu === "tertiary"))}
          {section(T("Government and uniformed services", "Government and uniform work"), T("Steady work, pension and long ladders.", "Steady work, pension and long ladder."), eligible.filter((j) => j.group === "formal" && j.edu !== "tertiary"))}
          {section(T("Creative careers", "Creative work"), T("Slow start, huge upside.", "Start slow, but the gain big."), eligible.filter((j) => j.group === "creative"))}
          {section(T("Risky paths", "Risky road"), T("Fast money. Heavy consequences.", "Fast money. Heavy wahala."), eligible.filter((j) => j.group === "crime"))}
          {locked.length > 0 && (
            <ListGroup title={T(`Not yet (${locked.length})`, `Not yet (${locked.length})`)} sub={T("School, a degree course or a skill unlocks these.", "School, degree course or skill go unlock these.")}>
              {(showLocked ? locked : locked.slice(0, 6)).map((j) => <ListRow key={j.id} emoji="🔒" tile="bg-slate-100" name={j.title} desc={lockReason(p, j) ?? ""} wrap />)}
              {locked.length > 6 && <ListRow emoji={showLocked ? "▴" : "▾"} tile="bg-slate-100" name={showLocked ? T("Show fewer", "Show less") : T(`Show all ${locked.length}`, `Show all ${locked.length}`)} onClick={() => setShowLocked(!showLocked)} />}
            </ListGroup>
          )}
        </>
      )}
      {pick && <JobSheet p={p} j={pick} run={run} onClose={() => setPick(null)} />}
      {mine && cur && p.job && (
        <ActionSheet emoji={cur.emoji ?? JOB_EMOJI[cur.id] ?? "💼"} tile={GROUP_TILE[cur.group]} title={cur.ladder[Math.min(p.job.rank, cur.ladder.length - 1)].title} sub={cur.title} onClose={() => setMine(false)}>
          <div className="flex flex-wrap gap-2">
            {cost !== null && <Btn tone="gold" disabled={p.money < cost} onClick={() => { run({ t: "expand" }); setMine(false); }}>{T(`Expand business (${naira(cost)})`, `Expand business (${naira(cost)})`)}</Btn>}
            <Btn tone="ghost" onClick={() => { run({ t: "quit" }); setMine(false); }}>{T("Quit", "Quit")}</Btn>
          </div>
          {cur.selfEmployed && cost !== null && <p className="mt-2 text-[11px] text-slate-500">{T(`Next: ${cur.ladder[p.job.rank + 1].title}. Invest in your business to grow it. Moving to another state leaves it behind.`, `Next: ${cur.ladder[p.job.rank + 1].title}. Put money inside your business make am grow. If you move go another state, you leave am.`)}</p>}
        </ActionSheet>
      )}
    </>
  );
}

/** Estate agent desk: clients who want to buy or rent, and the properties to show them. */
export function RealtorView({ p, run }: { p: Player; run: Run }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const clients = p.clients ?? [];
  const c = clients.find((x) => x.id === clientId) ?? null;
  return (
    <>
      <ListGroup title={T("Your clients", "Your clients")} sub={T(`${p.dealsClosed ?? 0} deals closed. Commission: 3% on sales, 10% of a year's rent on lettings. ${p.actionsLeft} actions left this year.`, `${p.dealsClosed ?? 0} deals don close. Commission: 3% for sales, 10% of one year rent for letting. ${p.actionsLeft} action remain this year.`)}>
        {clients.length === 0 && <ListRow emoji="📭" tile="bg-slate-100" name={T("No clients right now", "No client now")} desc={T("Advertise to find some", "Advertise to find some")} />}
        {clients.map((x) => (
          <ListRow key={x.id} emoji={x.want === "buy" ? "🛒" : "🔑"} tile={x.want === "buy" ? "bg-emerald-100" : "bg-sky-100"} name={x.name}
            desc={`${x.want === "buy" ? T("Wants to buy", "Wan buy") : T("Wants to rent", "Wan rent")} ${HOUSE_KINDS[x.kind].label.toLowerCase()} · ${T("mood", "mood")} ${Math.round(x.mood)}`}
            right={naira(x.budget)} onClick={() => setClientId(x.id)} />
        ))}
        <ListRow emoji="📣" tile="bg-amber-100" name={T("Advertise for clients", "Advertise for clients")} desc={T("Flyers, WhatsApp status and site boards", "Flyer, WhatsApp status and site board")} right={naira(25_000 * p.index)} onClick={() => run({ t: "realtor", op: "find" })} />
      </ListGroup>
      {c && (
        <ActionSheet emoji={c.want === "buy" ? "🛒" : "🔑"} tile="bg-emerald-100" title={c.name} sub={`${c.want === "buy" ? T("Buying", "Buying") : T("Renting", "Renting")} · ${naira(c.budget)}`} onClose={() => setClientId(null)}>
          <ListGroup title={T("Properties to show", "Properties to show")} sub={T("The better the fit, the better your chance. Each viewing uses one action.", "The better the fit, the better your chance. Each viewing use one action.")}>
            {candidatesFor(p, c).map(({ l, fit }) => (
              <ListRow key={l.id} emoji="🏠" tile="bg-amber-100" name={`${HOUSE_KINDS[l.kind].label} · ${LOCATION_BY_ID[l.loc ?? ""]?.name ?? l.stateId}`}
                desc={`${l.condition} · ${T("fit", "fit")} ${fit}%`} right={naira(l.price)} disabled={p.actionsLeft <= 0} onClick={() => { run({ t: "realtor", op: "show", client: c.id, listing: l.id }); }} />
            ))}
          </ListGroup>
        </ActionSheet>
      )}
    </>
  );
}

/** What school looks like for a child, and what to do about it. */
export function SchoolPanel({ p }: { p: Player }) {
  const sc = p.school;
  if (!sc) return null;
  const type = String(p.flags.schoolType ?? "public");
  return (
    <ListGroup title={sc.stage === "primary" ? T("Primary school", "Primary school") : T("Secondary school", "Secondary school")} sub={T("Use the Study activity on the life screen to do better. Marks, friends and teachers shape how school goes.", "Use Study for life screen to do better. Marks, friends and teacher dey shape how school go.")}>
      <ListRow emoji={sc.stage === "primary" ? "🎒" : "🏫"} tile="bg-sky-100" name={T(`${sc.yearsLeft} year${sc.yearsLeft === 1 ? "" : "s"} left`, `${sc.yearsLeft} year${sc.yearsLeft === 1 ? "" : "s"} remain`)} desc={type === "elite" ? T("International school", "International school") : type === "private" ? T("Private school", "Private school") : T("Public school", "Public school")} />
      <ListRow emoji="🧠" tile="bg-violet-100" name={T("Smarts", "Smarts")} right={`${Math.round(p.stats.smarts)}%`} />
      {p.flags.boarding ? <ListRow emoji="🛏️" tile="bg-amber-100" name={T("Boarding house", "Boarding house")} desc={T("You live at school", "You dey live for school")} /> : null}
    </ListGroup>
  );
}

/** The service year at a glance. */
export function NyscPanel({ p }: { p: Player }) {
  const ppa = PPA_BY_ID[String(p.flags.nyscPpa ?? "")];
  const state = STATE_BY_ID[String(p.flags.nyscPosted ?? p.state)]?.name;
  const camp = Number(p.flags.nyscCamp ?? -1);
  return (
    <ListGroup title={T("National Youth Service", "National Youth Service")} sub={T("One year. Do well at your PPA and they may keep you. Formal jobs open after pass-out.", "One year. Do well for your PPA and dem fit keep you. Formal job go open after pass-out.")}>
      <ListRow emoji="📍" tile="bg-emerald-100" name={T("Posted to", "Posted to")} right={state} />
      <ListRow emoji="⛺" tile="bg-amber-100" name={T("Orientation camp", "Orientation camp")} right={camp < 0 ? T("Skipped", "Skipped") : `${camp}/9`} />
      <ListRow emoji={ppa?.emoji ?? "🏢"} tile="bg-sky-100" name={T("Place of primary assignment", "Place of primary assignment")} desc={ppa ? T(ppa.name[0], ppa.name[1]) : T("Not yet placed", "Never place you")} wrap />
      <ListRow emoji="💵" tile="bg-emerald-100" name={T("Monthly allowance", "Monthly allowance")} right={naira(77_000 * p.index)} />
      <ListRow emoji="⭐" tile="bg-violet-100" name={T("Your standing at the PPA", "Your standing for PPA")} right={`${Math.round(Number(p.flags.nyscPerf ?? 50))}/100`} />
    </ListGroup>
  );
}

/** The Yahoo hustle as a game: find clients, build trust, cash out, keep EFCC away. */
export function YahooPanel({ p, run }: { p: Player; run: Run }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const marks = marksOf(p);
  const m = marks.find((x) => x.id === openId) ?? null;
  const left = sessionsLeft(p);
  const heat = p.crime.heat;
  return (
    <>
      <ListGroup title={T("The hustle", "The hustle")} sub={T("Illegal, and EFCC is real. The more you earn and show off, the hotter it gets.", "E dey illegal, and EFCC dey o. The more you make and show off, the hotter e go be.")}>
        <div className="grid grid-cols-2 gap-3 px-3.5 py-3">
          <Bar label={T("EFCC attention", "EFCC attention")} value={heat} tone="red" />
          <Bar label={T("Your skill", "Your skill")} value={skillOf(p)} tone="blue" />
        </div>
        <ListRow emoji="⏱️" tile="bg-slate-100" name={T("Sessions left this year", "Sessions wey remain this year")} right={`${left}`} />
        <ListRow emoji="💻" tile="bg-sky-100" name={T("Your setup", "Your setup")} desc={T(KIT_NAMES[kitLevel(p)][0], KIT_NAMES[kitLevel(p)][1])} right={kitLevel(p) >= 3 ? undefined : naira(kitCost(p))} onClick={kitLevel(p) >= 3 ? undefined : () => run({ t: "yahoo", op: "kit" })} note={kitLevel(p) >= 3 ? undefined : T("Tap to upgrade: more clients, lower risk", "Tap to upgrade: more clients, less risk")} />
        <ListRow emoji="🔎" tile="bg-amber-100" name={T("Look for clients", "Look for clients")} desc={T("Costs data and airtime", "E go cost data and airtime")} disabled={left <= 0} onClick={() => run({ t: "yahoo", op: "hunt" })} />
      </ListGroup>
      <ListGroup title={T(`Clients (${marks.length})`, `Clients (${marks.length})`)}>
        {marks.length === 0 ? <ListRow emoji="📭" tile="bg-slate-100" name={T("No clients yet", "No client yet")} desc={T("Look for some first.", "Find some first.")} /> : marks.map((x) => {
          const k = MARK_KINDS[x.kind];
          return <ListRow key={x.id} emoji={k.emoji} tile="bg-violet-100" name={`${x.name} · ${T(k.en, k.pcm)}`} desc={T(`Trust ${Math.round(x.trust)}% · suspicion ${Math.round(x.wary)}%`, `Trust ${Math.round(x.trust)}% · suspicion ${Math.round(x.wary)}%`)} right={"₦".repeat(x.deep)} onClick={() => setOpenId(x.id)} />;
        })}
      </ListGroup>
      <ListGroup title={T("Stay free", "Stay free")}>
        <ListRow emoji="🤫" tile="bg-sky-100" name={T("Lie low", "Lie low")} desc={T("Heat goes down. Uses a session.", "Heat go reduce. E use one session.")} disabled={left <= 0} onClick={() => run({ t: "yahoo", op: "low" })} />
        <ListRow emoji="🧼" tile="bg-emerald-100" name={T("Wash the money", "Wash the money")} desc={T("POS shops and a business front", "POS shops and business front")} right={naira(launderCost(p))} disabled={p.money < launderCost(p)} onClick={() => run({ t: "yahoo", op: "launder" })} />
        <ListRow emoji="🤝" tile="bg-amber-100" name={T("Settle a contact", "Settle contact")} desc={T("A friend in the right office", "Friend for correct office")} onClick={() => run({ t: "yahoo", op: "settle" })} />
        <ListRow emoji="🚪" tile="bg-rose-100" name={T("Quit and go legit", "Quit and go legit")} onClick={() => run({ t: "yahoo", op: "quit" })} />
      </ListGroup>
      {m && (
        <ActionSheet emoji={MARK_KINDS[m.kind].emoji} tile="bg-violet-100" title={`${m.name} · ${T(MARK_KINDS[m.kind].en, MARK_KINDS[m.kind].pcm)}`} sub={T(`Trust ${Math.round(m.trust)}% · suspicion ${Math.round(m.wary)}% · worked ${m.rounds} time${m.rounds === 1 ? "" : "s"}`, `Trust ${Math.round(m.trust)}% · suspicion ${Math.round(m.wary)}% · worked ${m.rounds} time${m.rounds === 1 ? "" : "s"}`)} onClose={() => setOpenId(null)}>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            <ListRow emoji="💬" tile="bg-sky-100" name={T("Chat them up", "Gist am up")} desc={T("Slow and safe. Builds a little trust.", "Slow and safe. Build small trust.")} disabled={left <= 0} onClick={() => run({ t: "yahoo", op: "work", id: m.id, how: "chat" })} />
            <ListRow emoji="📖" tile="bg-amber-100" name={T("Tell a story", "Tell story")} desc={T("Builds more trust, a bit riskier.", "Build more trust, small risk.")} disabled={left <= 0} onClick={() => run({ t: "yahoo", op: "work", id: m.id, how: "story" })} />
            <ListRow emoji="⚡" tile="bg-rose-100" name={T("Push hard", "Push hard")} desc={T("Fast trust, but they may run and report.", "Fast trust, but dem fit run and report.")} disabled={left <= 0} onClick={() => run({ t: "yahoo", op: "work", id: m.id, how: "pressure" })} />
            <ListRow emoji="💰" tile="bg-emerald-100" name={T("Ask for the money", "Ask for the money")} desc={T(`Chance rises with trust (now ${Math.round(m.trust)}%).`, `Chance rise with trust (now ${Math.round(m.trust)}%).`)} disabled={left <= 0} onClick={() => { run({ t: "yahoo", op: "cash", id: m.id }); setOpenId(null); }} />
            <ListRow emoji="🗑️" tile="bg-slate-100" name={T("Drop this client", "Drop this client")} onClick={() => { run({ t: "yahoo", op: "drop", id: m.id }); setOpenId(null); }} />
          </div>
        </ActionSheet>
      )}
    </>
  );
}
