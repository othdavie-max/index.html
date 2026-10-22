"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase, Crown, Gavel, HeartPulse, Hourglass, Map as MapIcon, Share2, Smartphone, Trophy, Users, Wallet,
} from "lucide-react";
import {
  ALL_TRIBES, HOUSE_KINDS, INVESTMENTS, JOBS, LUXURIES, OFFICES, RELIGIONS, STATES, STATE_BY_ID, TRAVEL_STATES, payMult, travelCost,
  type JobDef,
} from "./data";
import {
  ACTIVITIES, act, activityBlock, ageUp, ackKidnap, applyBlock, buildCost, choose, describePending, expandCost, kidnapAction, migrate, newGame, startHeir, startNewFamily,
  type Action, worth,
} from "./engine";
import { eduAtLeast, eligibleJobs, jobDef, jobTitle } from "./helpers";
import { Avatar } from "./Avatar";
import { KidnapModal } from "./KidnapModal";
import { BEARDS, HAIRS, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKINS, WEARS, displayLook, randomLook, strToLook, type Look } from "./look";
import { luxuryBlock, luxuryCost } from "./lifestyle";
import { GOV_ACTIONS, POWER_MOVES, canContest, canJoinPolitics, canPlotCoup, currentZone, officeTitle, playerZone, powerMoveBlock, powerMoveCost } from "./politics";
import { MortgageCard, TradeCard, BusinessCard, GarageCard, HealthTab, HousingCard, LawTab, LedgerCard, NetWorthCard, PeopleCard, PhoneTab, SkillsCard, SubsCard, WillCard } from "./Panels";
import { shareCard } from "./share";
import type { Game, Gender, LineageEntry, Player } from "./types";
import { Badge, Bar, Btn, Card, H, Meter, Sheet, cx } from "./ui";
import { chance, naira, setDeflator } from "./util";

const SAVE_KEY = "naija-life-save-v1";
type Tab = "life" | "phone" | "work" | "money" | "family" | "health" | "law" | "map" | "power" | "legacy";

const TABS: { id: Tab; label: string; icon: typeof Hourglass }[] = [
  { id: "life", label: "Life", icon: Hourglass },
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "money", label: "Money", icon: Wallet },
  { id: "family", label: "Family", icon: Users },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "law", label: "Law", icon: Gavel },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "power", label: "Power", icon: Crown },
  { id: "legacy", label: "Legacy", icon: Trophy },
];

function loadSave(): Game | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Game;
    return g && g.p && g.dynasty ? migrate(g) : null;
  } catch {
    return null;
  }
}
function writeSave(g: Game | null) {
  try {
    if (g) localStorage.setItem(SAVE_KEY, JSON.stringify(g));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable: play without saving */
  }
}

export default function NaijaLife() {
  const [game, setGame] = useState<Game | null>(null);
  const [saved, setSaved] = useState<Game | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("life");
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [cardImg, setCardImg] = useState<{ url: string; text: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadSave());
    setReady(true);
  }, []);

  useEffect(() => {
    const onImg = (e: Event) => setCardImg((e as CustomEvent<{ url: string; text: string }>).detail);
    window.addEventListener("naija-share-image", onImg);
    return () => window.removeEventListener("naija-share-image", onImg);
  }, []);

  useEffect(() => {
    if (ready && game) writeSave(game);
  }, [game, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const run = (a: Action) => {
    if (!game) return;
    const r = act(game, a);
    setGame(r.g);
    if (r.msg) setToast(r.msg);
  };

  if (!ready) return <div className="min-h-screen bg-[#07130e]" />;

  if (!game) {
    return (
      <Shell>
        <StartScreen
          hasSave={Boolean(saved)}
          onContinue={() => saved && setGame(saved)}
          onStart={(o) => {
            writeSave(null);
            setGame(newGame(o));
            setTab("life");
          }}
        />
      </Shell>
    );
  }

  const p = game.p;
  setDeflator(p.index);
  const view = result === null ? describePending(game) : null;
  const evHead = game.queue[0];
  const evLook = evHead && evHead.kind === "event" && typeof evHead.data.look === "string" ? strToLook(evHead.data.look) : null;
  const kidnap = result === null && game.queue[0]?.kind === "kidnap" ? game.queue[0] : null;
  const busy = game.queue.length > 0 || result !== null;

  return (
    <Shell>
      <Header p={p} onMenu={() => setMenu(true)} />
      <main className="flex-1 space-y-3 px-4 pb-44 pt-3">
        {tab === "life" && <LifeTab g={game} run={run} />}
        {tab === "phone" && <PhoneTab p={p} run={run} />}
        {tab === "health" && <HealthTab p={p} run={run} />}
        {tab === "law" && <LawTab p={p} run={run} />}
        {tab === "work" && <WorkTab p={p} run={run} />}
        {tab === "money" && <MoneyTab p={p} run={run} />}
        {tab === "family" && <FamilyTab p={p} run={run} />}
        {tab === "map" && <MapTab p={p} run={run} />}
        {tab === "power" && <PowerTab p={p} run={run} />}
        {tab === "legacy" && <LegacyTab g={game} />}
      </main>

      {toast && (
        <div className="fixed inset-x-0 bottom-36 z-40 mx-auto w-[92%] max-w-md rounded-xl border border-[#f5b82e]/40 bg-[#1c2a10] px-4 py-2.5 text-center text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-white/10 bg-[#07130e]/95 backdrop-blur">
        <div className="px-4 pt-3">
          <Btn tone="gold" className="w-full py-3 text-base" disabled={busy || !p.alive} onClick={() => { setGame(ageUp(game)); setTab("life"); }}>
            Age up → {p.age + 1}
          </Btn>
        </div>
        <nav className="mt-2 flex overflow-x-auto px-1 pb-2" aria-label="Game sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx("flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold", tab === t.id ? "text-[#f5b82e]" : "text-white/50")}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {result !== null && (
        <Sheet>
          <p className="text-base leading-relaxed text-white">{result}</p>
          <Btn className="mt-4 w-full" onClick={() => setResult(null)}>Continue</Btn>
        </Sheet>
      )}

      {view && p.alive && (
        <Sheet title={view.title}>
          {evLook && (
            <div className="mb-3 flex justify-center">
              <Avatar look={evLook} gender={p.gender === "male" ? "female" : "male"} age={26} mood={75} size={110} />
            </div>
          )}
          <p className="text-[15px] leading-relaxed text-white/90">{view.text}</p>
          <div className="mt-4 space-y-2">
            {view.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={Boolean(c.disabled)}
                onClick={() => {
                  const r = choose(game, i);
                  setGame(r.g);
                  setResult(r.text);
                }}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="block text-sm font-semibold text-white">{c.label}</span>
                {(c.sub || c.disabled) && <span className={cx("block text-xs", c.disabled ? "text-red-300" : "text-[#f5b82e]")}>{c.disabled || c.sub}</span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {kidnap && kidnap.kind === "kidnap" && p.alive && (
        <KidnapModal
          p={p}
          k={kidnap.k}
          onAction={(a) => setGame(kidnapAction(game, a))}
          onDone={() => setGame(ackKidnap(game))}
        />
      )}
      {kidnap && kidnap.kind === "kidnap" && !p.alive && kidnap.k.stage === "over" && (
        <KidnapModal p={p} k={kidnap.k} onAction={() => {}} onDone={() => setGame(ackKidnap(game))} />
      )}

      {!p.alive && !busy && (
        <DeathScreen
          g={game}
          onHeir={(i) => { setGame(startHeir(game, i)); setTab("life"); }}
          onNew={(o) => { setGame(startNewFamily(game, o)); setTab("life"); }}
        />
      )}

      {cardImg && (
        <Sheet title="Your card" onClose={() => setCardImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImg.url} alt="Share card" className="w-full rounded-xl" />
          <p className="mt-3 text-xs text-white/60">Press and hold the image to save it, or take a screenshot, then post it.</p>
          <Btn tone="ghost" className="mt-3 w-full" onClick={() => { try { void navigator.clipboard.writeText(cardImg.text); } catch { /* clipboard blocked */ } }}>Copy caption</Btn>
        </Sheet>
      )}

      {menu && (
        <Sheet title="Menu" onClose={() => setMenu(false)}>
          <p className="text-sm text-white/70">Your life is saved automatically on this device.</p>
          <div className="mt-4 space-y-2">
            <Btn tone="ghost" className="w-full" onClick={() => setMenu(false)}>Back to the game</Btn>
            <Btn tone="red" className="w-full" onClick={() => { writeSave(null); setSaved(null); setGame(null); setMenu(false); }}>Abandon this life & start over</Btn>
          </div>
        </Sheet>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050e09] font-sans text-white" style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-[#07130e] shadow-2xl shadow-black">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start screen
// ---------------------------------------------------------------------------
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx("rounded-full border px-3 py-1.5 text-xs font-semibold transition", active ? "border-[#f5b82e] bg-[#f5b82e]/15 text-[#f5b82e]" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10")}>
      {children}
    </button>
  );
}

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cx("h-8 w-8 rounded-full border-2 transition", active ? "border-[#f5b82e] scale-110" : "border-white/20")} style={{ background: color }} />
  );
}

type NewOpts = { name: string; gender: Gender; stateId: string | null; tribe: string | null; religion: string | null; look: Look };

function StartScreen({ onStart, hasSave, onContinue }: { onStart: (o: NewOpts) => void; hasSave: boolean; onContinue: () => void }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [stateId, setStateId] = useState("");
  const [tribe, setTribe] = useState("");
  const [religion, setReligion] = useState("");
  const [look, setLook] = useState<Look>(() => randomLook("male", { region: "South West" }));
  const field = "mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f5b82e]";
  const set = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }));
  const regionNow = () => (stateId ? STATE_BY_ID[stateId]?.region : undefined);
  const reroll = (g: Gender = gender) => setLook(randomLook(g, { region: regionNow(), religion: religion || undefined }));
  return (
    <div className="flex-1 px-5 pb-10 pt-10">
      <div className="h-1.5 w-full overflow-hidden rounded-full">
        <div className="flex h-full"><div className="flex-1 bg-[#1f9d55]" /><div className="flex-1 bg-white" /><div className="flex-1 bg-[#1f9d55]" /></div>
      </div>
      <h1 className="mt-6 font-serif text-5xl font-black leading-[1.05] text-white">Naija<br /><span className="text-[#f5b82e]">Life</span></h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">Live a whole Nigerian life: from akara by the roadside to Aso Rock. Hustle, travel between states, build houses, survive NEPA, dodge kidnappers, and leave a legacy your children inherit.</p>

      {hasSave && <Btn tone="gold" className="mt-6 w-full" onClick={onContinue}>Continue your life</Btn>}

      <Card className="mt-6 space-y-4">
        <H>Your look</H>
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-4 border-b border-white/10 bg-[#0e2218] px-4 py-3">
          <Avatar look={look} gender={gender} age={22} mood={72} size={112} />
          <div className="space-y-2">
            <p className="text-xs text-white/60">Your parents, partner and children will look like family.</p>
            <Btn small tone="ghost" onClick={() => reroll()}>Randomise look</Btn>
          </div>
        </div>
        <div>
          <span className="text-xs text-white/70">Skin tone</span>
          <div className="mt-1.5 flex flex-wrap gap-2">{SKINS.map((c, i) => <Swatch key={c} color={c} label={`Skin tone ${i + 1}`} active={look.skin === i} onClick={() => set({ skin: i })} />)}</div>
        </div>
        <div>
          <span className="text-xs text-white/70">Hairstyle</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{HAIRS.map((h) => <Chip key={h.id} active={look.hair === h.id} onClick={() => set({ hair: h.id })}>{h.label}</Chip>)}</div>
        </div>
        <div>
          <span className="text-xs text-white/70">Hair colour</span>
          <div className="mt-1.5 flex flex-wrap gap-2">{HAIR_COLORS.map((c, i) => <Swatch key={c} color={c} label={`Hair colour ${i + 1}`} active={look.hairColor === i} onClick={() => set({ hairColor: i })} />)}</div>
        </div>
        {gender === "male" && (
          <div>
            <span className="text-xs text-white/70">Beard</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{BEARDS.map((b) => <Chip key={b.id} active={look.beard === b.id} onClick={() => set({ beard: b.id })}>{b.label}</Chip>)}</div>
          </div>
        )}
        <div>
          <span className="text-xs text-white/70">Cap or headwear</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{WEARS.map((w) => <Chip key={w.id} active={look.wear === w.id} onClick={() => set({ wear: w.id })}>{w.label}</Chip>)}</div>
        </div>
        <div>
          <span className="text-xs text-white/70">Outfit</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{OUTFITS.map((o) => <Chip key={o.id} active={look.outfit === o.id} onClick={() => set({ outfit: o.id })}>{o.label}</Chip>)}</div>
          <div className="mt-2 flex flex-wrap gap-2">{OUTFIT_COLORS.map((c, i) => <Swatch key={c} color={c} label={`Outfit colour ${i + 1}`} active={look.outfitColor === i} onClick={() => set({ outfitColor: i })} />)}</div>
        </div>
      </Card>

      <Card className="mt-4 space-y-4">
        <H>New life</H>
        <label className="block text-xs text-white/70">Name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Bello" className={field} maxLength={32} />
        </label>
        <div>
          <span className="text-xs text-white/70">Gender</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button key={g} type="button" onClick={() => { setGender(g); reroll(g); }} className={cx("rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize", gender === g ? "border-[#f5b82e] bg-[#f5b82e]/15 text-[#f5b82e]" : "border-white/15 bg-white/5 text-white/70")}>{g}</button>
            ))}
          </div>
        </div>
        <label className="block text-xs text-white/70">Born in
          <select value={stateId} onChange={(e) => setStateId(e.target.value)} className={field}>
            <option value="">Random (like real life)</option>
            {TRAVEL_STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/70">Tribe
          <select value={tribe} onChange={(e) => setTribe(e.target.value)} className={field}>
            <option value="">Based on state</option>
            {ALL_TRIBES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/70">Religion
          <select value={religion} onChange={(e) => setReligion(e.target.value)} className={field}>
            <option value="">Random</option>
            {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <Btn className="w-full py-3 text-base" onClick={() => onStart({ name, gender, stateId: stateId || null, tribe: tribe || null, religion: religion || null, look })}>Be born 🇳🇬</Btn>
      </Card>
      <p className="mt-6 text-center text-[11px] text-white/40">A fictional game. All people, events and results are made up for fun.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function shownLook(p: Player): Look {
  return displayLook(p.look, {
    age: p.age,
    student: Boolean(p.school) && p.school?.stage !== "tertiary",
    soldier: p.job?.id === "soldier",
    office: p.politics?.office,
    military: p.politics?.militaryRuler,
  });
}

function Header({ p, onMenu }: { p: Player; onMenu: () => void }) {
  const st = STATE_BY_ID[p.state];
  const title = officeTitle(p) ?? jobTitle(p);
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07130e]/95 px-4 pb-3 pt-3 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar look={shownLook(p)} gender={p.gender} age={p.age} mood={p.stats.happiness} size={56} dim={!p.alive} />
          <div className="min-w-0">
            <div className="truncate font-serif text-lg font-bold leading-tight">{p.name} {p.surname}</div>
            <div className="text-xs text-white/60">Age {p.age} · {title}</div>
            <div className="mt-0.5 text-xs text-emerald-200/70">📍 {st.name}{p.prison > 0 ? " · in Kuje prison" : ""}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-extrabold text-[#f5b82e]">{naira(p.money)}</div>
          <div className="text-[11px] text-white/50">Worth {naira(worth(p))}{p.debt > 0 ? ` · Debt ${naira(p.debt)}` : ""}</div>
          <button type="button" onClick={onMenu} className="mt-1 text-[11px] text-white/50 underline">Menu</button>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-x-3 gap-y-1.5">
        <Bar label="Health" value={p.stats.health} />
        <Bar label="Happy" value={p.stats.happiness} />
        <Bar label="Smarts" value={p.stats.smarts} tone="blue" />
        <Bar label="Looks" value={p.stats.looks} tone="blue" />
        <Bar label="Stress" value={p.stats.stress} invert />
        <Bar label="Connects" value={p.stats.connections} tone="gold" />
        <Bar label="Rep" value={p.stats.reputation} tone="gold" />
        <Bar label="Family" value={p.family.happy} />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Life tab
// ---------------------------------------------------------------------------
function LifeTab({ g, run }: { g: Game; run: (a: Action) => void }) {
  const p = g.p;
  const logs = useMemo(() => [...p.log].reverse(), [p.log]);
  return (
    <>
      <Card>
        <H sub={`${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} left this year`}>Activities</H>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITIES.filter((a) => p.age >= a.minAge - 2).map((a) => {
            const block = activityBlock(p, a);
            return (
              <button
                key={a.id}
                type="button"
                disabled={Boolean(block)}
                onClick={() => run({ t: "activity", id: a.id })}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs transition hover:bg-white/10 disabled:opacity-40"
              >
                <span className="block font-semibold text-white">{a.label}</span>
                <span className="block text-[11px] text-white/50">{block ?? (a.cost ? `${naira(a.cost * p.index)} · ${a.desc}` : a.desc)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-3">
        {logs.map((e, idx) => (
          <Card key={`${e.age}-${idx}`} className={idx === 0 ? "border-[#f5b82e]/40" : ""}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-bold text-[#f5b82e]">Age {e.age}</span>
            </div>
            <ul className="space-y-1.5">
              {e.lines.map((l, i) => (
                <li key={i} className="text-[14px] leading-snug text-white/90">{l}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Work tab
// ---------------------------------------------------------------------------
function lockReason(p: Player, j: JobDef): string | null {
  if (p.age < j.minAge) return `Age ${j.minAge}+`;
  if (!eduAtLeast(p, j.edu)) return j.edu === "tertiary" ? "Needs a degree" : `Needs ${j.edu} school`;
  if (j.courses && (!p.course || !j.courses.includes(p.course))) return `Needs ${j.courses.slice(0, 2).join(" / ")} degree`;
  const st = STATE_BY_ID[p.state];
  if (st.opp < j.minOpp) return `Needs a bigger market (opportunity ${j.minOpp}+)`;
  return null;
}

function WorkTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const st = STATE_BY_ID[p.state];
  const cur = jobDef(p);
  const eligible = eligibleJobs(p);
  const estPay = (j: JobDef) => naira(j.ladder[0].pay * payMult(j, st) * Math.pow(p.index, 0.92));
  const group = (title: string, jobs: JobDef[], sub?: string) =>
    jobs.length > 0 && (
      <Card>
        <H sub={sub}>{title}</H>
        <div className="space-y-2">
          {jobs.map((j) => {
            const block = applyBlock(p, j.id);
            return (
              <div key={j.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{j.title}</div>
                    <div className="text-[11px] text-white/50">{j.blurb}</div>
                  </div>
                  <Badge tone={j.group === "crime" ? "red" : "green"}>~{estPay(j)}/yr</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Btn small disabled={Boolean(block)} onClick={() => run({ t: "apply", job: j.id })}>
                    {j.selfEmployed ? `Start (${naira(j.startCost * Math.pow(p.index, 0.9))})` : "Apply"}
                  </Btn>
                  {!j.selfEmployed && j.group === "formal" && (
                    <Btn small tone="ghost" disabled={Boolean(block) || p.money < 300_000 * p.index} onClick={() => run({ t: "apply", job: j.id, bribe: true })}>
                      Apply + &apos;settle&apos; ({naira(300_000 * p.index)})
                    </Btn>
                  )}
                  {block && <span className="text-[11px] text-red-300">{block}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  const locked = JOBS.filter((j) => j.id !== "kidnapper" && !eligible.includes(j));
  const cost = expandCost(p);
  return (
    <>
      <Card>
        <H>Education</H>
        <p className="text-sm text-white/85">
          {p.school
            ? `Currently in ${p.school.stage === "tertiary" ? "tertiary school" : `${p.school.stage} school`} (${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} left).`
            : p.edu === "none" ? "No schooling yet." : `Highest level: ${p.edu}${p.course ? ` (${p.course})` : ""}.`}
        </p>
      </Card>

      <Card>
        <H>Your work</H>
        {p.job && cur ? (
          <div>
            <div className="text-lg font-bold">{cur.ladder[Math.min(p.job.rank, cur.ladder.length - 1)].title}</div>
            <div className="text-xs text-white/60">{cur.title} · {p.job.years} yr in this role · Rank {p.job.rank + 1}/{cur.ladder.length}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {cost !== null && (
                <Btn small tone="gold" disabled={p.money < cost} onClick={() => run({ t: "expand" })}>
                  Expand business ({naira(cost)})
                </Btn>
              )}
              <Btn small tone="ghost" onClick={() => run({ t: "quit" })}>Quit</Btn>
            </div>
            {cur.selfEmployed && cost !== null && <p className="mt-2 text-[11px] text-white/50">Next: {cur.ladder[p.job.rank + 1].title}. Invest in your business to grow it. Moving to another state leaves it behind.</p>}
          </div>
        ) : (
          <p className="text-sm text-white/70">{p.politics && p.politics.office >= 0 ? `You hold office as ${officeTitle(p)}.` : "You are not working. Pick something below or hustle."}</p>
        )}
      </Card>

      {p.age >= 14 && (
        <>
          {group("Start a hustle", eligible.filter((j) => j.selfEmployed), "Self-employed. You can grow these into empires.")}
          {group("Jobs", eligible.filter((j) => !j.selfEmployed && (j.group === "petty" || j.group === "formal")), "Salaried work. Promotions come with time and connections.")}
          {group("Creative careers", eligible.filter((j) => j.group === "creative"), "Slow start, huge upside.")}
          {group("Risky paths", eligible.filter((j) => j.group === "crime"), "Fast money. Heavy consequences.")}
          <TradeCard p={p} run={run} />
          <BusinessCard p={p} run={run} />
          <SkillsCard p={p} run={run} />
          {locked.length > 0 && (
            <details className="rounded-2xl border border-white/10 bg-[#0e2218] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-white/70">Locked careers ({locked.length})</summary>
              <ul className="mt-2 space-y-1 text-xs text-white/60">
                {locked.map((j) => <li key={j.id}>{j.title}: {lockReason(p, j)}</li>)}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Money tab
// ---------------------------------------------------------------------------
function MoneyTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const st = STATE_BY_ID[p.state];
  const net = worth(p);
  return (
    <>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[11px] text-white/50">Cash</div><div className="text-base font-bold text-[#f5b82e]">{naira(p.money)}</div></div>
          <div><div className="text-[11px] text-white/50">Net worth</div><div className="text-base font-bold">{naira(net)}</div></div>
          <div><div className="text-[11px] text-white/50">Debt</div><div className={cx("text-base font-bold", p.debt > 0 && "text-red-300")}>{naira(p.debt)}</div></div>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/45">Prices rise every year. Cash loses value. Houses and dollars hold up better.</p>
      </Card>

      <NetWorthCard p={p} />
      <HousingCard p={p} run={run} />
      <GarageCard p={p} run={run} />
      <SubsCard p={p} />
      <LedgerCard p={p} />

      <Card>
        <H sub={`Build in ${st.name}. Land is ${st.cost >= 1.4 ? "very expensive" : st.cost >= 0.9 ? "pricey" : "cheap"} here. Travel to build elsewhere.`}>Build a house</H>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(HOUSE_KINDS) as (keyof typeof HOUSE_KINDS)[]).map((k) => {
            const c = buildCost(p, k);
            return (
              <button key={k} type="button" disabled={p.money < c || st.abroad} onClick={() => run({ t: "build", kind: k })} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center text-xs disabled:opacity-40">
                <span className="block font-semibold">{HOUSE_KINDS[k].label}</span>
                <span className="block text-[#f5b82e]">{naira(c)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <MortgageCard p={p} run={run} />

      {p.houses.length > 0 && (
        <Card>
          <H>Your houses</H>
          <div className="space-y-2">
            {p.houses.map((h) => (
              <div key={h.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{HOUSE_KINDS[h.kind].label} · {STATE_BY_ID[h.state].name}</span>
                  <span className="text-[#f5b82e]">{naira(h.value)}</span>
                </div>
                <div className="mt-1 text-[11px] text-white/50">Status: {h.use === "owner" ? "You live here" : h.use === "family" ? "Family lives here" : h.use === "rent" ? "Rented out" : "Empty"}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["owner", "family", "rent", "empty"] as const).map((u) => (
                    <Btn key={u} small tone={h.use === u ? "gold" : "ghost"} onClick={() => run({ t: "use", id: h.id, use: u })}>
                      {u === "owner" ? "Live" : u === "family" ? "Family" : u === "rent" ? "Rent out" : "Empty"}
                    </Btn>
                  ))}
                  <Btn small tone="red" onClick={() => run({ t: "sell", id: h.id })}>Sell</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <H sub="Returns are not guaranteed.">Invest</H>
        <div className="space-y-2">
          {INVESTMENTS.map((o) => {
            const min = o.min * p.index;
            const amt = (frac: number) => Math.max(Math.round(p.money * frac), 0);
            return (
              <div key={o.kind} className="rounded-xl bg-white/5 p-3">
                <div className="flex justify-between text-sm"><span className="font-semibold">{o.label}</span><span className="text-[11px] text-white/50">min {naira(min)}</span></div>
                <p className="text-[11px] text-white/50">{o.desc}</p>
                <div className="mt-2 flex gap-1.5">
                  {[0.1, 0.5, 1].map((f) => (
                    <Btn key={f} small tone="ghost" disabled={amt(f) < min} onClick={() => run({ t: "invest", kind: o.kind, amount: amt(f) })}>
                      {f === 1 ? "All cash" : `${f * 100}% (${naira(amt(f))})`}
                    </Btn>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {p.holdings.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <H>Your portfolio</H>
            {p.holdings.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                <div><div className="font-semibold">{h.label}</div><div className="text-[11px] text-white/50">Put in {naira(h.invested)}</div></div>
                <div className="text-right"><div className={h.value >= h.invested ? "text-emerald-300" : "text-red-300"}>{naira(h.value)}</div><button type="button" className="text-[11px] underline text-white/60" onClick={() => run({ t: "divest", id: h.id })}>Cash out</button></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <H sub="What big people spend on. Prestige counts toward your legacy.">Spend your money</H>
        <div className="space-y-2">
          {LUXURIES.map((l) => {
            const block = luxuryBlock(p, l.id);
            const owned = l.once && p.flags[`own_${l.id}`];
            return (
              <div key={l.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{l.label} {l.good && <Badge tone="green">good deed</Badge>}</div>
                    <div className="text-[11px] text-white/50">{l.desc}</div>
                  </div>
                  <Badge tone="gold">+{l.prestige} prestige</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Btn small tone={owned ? "ghost" : "gold"} disabled={Boolean(block)} onClick={() => run({ t: "luxury", id: l.id })}>
                    {owned ? "Owned" : `Buy (${naira(luxuryCost(p, l.cost))})`}
                  </Btn>
                  {block && !owned && <span className="text-[11px] text-red-300">{block}</span>}
                  {l.upkeep && <span className="text-[11px] text-white/40">upkeep {naira(luxuryCost(p, l.upkeep))}/yr</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Family tab
// ---------------------------------------------------------------------------
function Person({ look, gender, age, label, sub, dim }: { look: Look; gender: Gender; age: number; label: string; sub?: string; dim?: boolean }) {
  return (
    <div className="flex w-[84px] flex-col items-center text-center">
      <Avatar look={look} gender={gender} age={age} size={72} dim={dim} />
      <div className="mt-1 w-full truncate text-xs font-semibold">{label}</div>
      {sub && <div className="text-[10px] text-white/50">{sub}</div>}
    </div>
  );
}

function FamilyTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const fam = STATE_BY_ID[p.family.state];
  const gifts = [100_000, 500_000, 2_000_000, 10_000_000];
  const luckWord = p.luck >= 65 ? "Born under a lucky star" : p.luck <= 35 ? "Life no easy for you" : "Fortune is neutral";
  return (
    <>
      <Card>
        <H>Your people</H>
        <div className="flex flex-wrap gap-3">
          {p.family.dad && <Person look={p.family.dad} gender="male" age={p.age + 29} label="Papa" sub={p.family.parentsAlive ? "alive" : "late"} dim={!p.family.parentsAlive} />}
          {p.family.mom && <Person look={p.family.mom} gender="female" age={p.age + 26} label="Mama" sub={p.family.parentsAlive ? "alive" : "late"} dim={!p.family.parentsAlive} />}
          {p.spouse?.look && <Person look={p.spouse.look} gender={p.gender === "male" ? "female" : "male"} age={p.age} label={p.spouse.name} sub={`spouse · ${Math.round(p.spouse.happy)}% happy`} />}
          {p.kids.map((k, i) => k.look && <Person key={i} look={k.look} gender={k.gender} age={k.age} label={k.name} sub={`age ${k.age}`} />)}
        </div>
        <p className="mt-3 text-sm text-white/85">
          Family lives in <b>{fam.name}</b>. {fam.opp <= 3 ? "Opportunities there are limited. They would love to move somewhere better." : fam.opp >= 7 ? "They are in a strong market." : "Life there is steady."}
        </p>
        <p className="mt-1 text-sm text-white/70">Family happiness {Math.round(p.family.happy)}% · {luckWord}</p>
        {p.houses.length > 0 && <p className="mt-2 text-xs text-[#f5b82e]">Tip: Use a house as &quot;Family&quot; in the Money tab to bring them to your state.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {gifts.map((a) => (
            <Btn key={a} small tone="ghost" disabled={p.money < a * p.index} onClick={() => run({ t: "send", amount: a * p.index })}>
              Send {naira(a * p.index)}
            </Btn>
          ))}
        </div>
      </Card>
      <PeopleCard p={p} run={run} />
      {p.age >= 18 && <WillCard p={p} run={run} />}
      {!p.spouse && p.flags.dating && <Card><H>Dating</H><p className="text-sm">Dating {String(p.flags.dating)}. A proposal may be coming.</p></Card>}
      {!p.spouse && !p.flags.dating && <Card><H>Spouse</H><p className="text-sm text-white/60">Single. Use &quot;Look for love&quot; in the Life tab.</p></Card>}
      <Card>
        <H>Achievements</H>
        {p.achievements.length === 0 ? <p className="text-sm text-white/60">None yet.</p> : <div className="flex flex-wrap gap-1.5">{p.achievements.map((a) => <Badge key={a} tone="gold">🏆 {a}</Badge>)}</div>}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Map tab
// ---------------------------------------------------------------------------
function MapTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const st = STATE_BY_ID[p.state];
  const regions = Array.from(new Set(TRAVEL_STATES.map((s) => s.region)));
  return (
    <>
      <Card>
        <H>You are in</H>
        <div className="text-lg font-bold">{st.name} <span className="text-sm font-normal text-white/50">· {st.capital}</span></div>
        <div className="mt-2 space-y-1.5">
          <Meter label="Jobs" value={st.opp} />
          <Meter label="Cost" value={st.cost * 5} max={10} invert />
          <Meter label="Insecurity" value={st.risk} invert />
        </div>
        <p className="mt-2 text-[11px] text-white/50">Opportunity affects pay and what jobs exist. Insecurity raises kidnap and robbery risk, especially when you travel.</p>
      </Card>

      <Card>
        <H sub="Flights, IELTS and visa fees add up, and visas can be refused. A degree improves your odds.">Japa 🛫</H>
        <Btn tone="gold" disabled={p.age < 18 || p.money < 8_000_000 * p.index || Boolean(st.abroad) || p.prison > 0} onClick={() => run({ t: "japa" })}>
          Start Japa process ({naira(8_000_000 * p.index)})
        </Btn>
      </Card>

      {regions.map((r) => (
        <Card key={r}>
          <H>{r}</H>
          <div className="space-y-2">
            {TRAVEL_STATES.filter((s) => s.region === r).map((s) => {
              const cost = Math.round(travelCost(st, s) * p.index * (st.abroad ? 6 : 1));
              const here = s.id === p.state;
              const mine = p.houses.some((h) => h.state === s.id);
              return (
                <div key={s.id} className={cx("rounded-xl p-3", here ? "bg-[#f5b82e]/10" : "bg-white/5")}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {s.name} {s.id === p.family.state && <Badge>family</Badge>} {mine && <Badge tone="gold">your house</Badge>} {s.id === p.birthState && <Badge tone="green">home</Badge>}
                    </div>
                    <Btn small tone={here ? "ghost" : "green"} disabled={here || p.age < 16 || p.money < cost || p.prison > 0} onClick={() => run({ t: "travel", to: s.id })}>
                      {here ? "Here" : `Go (${naira(cost)})`}
                    </Btn>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    <Meter compact label="Jobs" value={s.opp} />
                    <Meter compact label="Cost of living" value={s.cost * 5} max={10} invert />
                    <Meter compact label="Insecurity" value={s.risk} invert />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      {STATES.find((s) => s.abroad) && p.state === "abroad" && <p className="text-center text-xs text-white/50">You are abroad. Travel back to any Nigerian state from the lists above.</p>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Power tab
// ---------------------------------------------------------------------------
function RoutesCard() {
  const routes: [string, string][] = [
    ["The Ballot Box", "Councillor, LG chairman, Rep, Senator, Governor, then President. Slow, expensive and the most common road."],
    ["The Kingmaker", "As a governor or big financier, build the party machine, bankroll loyalists in other states, capture the electoral umpire and the courts, win the party ticket, then run."],
    ["The General", "Rise in the army to Captain or above and plot a coup. If it fails you may go to prison, but a prisoner of conscience can come out a hero, get anointed by the elders and return as a civilian president."],
    ["The Understudy", "Be offered the Vice President slot. If the president dies or falls ill, you step in."],
    ["The Exile", "Speak out against a regime, flee abroad, and come back as a hero when democracy returns."],
  ];
  return (
    <Card>
      <H sub="Different people got to the top different ways.">Roads to the Villa</H>
      <div className="space-y-2">
        {routes.map(([t, d]) => (
          <div key={t} className="rounded-xl bg-white/5 p-3">
            <div className="text-sm font-semibold text-[#f5b82e]">{t}</div>
            <div className="text-[11px] leading-snug text-white/60">{d}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PowerTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const pol = p.politics;
  const coupBlock = canPlotCoup(p);
  const showCoup = p.job?.id === "soldier" || Boolean(pol?.militaryRuler);
  const coupCard = showCoup && (
    <Card>
      <H sub="High risk. Success makes you head of state. Failure means prison, or worse.">Plot a coup</H>
      <Btn tone="red" disabled={Boolean(coupBlock)} onClick={() => run({ t: "coup" })}>Seize power</Btn>
      {coupBlock && <p className="mt-1 text-xs text-white/50">{coupBlock}</p>}
    </Card>
  );
  if (!pol) {
    const block = canJoinPolitics(p);
    return (
      <>
        <Card>
          <H>Politics</H>
          <p className="text-sm text-white/80">From councillor to President. It costs money, connections and (sometimes) your conscience. Once you hold power you can build the country, or loot it.</p>
          <Btn className="mt-3" tone="gold" disabled={Boolean(block)} onClick={() => run({ t: "joinPolitics" })}>Join a political party ({naira(2_000_000 * p.index)})</Btn>
          {block && <p className="mt-2 text-xs text-red-300">{block}</p>}
        </Card>
        {coupCard}
        <RoutesCard />
      </>
    );
  }
  const holding = pol.office >= 0 ? OFFICES[pol.office] : null;
  const next = pol.highest + 1 < OFFICES.length ? OFFICES[pol.highest + 1] : null;
  const block = canContest(p);
  const n = p.nation;
  const ruler = p.loot > 0 && p.goodDeeds <= 3 ? "Looter" : p.goodDeeds >= 6 && p.loot === 0 ? "Reformer" : p.goodDeeds > 0 && p.loot > 0 ? "Mixed record" : "Unknown";
  const zone = currentZone(p);
  const mine = playerZone(p);
  return (
    <>
      <Card>
        <H>{officeTitle(p) ?? "Out of office"}</H>
        {holding && !pol.militaryRuler && <p className="text-sm text-white/80">Term {pol.terms}, {pol.yearsLeft} year{pol.yearsLeft === 1 ? "" : "s"} left · {naira(holding.salary * Math.pow(p.index, 0.9))} yearly pay</p>}
        {pol.militaryRuler && <p className="text-sm text-white/80">You rule by decree. Watch out for counter-coups.</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pol.anointed && <Badge tone="gold">Anointed</Badge>}
          {pol.hero && <Badge tone="green">People&apos;s hero</Badge>}
          {pol.vp && <Badge tone="gold">Vice President</Badge>}
          {pol.godfather && <Badge tone="red">Owes a godfather</Badge>}
          {pol.defected && <Badge>Defected</Badge>}
          {pol.kingmaker > 0 && <Badge tone="gold">Kingmaker ×{pol.kingmaker}</Badge>}
        </div>
        <p className="mt-2 text-xs text-white/60">Zoning: this cycle the presidency is zoned to the <b className="text-white/90">{zone}</b>. You are from the {mine}{zone === mine ? ". Advantage!" : ". Disadvantage."}</p>
        {next && !pol.militaryRuler && (
          <div className="mt-3">
            <Btn tone="gold" disabled={Boolean(block)} onClick={() => run({ t: "contest" })}>Run for {next.title}</Btn>
            {block && <p className="mt-1 text-xs text-white/50">{block}</p>}
          </div>
        )}
        <p className="mt-3 text-xs text-white/50">Reputation as a ruler: <b className="text-white/80">{ruler}</b> · Stolen: {naira(p.loot)} · Good deeds: {p.goodDeeds}</p>
      </Card>

      <Card>
        <H sub="These decide who wins the ticket, the vote and the court case.">Power bases</H>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Bar label="Party machine" value={pol.machine} tone="gold" />
          <Bar label="Electoral umpire (INEC)" value={pol.umpire} tone="gold" />
          <Bar label="Courts" value={pol.courts} tone="gold" />
          <Bar label="Security chiefs" value={pol.military} tone="gold" />
        </div>
        <div className="mt-3 space-y-2">
          {POWER_MOVES.map((m) => {
            const b = powerMoveBlock(p, m.id);
            return (
              <button key={m.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "power", id: m.id })} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-40">
                <span className="flex justify-between text-sm font-semibold"><span>{m.label}</span><span className="text-[#f5b82e]">{naira(powerMoveCost(p, m.id))}</span></span>
                <span className="block text-[11px] text-white/50">{b ?? m.desc}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {coupCard}

      {holding && (
        <>
          <Card>
            <H>The state of the nation</H>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Bar label="Economy" value={n.economy} />
              <Bar label="Security" value={n.security} />
              <Bar label="Welfare" value={n.welfare} />
              <Bar label="Approval" value={n.approval} tone="gold" />
              <Bar label="EFCC / coup heat" value={n.heat} invert />
            </div>
          </Card>
          {(["good", "corrupt", "neutral"] as const).map((side) => (
            <Card key={side}>
              <H sub={`${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} left this year`}>
                {side === "good" ? "Rule well" : side === "corrupt" ? "Be corrupt" : "Politics as usual"}
              </H>
              <div className="space-y-2">
                {GOV_ACTIONS.filter((a) => a.side === side && pol.office >= a.minOffice).map((a) => {
                  const dis = a.disabled?.(p) || (p.actionsLeft <= 0 ? "No actions left" : false);
                  return (
                    <button key={a.id} type="button" disabled={Boolean(dis)} onClick={() => run({ t: "gov", id: a.id })} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-40">
                      <span className="block text-sm font-semibold">{a.label}</span>
                      <span className="block text-[11px] text-white/50">{dis || a.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </>
      )}
      <RoutesCard />
    </>
  );
}

// ---------------------------------------------------------------------------
// Legacy
// ---------------------------------------------------------------------------
function lineageCard(d: { surname: string; lineage: LineageEntry[] }, current: Player) {
  const gens = d.lineage.length + (current.alive ? 1 : 0);
  const richest = Math.max(current.peakWorth, ...d.lineage.map((l) => l.peakWorth), 0);
  const prestige = d.lineage.reduce((s, l) => s + l.prestige, 0) + (current.alive ? current.prestige : 0);
  const best = [...d.lineage].sort((a, b) => b.peakWorth - a.peakWorth)[0];
  return {
    kicker: "Naija Life · Family Legacy",
    title: `The ${d.surname} Dynasty`,
    stats: [
      { label: "Generations", value: String(gens) },
      { label: "Richest peak fortune", value: naira(richest) },
      { label: "Prestige earned", value: String(prestige) },
    ],
    lines: best ? [`Greatest: ${best.name}, ${best.epitaph} (${best.highestOffice}).`] : [`Current head: ${current.name} ${current.surname}.`],
  };
}

function LegacyTab({ g }: { g: Game }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const card = lineageCard(g.dynasty, g.p);
    const r = await shareCard(card, `${card.title} on Naija Life: ${card.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}`);
    setMsg(r === "shared" ? "Shared!" : "Card ready. Save it or screenshot it!");
  };
  const p = g.p;
  return (
    <>
      <Card>
        <H>The {g.dynasty.surname} dynasty</H>
        <p className="text-sm text-white/80">Generation {p.generation}. When you die you continue as one of your children, with 70% of everything you built. The family name keeps growing.</p>
        <Btn tone="gold" small className="mt-3" onClick={share}><Share2 size={14} className="mr-1 inline" /> Share legacy card</Btn>
        {msg && <p className="mt-2 text-xs text-emerald-300">{msg}</p>}
      </Card>
      <Card>
        <H>Current life</H>
        <p className="text-sm">{p.name} {p.surname} · Prestige {p.prestige} · Peak worth {naira(p.peakWorth)}</p>
        <p className="mt-1 text-xs text-white/50">Good deeds {p.goodDeeds} · Stolen {naira(p.loot)} · Kidnapped {p.kidnaps}×</p>
      </Card>
      {g.dynasty.lineage.length > 0 && (
        <Card>
          <H>Ancestors</H>
          <div className="space-y-2">
            {[...g.dynasty.lineage].reverse().map((l, i) => (
              <div key={i} className="rounded-xl bg-white/5 p-3">
                <div className="flex justify-between"><span className="font-semibold">{l.name}</span><Badge tone="gold">Gen {l.generation}</Badge></div>
                <div className="text-xs text-[#f5b82e]">{l.epitaph}</div>
                <div className="text-[11px] text-white/50">Lived {l.ageAtDeath} yrs · {l.highestOffice} · peak {naira(l.peakWorth)} · {l.cause}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Death screen
// ---------------------------------------------------------------------------
function DeathScreen({ g, onHeir, onNew }: { g: Game; onHeir: (i: number) => void; onNew: (o: { name: string; gender: Gender; stateId: string | null; tribe: string | null; religion: string | null }) => void }) {
  const p = g.p;
  const entry = g.dynasty.lineage[g.dynasty.lineage.length - 1];
  const [msg, setMsg] = useState("");
  const share = async () => {
    const r = await shareCard(
      {
        kicker: `Naija Life · Generation ${p.generation}`,
        title: `${p.name} ${p.surname}`,
        stats: [
          { label: "Lived", value: `${p.age} years` },
          { label: "Peak fortune", value: naira(p.peakWorth) },
          { label: "Known as", value: entry?.epitaph ?? "A Survivor" },
        ],
        lines: [`Died: ${p.cause}.`, entry ? `Highest role: ${entry.highestOffice}.` : ""],
      },
      `${p.name} ${p.surname} lived ${p.age} years in Naija Life. ${entry?.epitaph ?? ""}`,
    );
    setMsg(r === "shared" ? "Shared!" : "Card ready. Save it or screenshot it!");
  };
  return (
    <Sheet title="Your life has ended">
      <div className="mb-2 flex justify-center"><Avatar look={p.look} gender={p.gender} age={p.age} size={96} dim /></div>
      <p className="font-serif text-2xl font-bold">{p.name} {p.surname}</p>
      <p className="text-sm text-white/70">Died at {p.age} · {p.cause}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Card className="p-3"><div className="text-[11px] text-white/50">Net worth at death</div><div className="font-bold text-[#f5b82e]">{naira(entry?.worth ?? 0)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-white/50">Remembered as</div><div className="font-bold">{entry?.epitaph}</div></Card>
      </div>
      <div className="mt-4 space-y-2">
        {p.kids.length > 0 ? (
          <>
            <p className="text-sm text-white/80">Who carries the family name?</p>
            {p.kids.map((k, i) => (
              <Btn key={i} className="w-full" onClick={() => onHeir(i)}>Continue as {k.name} {p.surname} (age {k.age})</Btn>
            ))}
          </>
        ) : (
          <>
            <p className="text-sm text-white/80">You had no children. The bloodline ends here.</p>
            <Btn className="w-full" onClick={() => onNew({ name: "", gender: chance(0.5) ? "male" : "female", stateId: null, tribe: null, religion: null })}>Start a brand-new family</Btn>
          </>
        )}
        <Btn tone="gold" className="w-full" onClick={share}>Share this life</Btn>
        {msg && <p className="text-center text-xs text-emerald-300">{msg}</p>}
      </div>
    </Sheet>
  );
}
