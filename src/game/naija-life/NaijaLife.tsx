"use client";

import { useEffect, useState } from "react";
import {
  ALL_TRIBES, HOUSE_KINDS, INVESTMENTS, LUXURIES, OFFICES, RELIGIONS, STATE_BY_ID, TRAVEL_STATES,
} from "./data";
import {
  act, ageUp, ackKidnap, buildCost, choose, describePending, kidnapAction, migrate, newGame, startHeir, startNewFamily,
  type Action, type NewLifeOptions, worth,
} from "./engine";
import { jobDef, randomName } from "./helpers";
import { Avatar } from "./Avatar";
import { AdmissionCard, CampusCard, DegreeCard } from "./CampusUI";
import { SoundToggles, useGameSounds } from "./SoundUI";
import { ChallengeBanner, ChallengePanel, GistPanel, GoalsPanel, MomentsPanel, ObituaryView, shareObituary, useObituary, isLocked, lockHint, sanitizeLook, saveChallengeScore, saveUnlocksFrom, useUnlocks } from "./EngageUI";
import { KidnapModal } from "./KidnapModal";
import { BEARDS, GLASSES, HAIRS, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKINS, WEARS, randomLook, strToLook, type Look } from "./look";
import { luxuryBlock, luxuryCost } from "./lifestyle";
import { GOV_ACTIONS, POWER_MOVES, canContest, canJoinPolitics, canPlotCoup, currentZone, officeTitle, playerZone, powerMoveBlock, powerMoveCost } from "./politics";
import { PortfolioCard, TravelSheet, RelationshipsCard, HeadlinesCard, PostgradCard, PropertyMarketCard, PrisonCard, MortgageCard, TradeCard, MarketNewsCard, BusinessCard, GarageCard, HealthTab, HousingCard, LawTab, LedgerCard, NetWorthCard, BackgroundCard, OwedCard, PeopleList, PhoneTab, SkillsCard, SubsCard, WillCard } from "./Panels";
import { Tutorial, hasSeenTutorial } from "./Tutorial";
import { BottomBar, ExploreChips, ExploreHub, GameHeader, LifeFeed, StatsCard, EXPLORE_TABS, workStage, type Tab } from "./Shell";
import { shareCard } from "./share";
import type { Game, Gender, LineageEntry, Player } from "./types";
import { JobsView, NyscPanel, RealtorView, SchoolPanel } from "./WorkUI";
import { isRealtor } from "./realtor";
import { ActionSheet, BackPill, Hub, HubList, ListGroup, ListRow, Badge, Bar, Btn, Card, H, Meter, Sheet, cx } from "./ui";
import { FAMILY_PRESETS } from "./family";
import { notificationsFor } from "./notices";
import { T, chance, naira, setDeflator, setLang } from "./util";
import type { Lang } from "./util";

const SAVE_KEY = "naija-life-save-v1";
const SLOTS_KEY = "naija-life-slots-v1";
const LANG_KEY = "naija-life-lang";
const SLOT_COUNT = 3;
function parseGame(raw: unknown): Game | null {
  try {
    const g = raw as Game;
    return g && g.p && g.dynasty ? migrate(g) : null;
  } catch {
    return null;
  }
}
/** Three save slots. An older single save becomes slot 1. */
function loadSlots(): (Game | null)[] {
  const slots: (Game | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as unknown[];
      arr.slice(0, SLOT_COUNT).forEach((x, i) => { slots[i] = x ? parseGame(x) : null; });
    } else {
      const old = localStorage.getItem(SAVE_KEY);
      if (old) slots[0] = parseGame(JSON.parse(old));
    }
  } catch {
    /* unreadable save: start fresh */
  }
  return slots;
}
function writeSlots(slots: (Game | null)[]) {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    /* storage unavailable: play without saving */
  }
}
function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "pcm";
  } catch {
    return "pcm";
  }
}
function hashSeed(s: string): number {
  const t = s.trim();
  if (/^\d+$/.test(t)) return Number(t) >>> 0;
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export default function NaijaLife() {
  const [game, setGame] = useState<Game | null>(null);
  const [slots, setSlots] = useState<(Game | null)[]>(() => Array.from({ length: SLOT_COUNT }, () => null));
  const [slot, setSlot] = useState(0);
  const [lang, setLangState] = useState<Lang>("pcm");
  const [bell, setBell] = useState(false);
  const [tour, setTour] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("life");
  useGameSounds(game);
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [cardImg, setCardImg] = useState<{ url: string; text: string } | null>(null);

  useEffect(() => {
    // The whole game is a little more compact than the browser default.
    const root = document.documentElement;
    const before = root.style.fontSize;
    root.style.fontSize = "15px";
    return () => { root.style.fontSize = before; };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(loadSlots());
    setLangState(loadLang());
    setReady(true);
  }, []);

  useEffect(() => {
    const onImg = (e: Event) => setCardImg((e as CustomEvent<{ url: string; text: string }>).detail);
    window.addEventListener("naija-share-image", onImg);
    return () => window.removeEventListener("naija-share-image", onImg);
  }, []);

  useEffect(() => {
    if (!game) return;
    const fresh = saveUnlocksFrom(game.p);
    saveChallengeScore(game.p);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fresh.length) setToast(T(`🎁 New cosmetic unlocked! Check the look picker when you start a new life.`, `🎁 New cosmetic don unlock! Check the look picker when you start new life.`));
  }, [game]);

  useEffect(() => {
    if (!ready || !game) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots((s) => {
      const next = [...s];
      next[slot] = game;
      writeSlots(next);
      return next;
    });
  }, [game, ready, slot]);
  const chooseLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    setGame((g) => (g ? { ...g, p: { ...g.p, lang: l } } : g));
  };

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

  if (!ready) return <div className="min-h-screen bg-[#f3f8ff]" />;

  if (!game) {
    setLang(lang);
    return (
      <Shell>
        <StartScreen
          slots={slots}
          lang={lang}
          onLang={chooseLang}
          onContinue={(i) => { setSlot(i); setLangState(slots[i]?.p.lang ?? lang); setGame(slots[i]); setTab("life"); }}
          onDelete={(i) => setSlots((s) => { const next = [...s]; next[i] = null; writeSlots(next); return next; })}
          onStart={(o, i) => {
            setSlot(i);
            setGame(newGame(o));
            setTab("life");
            if (!hasSeenTutorial()) setTour(true);
          }}
        />
      </Shell>
    );
  }

  const p = game.p;
  setDeflator(p.index);
  setLang(p.lang);
  const view = result === null ? describePending(game) : null;
  const evHead = game.queue[0];
  const evLook = evHead && evHead.kind === "event" && typeof evHead.data.look === "string" ? strToLook(evHead.data.look) : null;
  const kidnap = result === null && game.queue[0]?.kind === "kidnap" ? game.queue[0] : null;
  const busy = game.queue.length > 0 || result !== null;

  return (
    <Shell>
      <GameHeader p={p} onMenu={() => setMenu(true)} onWallet={() => setTab("money")} alerts={notificationsFor(p).filter((n) => n.level !== "green").length} />
      <StatsCard p={p} />
      <main className="flex-1 space-y-3 px-4 pb-64 pt-2">
        {tab !== "life" && <BackPill label={T("Life story", "Life story")} onClick={() => setTab("life")} />}
        {EXPLORE_TABS.includes(tab) && <ExploreChips tab={tab} setTab={setTab} />}
        {tab === "explore" && <ExploreHub setTab={setTab} />}
        {p.prison > 0 && (tab === "phone" || tab === "map" || tab === "power") && <PrisonCard p={p} run={run} full />}
        {tab === "life" && <>
          {p.prison > 0 && <button type="button" onClick={() => setTab("work")} className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-left"><span className="text-xl">⛓️</span><span className="min-w-0 flex-1 text-[13px] font-bold text-red-700">{T(`In prison · ${p.prison} yr left. Prison options are in the Work tab.`, `For prison · ${p.prison} yr remain. Prison options dey Work tab.`)}</span><span className="text-lg font-black text-red-500">›</span></button>}
          {p.flags.admOpen && !p.school && p.prison <= 0 && <button type="button" onClick={() => setTab("work")} className="flex w-full items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-left"><span className="text-xl">🎓</span><span className="min-w-0 flex-1 text-[13px] font-bold text-blue-700">{T("Admissions are open. Pick your university in the University tab.", "Admission don open. Pick your university for University tab.")}</span><span className="text-lg font-black text-blue-500">›</span></button>}
          <HeadlinesCard p={p} /><LifeFeed g={game} run={run} />
        </>}
        {tab === "phone" && p.prison <= 0 && <PhoneTab p={p} run={run} />}
        {tab === "health" && <HealthTab p={p} run={run} />}
        {tab === "law" && <LawTab p={p} run={run} />}
        {tab === "work" && p.prison > 0 && <PrisonCard p={p} run={run} full />}
        {tab === "work" && p.prison <= 0 && <WorkTab p={p} run={run} />}
        {tab === "money" && <MoneyTab p={p} run={run} />}
        {tab === "family" && <FamilyTab p={p} run={run} />}
        {tab === "map" && p.prison <= 0 && <MapTab p={p} run={run} />}
        {tab === "power" && p.prison <= 0 && <PowerTab p={p} run={run} />}
        {tab === "legacy" && <LegacyTab g={game} />}
      </main>

      {toast && (
        <div className="fixed inset-x-0 bottom-44 z-40 mx-auto w-[92%] max-w-md rounded-2xl bg-slate-800 px-4 py-2.5 text-center text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <BottomBar tab={tab} setTab={setTab} p={p} busy={busy} onGrow={() => { setGame(ageUp(game)); setTab("life"); }} />

      {result !== null && (
        <Sheet>
          <p className="text-base leading-relaxed text-slate-900">{result}</p>
          <Btn className="mt-4 w-full" onClick={() => setResult(null)}>{T("Continue", "Continue")}</Btn>
        </Sheet>
      )}

      {view && p.alive && (
        <Sheet title={view.title}>
          {evLook && (
            <div className="mb-3 flex justify-center">
              <Avatar look={evLook} gender={p.gender === "male" ? "female" : "male"} age={26} mood={75} size={110} />
            </div>
          )}
          <p className="text-[15px] leading-relaxed text-slate-800">{view.text}</p>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="block text-sm font-semibold text-slate-900">{c.label}</span>
                {(c.sub || c.disabled) && <span className={cx("block text-xs", c.disabled ? "text-red-600" : "text-blue-600")}>{c.disabled || c.sub}</span>}
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
          onNew={(o) => { setGame(startNewFamily(game, { ...o, lang: game.p.lang })); setTab("life"); }}
        />
      )}

      {cardImg && (
        <Sheet title={T("Your card", "Your card")} onClose={() => setCardImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImg.url} alt={T("Share card", "Share card")} className="w-full rounded-xl" />
          <p className="mt-3 text-xs text-slate-500">{T("Press and hold the image to save it, or take a screenshot, then post it.", "Press and hold the image to save am, or take screenshot, then post am.")}</p>
          <Btn tone="ghost" className="mt-3 w-full" onClick={() => { try { void navigator.clipboard.writeText(cardImg.text); } catch { /* clipboard blocked */ } }}>{T("Copy caption", "Copy caption")}</Btn>
        </Sheet>
      )}

      {confirmEnd && (
        <Sheet title={T("Surrender to life?", "Surrender for life?")} onClose={() => setConfirmEnd(false)}>
          <p className="text-[13px] leading-relaxed text-slate-600">{T("This ends this character's life in the game, and you carry on as your child or start a new family. It cannot be undone.", "This go end this character life for the game, and you go continue as your pikin or start new family. You no fit undo am.")}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{T("If you are ever struggling in real life, please talk to someone you trust.", "If real life ever dey hard for you, abeg talk to person wey you trust.")}</p>
          <div className="mt-4 space-y-2">
            <Btn tone="ghost" className="w-full" onClick={() => setConfirmEnd(false)}>{T("No, keep playing", "No, make I continue")}</Btn>
            <Btn tone="red" className="w-full" onClick={() => { setConfirmEnd(false); run({ t: "surrender" }); }}>{T("Yes, surrender to life", "Yes, surrender")}</Btn>
          </div>
        </Sheet>
      )}

      {tour && <Tutorial setTab={setTab} onClose={() => setTour(false)} />}

      {bell && (
        <Sheet title={T("Alerts and history", "Alerts and history")} onClose={() => setBell(false)}>
          <ListGroup title={T("Needs your attention", "Wetin need your attention")}>
            {notificationsFor(p).length === 0 && <ListRow emoji="✅" tile="bg-emerald-100" name={T("Nothing urgent", "Nothing serious")} />}
            {notificationsFor(p).map((x, i) => <ListRow key={i} emoji={x.level === "red" ? "🚨" : "ℹ️"} tile={x.level === "red" ? "bg-rose-100" : "bg-blue-100"} wrap name={x.text} />)}
          </ListGroup>
          <ListGroup title={T("Recent years", "Wetin don happen")}>
            {[...p.log].reverse().slice(0, 12).map((e, i) => (
              <ListRow key={i} emoji="🗓️" tile="bg-sky-100" wrap name={`${T("Age", "Age")} ${e.age}`} desc={e.lines.slice(0, 3).join(" ")} />
            ))}
          </ListGroup>
        </Sheet>
      )}

      {menu && (
        <Sheet title={T("Menu", "Menu")} onClose={() => setMenu(false)}>
          <p className="text-sm text-slate-600">{T(`Saved automatically in slot ${slot + 1} on this device.`, `Game dey save by itself for slot ${slot + 1} for this device.`)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["en", "pcm"] as Lang[]).map((l) => <Btn key={l} tone={p.lang === l ? "gold" : "ghost"} onClick={() => chooseLang(l)}>{l === "en" ? "English" : "Pidgin"}</Btn>)}
          </div>
          <div className="mt-3"><SoundToggles /></div>
          <div className="mt-4 space-y-2">
            <Btn tone="ghost" className="w-full" onClick={() => { setMenu(false); setTour(true); }}>{T("How to play (tutorial)", "How to play (tutorial)")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => { setMenu(false); setBell(true); }}>{T("Alerts and history", "Alerts and history")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => setMenu(false)}>{T("Back to the game", "Go back to game")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => { setGame(null); setMenu(false); }}>{T("Switch life (save slots)", "Change life (save slots)")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => { setMenu(false); setConfirmEnd(true); }}>{T("Surrender to life", "Surrender for life")}</Btn>
            <Btn tone="red" className="w-full" onClick={() => { setSlots((s) => { const next = [...s]; next[slot] = null; writeSlots(next); return next; }); setGame(null); setMenu(false); }}>{T("Abandon this life and start over", "Abandon this life make we start again")}</Btn>
          </div>
        </Sheet>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#e9f0fb] text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-gradient-to-b from-[#f3f8ff] via-white to-[#f7faff] shadow-2xl shadow-blue-900/10">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start screen
// ---------------------------------------------------------------------------
function Chip({ active, onClick, children, locked, hint }: { active: boolean; onClick: () => void; children: React.ReactNode; locked?: boolean; hint?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={locked} title={hint} className={cx("rounded-full border px-3 py-1.5 text-xs font-semibold transition", locked && "opacity-50", active ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100")}>
      {children}
    </button>
  );
}

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cx("h-8 w-8 rounded-full border-2 transition", active ? "border-blue-500 scale-110" : "border-slate-200")} style={{ background: color }} />
  );
}

type NewOpts = { name: string; gender: Gender; stateId: string | null; tribe: string | null; religion: string | null; look: Look; lang: Lang; seed?: number | null; familyConfig?: NewLifeOptions["familyConfig"]; forceArchetype?: NewLifeOptions["forceArchetype"]; challenge?: string };

function StartScreen({ onStart, slots, onContinue, onDelete, lang, onLang }: { onStart: (o: NewOpts, slot: number) => void; slots: (Game | null)[]; onContinue: (i: number) => void; onDelete: (i: number) => void; lang: Lang; onLang: (l: Lang) => void }) {
  const [seedText, setSeedText] = useState("");
  const [preset, setPreset] = useState("real");
  const [target, setTarget] = useState(() => { const e = slots.findIndex((s) => !s); return e >= 0 ? e : 0; });
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [stateId, setStateId] = useState("");
  const [tribe, setTribe] = useState("");
  const [religion, setReligion] = useState("");
  const [look, setLook] = useState<Look>(() => randomLook("male", { region: "South West" }));
  const field = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500";
  const set = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }));
  const regionNow = () => (stateId ? STATE_BY_ID[stateId]?.region : undefined);
  const unlocked = useUnlocks();
  const reroll = (g: Gender = gender) => setLook(sanitizeLook(randomLook(g, { region: regionNow(), religion: religion || undefined }), unlocked));
  return (
    <div className="flex-1 px-5 pb-10 pt-10">
      <div className="h-1.5 w-full overflow-hidden rounded-full">
        <div className="flex h-full"><div className="flex-1 bg-[#1f9d55]" /><div className="flex-1 bg-white" /><div className="flex-1 bg-[#1f9d55]" /></div>
      </div>
      <h1 className="mt-5 font-serif text-4xl font-black leading-[1.05] text-slate-900">Naija<br /><span className="text-blue-600">Life</span></h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{T("Live a whole Nigerian life: from akara by the roadside to Aso Rock. Hustle, travel between states, build houses, survive NEPA, dodge kidnappers, and leave a legacy your children inherit.", "Live full Naija life: from akara for roadside reach Aso Rock. Hustle, travel between states, build house, survive NEPA, run from kidnappers, and leave legacy wey your pikin go inherit.")}</p>

      <ChallengeBanner onPlay={(c) => onStart({ name, gender, stateId: c.stateId, tribe: null, religion: null, look: sanitizeLook(look, unlocked), lang, seed: c.seed, forceArchetype: c.force, challenge: c.id }, target)} />

      <div className="mt-5 grid grid-cols-2 gap-2" role="group" aria-label={T("Language", "Language")}>
        {(["en", "pcm"] as Lang[]).map((l) => (
          <button key={l} type="button" onClick={() => onLang(l)} className={cx("rounded-xl border px-3 py-2.5 text-sm font-semibold", lang === l ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")}>{l === "en" ? "English" : "Pidgin"}</button>
        ))}
      </div>

      {slots.some(Boolean) && (
        <Card className="mt-6 space-y-2">
          <H>{T("Your lives", "Your lives")}</H>
          {slots.map((s, i) => s && (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
              <div className="min-w-0 text-sm"><div className="truncate font-semibold">{s.p.name} {s.p.surname}</div><div className="text-[11px] text-slate-500">{T("Slot", "Slot")} {i + 1} · {T("Age", "Age")} {s.p.age} · {s.p.alive ? naira(worth(s.p)) : T("Died", "Don die")}</div></div>
              <div className="flex shrink-0 gap-1.5"><Btn small tone="gold" onClick={() => onContinue(i)}>{T("Continue", "Continue")}</Btn><Btn small tone="ghost" onClick={() => onDelete(i)}>✕</Btn></div>
            </div>
          ))}
        </Card>
      )}

      <Card className="mt-6 space-y-4">
        <H sub={T("Your family, your luck and your starting point are decided by life, as in real life.", "Life go decide your family, your luck and where you start, as e be for real life.")}>{T("New life", "New life")}</H>
        <div className="flex items-center gap-4">
          <Avatar look={look} gender={gender} age={22} mood={72} size={96} />
          <div className="space-y-2">
            <p className="text-xs text-slate-500">{T("Your parents, partner and children will look like family.", "Your parents, partner and pikin go resemble you.")}</p>
            <Btn small tone="ghost" onClick={() => reroll()}>{T("Randomise look", "Random look")}</Btn>
          </div>
        </div>
        <label className="block text-xs text-slate-600">{T("Name (optional)", "Name (optional)")}
          <span className="mt-1 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={T("e.g. Amina Bello", "e.g. Amina Bello")} className={field + " flex-1"} maxLength={32} />
            <button type="button" onClick={() => setName(randomName("", gender))} aria-label={T("Random name", "Random name")} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-lg">🎲</button>
          </span>
        </label>
        <div>
          <span className="text-xs text-slate-600">{T("Gender", "Gender")}</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button key={g} type="button" onClick={() => { setGender(g); reroll(g); }} className={cx("rounded-xl border px-3 py-3 text-sm font-bold capitalize", gender === g ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")}>{g === "male" ? T("Male", "Male") : T("Female", "Female")}</button>
            ))}
          </div>
        </div>
        <label className="block text-xs text-slate-600">{T("Born in", "Where you born")}
          <select value={stateId} onChange={(e) => setStateId(e.target.value)} className={field}>
            <option value="">{T("Random (like real life)", "Random (as e be for real life)")}</option>
            {TRAVEL_STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-600">{T("Customise your look", "Change your look")}</summary>
          <div className="mt-3 space-y-4">
        <div>
          <span className="text-xs text-slate-600">{T("Skin tone", "Skin colour")}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">{SKINS.map((c, i) => <Swatch key={c} color={c} label={T(`Skin tone ${i + 1}`, `Skin colour ${i + 1}`)} active={look.skin === i} onClick={() => set({ skin: i })} />)}</div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Hairstyle", "Hairstyle")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{HAIRS.map((h) => { const lk = isLocked("hair", h.id, unlocked); return <Chip key={h.id} active={look.hair === h.id} locked={lk} hint={lockHint("hair", h.id)} onClick={() => set({ hair: h.id })}>{lk ? "🔒 " : ""}{h.label}</Chip>; })}</div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Hair colour", "Hair colour")}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">{HAIR_COLORS.map((c, i) => <Swatch key={c} color={c} label={T(`Hair colour ${i + 1}`, `Hair colour ${i + 1}`)} active={look.hairColor === i} onClick={() => set({ hairColor: i })} />)}</div>
        </div>
        {gender === "male" && (
          <div>
            <span className="text-xs text-slate-600">{T("Beard", "Beard")}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{BEARDS.map((b) => <Chip key={b.id} active={look.beard === b.id} onClick={() => set({ beard: b.id })}>{b.label}</Chip>)}</div>
          </div>
        )}
        <div>
          <span className="text-xs text-slate-600">{T("Cap or headwear", "Cap or head wear")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{WEARS.map((w) => { const lk = isLocked("wear", w.id, unlocked); return <Chip key={w.id} active={look.wear === w.id} locked={lk} hint={lockHint("wear", w.id)} onClick={() => set({ wear: w.id })}>{lk ? "🔒 " : ""}{w.label}</Chip>; })}</div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Glasses and earrings", "Glasses and earrings")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {GLASSES.map((x) => <Chip key={x.id} active={(look.glasses ?? "none") === x.id} onClick={() => set({ glasses: x.id })}>{x.label}</Chip>)}
            <Chip active={Boolean(look.hoops)} onClick={() => set({ hoops: !look.hoops })}>{T("Gold hoops", "Gold hoops")}</Chip>
          </div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Outfit", "Outfit")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{OUTFITS.map((o) => { const lk = isLocked("outfit", o.id, unlocked); return <Chip key={o.id} active={look.outfit === o.id} locked={lk} hint={lockHint("outfit", o.id)} onClick={() => set({ outfit: o.id })}>{lk ? "🔒 " : ""}{o.label}</Chip>; })}</div>
          <div className="mt-2 flex flex-wrap gap-2">{OUTFIT_COLORS.map((c, i) => <Swatch key={c} color={c} label={T(`Outfit colour ${i + 1}`, `Outfit colour ${i + 1}`)} active={look.outfitColor === i} onClick={() => set({ outfitColor: i })} />)}</div>
        </div>
          </div>
        </details>
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-600">{T("More options", "More options")}</summary>
          <label className="mt-3 block text-xs text-slate-600">{T("Tribe", "Tribe")}
            <select value={tribe} onChange={(e) => setTribe(e.target.value)} className={field}>
              <option value="">{T("Based on state", "Based on state")}</option>
              {ALL_TRIBES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs text-slate-600">{T("Religion", "Religion")}
            <select value={religion} onChange={(e) => setReligion(e.target.value)} className={field}>
              <option value="">{T("Random", "Random")}</option>
              {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs text-slate-600">{T("Family background", "Family background")}
            <select value={preset} onChange={(e) => setPreset(e.target.value)} className={field}>
              {FAMILY_PRESETS.map((x) => <option key={x.id} value={x.id}>{T(x.en, x.pcm)}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs text-slate-600">{T("Seed (same seed, same life, as long as you make the same choices)", "Seed (same seed go give you same life if you do same choices)")}
            <input value={seedText} onChange={(e) => setSeedText(e.target.value)} placeholder={T("optional", "optional")} className={field} maxLength={24} />
          </label>
          <label className="mt-3 block text-xs text-slate-600">{T("Save in", "Save for")}
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className={field}>
              {slots.map((s, i) => <option key={i} value={i}>{T("Slot", "Slot")} {i + 1}{s ? ` · ${s.p.name} (${T("will be replaced", "go replace am")})` : ` · ${T("empty", "empty")}`}</option>)}
            </select>
          </label>
        </details>
        {slots.every(Boolean) && (
          <label className="block text-xs font-semibold text-red-600">{T("All three slots are full. Which life should this replace?", "All three slot don full. Which life make this replace?")}
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className={field}>
              {slots.map((s, i) => <option key={i} value={i}>{T("Slot", "Slot")} {i + 1} · {s?.p.name}</option>)}
            </select>
          </label>
        )}
        <Btn className="w-full py-3 text-base" onClick={() => {
          const pr = FAMILY_PRESETS.find((x) => x.id === preset);
          onStart({ name, gender, stateId: stateId || null, tribe: tribe || null, religion: religion || null, look, lang, seed: seedText.trim() ? hashSeed(seedText) : null, familyConfig: pr?.cfg, forceArchetype: pr?.force }, target);
        }}>{T("Be born", "Born me")} 🇳🇬</Btn>
      </Card>
      <p className="mt-6 text-center text-[11px] text-slate-400">{T("A fictional game. All people, events and results are made up for fun.", "Na story game. All the people, events and results na just for fun.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work tab
// ---------------------------------------------------------------------------
type WorkSub = "jobs" | "biz" | "learn" | "agent" | "school" | "campus" | "admission" | "nysc" | "classmates" | null;

function WorkTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const [sub, setSub] = useState<WorkSub>(null);
  const cur = jobDef(p);
  const stage = workStage(p);
  const grown = p.age >= 14;
  const canApply = p.edu === "secondary" && !p.school && !p.flags.admOpen && p.age >= 16 && p.age <= 40;
  const rows = [
    ...(stage === "nysc" ? [{ id: "nysc", emoji: "🇳🇬", tile: "bg-emerald-100", name: T("NYSC service year", "NYSC service year"), desc: T("Posting, PPA and allowance", "Posting, PPA and allowance") }] : []),
    ...(stage === "primary" || stage === "secondary" ? [{ id: "school", emoji: stage === "primary" ? "🎒" : "🏫", tile: "bg-sky-100", name: stage === "primary" ? T("My primary school", "My primary school") : T("My secondary school", "My secondary school"), desc: p.school ? T(`${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} left`, `${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} remain`) : "" }] : []),
    ...(stage === "admission" ? [{ id: "admission", emoji: "🎓", tile: "bg-violet-100", name: T("Choose your university", "Choose your university"), desc: T(`JAMB score ${Number(p.flags.admScore ?? 0)}. Pick a school and a course`, `JAMB score ${Number(p.flags.admScore ?? 0)}. Pick school and course`) }] : []),
    ...(stage === "university" && p.campus && !p.campus.graduated ? [{ id: "campus", emoji: "🏛️", tile: "bg-violet-100", name: T("Campus life", "Campus life"), desc: `${T("Year", "Year")} ${p.campus.year} · CGPA ${p.campus.gpas.length ? p.campus.cgpa.toFixed(2) : "–"}` }] : []),
    ...(["primary", "secondary", "university", "nysc"].includes(stage) ? [{ id: "classmates", emoji: "🧑‍🤝‍🧑", tile: "bg-rose-100", name: stage === "nysc" ? T("Corps mates", "Corps mates") : T("Classmates", "Classmates"), desc: T(`${Object.values(p.npcs).filter((n) => n.role === "classmate" && !n.former && n.alive).length} around you · make friends`, `${Object.values(p.npcs).filter((n) => n.role === "classmate" && !n.former && n.alive).length} around you · make friends`) }] : []),
    ...(canApply ? [{ id: "admission", emoji: "📝", tile: "bg-violet-100", name: T("Apply to university", "Apply to university"), desc: T("Write JAMB, pick a school and a course", "Write JAMB, pick school and course") }] : []),
    ...(grown && stage !== "infant" && stage !== "nursery" ? [{ id: "jobs", emoji: "💼", tile: "bg-amber-100", name: stage === "work" ? T("Jobs and hustles", "Jobs and hustles") : T("Side hustles and jobs", "Side hustle and jobs"), desc: cur ? cur.ladder[Math.min(p.job?.rank ?? 0, cur.ladder.length - 1)].title : T("Find work or start a hustle", "Find work or start hustle") }] : []),
    ...(p.age >= 18 ? [{ id: "biz", emoji: "🏪", tile: "bg-emerald-100", name: T("My businesses", "My businesses"), desc: p.businesses.length ? T(`${p.businesses.length} running`, `${p.businesses.length} dey run`) : T("Akara stand to hotel", "Akara stand to hotel") }] : []),
    ...(isRealtor(p) ? [{ id: "agent", emoji: "🏠", tile: "bg-sky-100", name: T("Property clients", "Property clients"), desc: T(`${(p.clients ?? []).length} looking for a home`, `${(p.clients ?? []).length} dey find house`) }] : []),
    ...(p.age >= 10 ? [{ id: "learn", emoji: "🎓", tile: "bg-violet-100", name: T("Learn", "Learn"), desc: T("Skills, trades and further study", "Skills, trade and further study") }] : []),
  ];
  const sel = sub && rows.some((r) => r.id === sub) ? sub : null;
  return (
    <>
      {sel === null ? (
        rows.length ? <HubList onPick={(r) => setSub(r.id as WorkSub)} groups={[{ rows }]} /> : (
          <ListGroup title={stage === "infant" ? T("Infant", "Infant") : T("Nursery", "Nursery")} sub={T("Nothing to manage yet. Enjoy being small, school starts at 6.", "Nothing to manage yet. Enjoy being small, school start for 6.")}>
            <ListRow emoji="👶" tile="bg-sky-100" name={T("Growing up", "Dey grow")} desc={T("Your family looks after you", "Your family dey look after you")} />
          </ListGroup>
        )
      ) : <BackPill label={T("Back", "Back")} onClick={() => setSub(null)} />}
      {sel === "classmates" && <PeopleList p={p} run={run} group="class" />}
      {sel === "school" && <SchoolPanel p={p} />}
      {sel === "nysc" && <NyscPanel p={p} />}
      {sel === "admission" && (<><AdmissionCard p={p} run={run} /><DegreeCard p={p} run={run} /></>)}
      {sel === "campus" && <CampusCard p={p} run={run} />}
      {sel === "biz" && <BusinessCard p={p} run={run} />}
      {sel === "learn" && (
        <>
          <ListGroup title={T("Education", "Education")}>
            <ListRow emoji="🎓" tile="bg-violet-100" name={p.school ? T("In school", "You dey school") : p.edu === "none" ? T("No schooling yet", "You never go school yet") : T("Highest level", "Highest level")}
              desc={p.school ? T(`${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} left`, `${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} remain`) : p.edu === "none" ? undefined : `${p.edu}${p.course ? ` (${p.course})` : ""}`} />
          </ListGroup>
          <div className="-mt-2 mb-3 px-1"><DegreeCard p={p} run={run} /></div>
          {p.age >= 14 && (<><TradeCard p={p} run={run} /><PostgradCard p={p} run={run} /></>)}
          <SkillsCard p={p} run={run} />
        </>
      )}
      {sel === "jobs" && <JobsView p={p} run={run} />}
      {sel === "agent" && <RealtorView p={p} run={run} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Money tab
// ---------------------------------------------------------------------------
const INVEST_EMOJI: Record<string, string> = { savings: "🐖", bank: "🏦", tbill: "📜", bond: "📑", stocks: "📈", penny: "🪙", fund: "🧺", reit: "🏢", usd: "💵", crypto: "₿", cryptofund: "🧺", farm: "🌾", school: "🏫", oil: "🛢️" };
const LUX_EMOJI: Record<string, string> = { borehole: "🚰", owambe: "🎉", praise: "🎶", bodyguards: "🕶️", title: "👑", foundation: "🤲", schools: "🏫", convoy: "🚙", mansion: "🏰", dubai: "🏙️", london: "🇬🇧", jet: "🛩️", club: "⚽", university: "🎓", hajj: "🕋", godfather: "🕴️" };
type MoneySub = "wallet" | "home" | "property" | "garage" | "invest" | "spend";
function MoneyTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const [sub, setSub] = useState<MoneySub | null>(null);
  const [invPick, setInv] = useState<string | null>(null);
  const [luxPick, setLux] = useState<string | null>(null);
  const st = STATE_BY_ID[p.state];
  const net = worth(p);
  return (
    <>
      <ListGroup>
        <div className="grid grid-cols-3 gap-2 px-3.5 py-3 text-center">
          <div><div className="text-[11px] text-slate-500">{T("Cash", "Cash")}</div><div className="text-base font-extrabold text-blue-600">{naira(p.money)}</div></div>
          <div><div className="text-[11px] text-slate-500">{T("Net worth", "Net worth")}</div><div className="text-base font-extrabold text-[#0b2a6b]">{naira(net)}</div></div>
          <div><div className="text-[11px] text-slate-500">{T("Debt", "Debt")}</div><div className={cx("text-base font-extrabold", p.debt > 0 ? "text-red-600" : "text-[#0b2a6b]")}>{naira(p.debt)}</div></div>
        </div>
        <ListRow emoji="📉" tile="bg-slate-100" wrap name={T("Prices rise every year", "Prices dey rise every year")} desc={T("Cash loses value. Houses and dollars hold up better.", "Cash dey lose value. House and dollar dey hold better.")} />
      </ListGroup>

      {sub === null && (
        <div className="space-y-4">
          {([
            { title: T("Money", "Money"), rows: [
              { id: "wallet" as const, emoji: "👛", tile: "bg-sky-100", name: T("Wallet", "Wallet"), desc: T(`Net worth ${naira(net)} · ledger, bills`, `Net worth ${naira(net)} · ledger, bills`) },
              { id: "invest" as const, emoji: "📈", tile: "bg-emerald-100", name: T("Invest", "Invest"), desc: T(`${p.holdings.length} holding${p.holdings.length === 1 ? "" : "s"} · stocks, bonds, crypto, adviser`, `${p.holdings.length} holding${p.holdings.length === 1 ? "" : "s"} · stocks, bonds, crypto, adviser`) },
              { id: "spend" as const, emoji: "💎", tile: "bg-violet-100", name: T("Spend", "Spend"), desc: T("Owambe, titles, security, foundations", "Owambe, titles, security, foundations") },
            ] },
            { title: T("Things you own", "Things you own"), rows: [
              { id: "home" as const, emoji: "🏠", tile: "bg-amber-100", name: T("Where I live", "Where I dey"), desc: T("Rent, build a house, mortgage", "Rent, build house, mortgage") },
              { id: "property" as const, emoji: "🏢", tile: "bg-orange-100", name: T("Property", "Property"), desc: T(`${p.houses.length} owned · buy across Nigeria`, `${p.houses.length} owned · buy across Nigeria`) },
              { id: "garage" as const, emoji: "🚗", tile: "bg-rose-100", name: T("Garage and fleet", "Garage and fleet"), desc: T(`${p.vehicles.length} vehicle${p.vehicles.length === 1 ? "" : "s"} · cars, jets, boats`, `${p.vehicles.length} vehicle${p.vehicles.length === 1 ? "" : "s"} · cars, jets, boats`) },
            ] },
          ]).map((g) => (
            <section key={g.title}>
              <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{g.title}</h2>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
                {g.rows.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSub(r.id)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-slate-50">
                    <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[24px]", r.tile)}>{r.emoji}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold leading-tight text-[#0b2a6b]">{r.name}</span><span className="block truncate text-[12px] leading-snug text-slate-500">{r.desc}</span></span>
                    <span className="shrink-0 text-xl font-black text-blue-500">›</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {sub !== null && <button type="button" onClick={() => setSub(null)} className="mb-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-slate-200">‹ {T("Money", "Money")}</button>}

      {sub === "wallet" && (<><NetWorthCard p={p} /><SubsCard p={p} /><LedgerCard p={p} /></>)}
      {sub === "garage" && <GarageCard p={p} run={run} />}
      {sub === "home" && (<>
      <HousingCard p={p} run={run} onBuy={() => setSub("property")} />

      <ListGroup title={T("Build a house", "Build a house")} sub={T(`Build in ${st.name}. Land is ${st.cost >= 1.4 ? "very expensive" : st.cost >= 0.9 ? "pricey" : "cheap"} here. Travel to build elsewhere.`, `Build for ${st.name}. Land ${st.cost >= 1.4 ? "cost too much" : st.cost >= 0.9 ? "cost small" : "cheap"} here. Travel go build for another place.`)}>
        {(Object.keys(HOUSE_KINDS) as (keyof typeof HOUSE_KINDS)[]).map((k) => {
          const c = buildCost(p, k);
          return <ListRow key={k} emoji="🏗️" tile="bg-amber-100" name={HOUSE_KINDS[k].label} right={naira(c)} disabled={p.money < c || st.abroad} onClick={() => run({ t: "build", kind: k })} />;
        })}
      </ListGroup>

      <MortgageCard p={p} run={run} />
      </>)}
      {sub === "property" && (<><PortfolioCard p={p} run={run} /><PropertyMarketCard p={p} run={run} /></>)}
      {sub === "invest" && (<>
      <MarketNewsCard p={p} run={run} />

      <ListGroup title={T("Invest", "Invest")} sub={T("Returns are not guaranteed.", "Profit no certain.")}>
        {INVESTMENTS.map((o) => <ListRow key={o.kind} emoji={INVEST_EMOJI[o.kind] ?? "💹"} tile="bg-emerald-100" name={o.label} desc={o.desc} right={`${T("min", "min")} ${naira(o.min * p.index)}`} onClick={() => setInv(o.kind)} />)}
      </ListGroup>
      {p.holdings.length > 0 && (
        <ListGroup title={T("Your portfolio", "Your investments")}>
          {p.holdings.map((h) => (
            <ListRow key={h.id} emoji="💼" tile="bg-sky-100" name={h.label} desc={`${T("Put in", "Wetin you put")} ${naira(h.invested)}`}
              right={<span className="text-right"><span className={cx("block", h.value >= h.invested ? "text-emerald-600" : "text-red-600")}>{naira(h.value)}</span><span className="text-[11px] font-semibold text-blue-600 underline" role="button" onClick={(e) => { e.stopPropagation(); run({ t: "divest", id: h.id }); }}>{T("Cash out", "Cash out")}</span></span>} />
          ))}
        </ListGroup>
      )}
      {invPick && (() => {
        const o = INVESTMENTS.find((x) => x.kind === invPick)!;
        const min = o.min * p.index;
        const amt = (frac: number) => Math.max(Math.round(p.money * frac), 0);
        return (
          <ActionSheet emoji={INVEST_EMOJI[o.kind] ?? "💹"} tile="bg-emerald-100" title={o.label} sub={`${T("min", "min")} ${naira(min)}`} onClose={() => setInv(null)}>
            <p className="mb-3 text-sm text-slate-600">{o.desc}</p>
            <div className="flex flex-wrap gap-2">
              {[0.1, 0.5, 1].map((f) => <Btn key={f} tone="ghost" disabled={amt(f) < min} onClick={() => { run({ t: "invest", kind: o.kind, amount: amt(f) }); setInv(null); }}>{f === 1 ? T("All cash", "All cash") : `${f * 100}% (${naira(amt(f))})`}</Btn>)}
            </div>
          </ActionSheet>
        );
      })()}
      </>)}

      {sub === "spend" && (
        <>
          <ListGroup title={T("Spend your money", "Spend your money")} sub={T("What big people spend on. Prestige counts toward your legacy.", "Wetin big people dey spend money on. Prestige dey add to your legacy.")}>
            {LUXURIES.map((l) => {
              const owned = l.once && p.flags[`own_${l.id}`];
              return <ListRow key={l.id} emoji={LUX_EMOJI[l.id] ?? "💎"} tile="bg-violet-100" name={l.label} desc={l.desc} right={owned ? T("Owned", "You get am") : `+${l.prestige} ${T("prestige", "prestige")}`} onClick={() => setLux(l.id)} />;
            })}
          </ListGroup>
          {luxPick && (() => {
            const l = LUXURIES.find((x) => x.id === luxPick)!;
            const block = luxuryBlock(p, l.id);
            const owned = l.once && p.flags[`own_${l.id}`];
            return (
              <ActionSheet emoji={LUX_EMOJI[l.id] ?? "💎"} tile="bg-violet-100" title={l.label} sub={<>{T("prestige", "prestige")} +{l.prestige}{l.good ? ` · ${T("good deed", "good deed")}` : ""}</>} onClose={() => setLux(null)}>
                <p className="mb-3 text-sm text-slate-600">{l.desc}</p>
                <Btn tone={owned ? "ghost" : "gold"} disabled={Boolean(block)} onClick={() => { run({ t: "luxury", id: l.id }); setLux(null); }}>
                  {owned ? T("Owned", "You get am") : T(`Buy (${naira(luxuryCost(p, l.cost))})`, `Buy (${naira(luxuryCost(p, l.cost))})`)}
                </Btn>
                {block && !owned && <p className="mt-2 text-xs text-red-600">{block}</p>}
                {l.upkeep && <p className="mt-2 text-[11px] text-slate-400">{T("upkeep", "upkeep")} {naira(luxuryCost(p, l.upkeep))}{T("/yr", "/yr")}</p>}
              </ActionSheet>
            );
          })()}
        </>
      )}
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
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function FamilyTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const [sub, setSub] = useState<"people" | "family" | "friends" | "class" | "love" | "will" | "awards" | null>(null);
  const alivePeople = Object.values(p.npcs).filter((n) => n.alive);
  const famCount = alivePeople.filter((n) => ["dad", "mom", "guardian", "sibling", "grandparent", "uncle", "aunt", "cousin"].includes(n.role)).length;
  const friendCount = alivePeople.filter((n) => n.role === "friend").length;
  const classCount = alivePeople.filter((n) => n.role === "classmate" && !n.former).length;
  const fam = STATE_BY_ID[p.family.state];
  const gifts = [100_000, 500_000, 2_000_000, 10_000_000];
  const luckWord = p.luck >= 65 ? T("Born under a lucky star", "Luck dey your side") : p.luck <= 35 ? T("Life no easy for you", "Life no easy for you") : T("Fortune is neutral", "Luck dey middle");
  return (
    <>
      {sub === null && (
        <div className="space-y-4">
          <section>
            <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("Family", "Family")}</h2>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
              {[
                { id: "people" as const, emoji: "👨‍👩‍👧", tile: "bg-sky-100", name: T("My household", "My household"), desc: T(`${p.kids.length} child${p.kids.length === 1 ? "" : "ren"} · family happiness ${Math.round(p.family.happy)}%`, `${p.kids.length} pikin · family happiness ${Math.round(p.family.happy)}%`) },
                { id: "family" as const, emoji: "🏠", tile: "bg-amber-100", name: T("Family members", "Family members"), desc: T(`${famCount} · parents, siblings, relatives`, `${famCount} · parents, siblings, relatives`) },
                { id: "friends" as const, emoji: "🧑‍🤝‍🧑", tile: "bg-emerald-100", name: T("Friends", "Friends"), desc: T(`${friendCount} friend${friendCount === 1 ? "" : "s"} · hang out, make new ones`, `${friendCount} padi · hang out, make new ones`) },
                { id: "class" as const, emoji: "🎒", tile: "bg-violet-100", name: T("Classmates", "Classmates"), desc: classCount ? T(`${classCount} in your class`, `${classCount} for your class`) : T("Primary, secondary, university", "Primary, secondary, university") },
                { id: "love" as const, emoji: "❤️", tile: "bg-rose-100", name: T("Love life", "Love life"), desc: p.spouse ? T(`Married to ${p.spouse.name}`, `You marry ${p.spouse.name}`) : p.flags.dating ? T(`Dating ${String(p.flags.dating)}`, `You dey date ${String(p.flags.dating)}`) : T("Dating, marriage and children", "Dating, marriage and pikin") },
                ...(p.age >= 18 ? [{ id: "will" as const, emoji: "📜", tile: "bg-amber-100", name: T("Will", "Will"), desc: T("Decide who gets what", "Decide who go get wetin") }] : []),
                { id: "awards" as const, emoji: "🏆", tile: "bg-violet-100", name: T("Achievements", "Achievements"), desc: T(`${p.achievements.length} earned`, `${p.achievements.length} don win`) },
              ].map((r) => (
                <button key={r.id} type="button" onClick={() => setSub(r.id)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-slate-50">
                  <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[24px]", r.tile)}>{r.emoji}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold leading-tight text-[#0b2a6b]">{r.name}</span><span className="block truncate text-[12px] leading-snug text-slate-500">{r.desc}</span></span>
                  <span className="shrink-0 text-xl font-black text-blue-500">›</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {sub !== null && <button type="button" onClick={() => setSub(null)} className="mb-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-slate-200">‹ {T("Family", "Family")}</button>}
      {sub === "people" && (<>
      <ListGroup title={T("Your people", "Your people")}>
        <div className="px-3.5 py-3">
          <div className="flex flex-wrap gap-3">
          {p.family.dad && <Person look={p.family.dad} gender="male" age={p.age + 29} label={T("Papa", "Papa")} sub={p.family.parentsAlive ? T("alive", "dey alive") : T("late", "late")} dim={!p.family.parentsAlive} />}
          {p.family.mom && <Person look={p.family.mom} gender="female" age={p.age + 26} label={T("Mama", "Mama")} sub={p.family.parentsAlive ? T("alive", "dey alive") : T("late", "late")} dim={!p.family.parentsAlive} />}
          {p.spouse?.look && <Person look={p.spouse.look} gender={p.gender === "male" ? "female" : "male"} age={p.age} label={p.spouse.name} sub={T(`spouse · ${Math.round(p.spouse.happy)}% happy`, `spouse · ${Math.round(p.spouse.happy)}% happy`)} />}
          {p.kids.map((k, i) => k.look && <Person key={i} look={k.look} gender={k.gender} age={k.age} label={k.name} sub={T(`age ${k.age}`, `age ${k.age}`)} />)}
        </div>
        </div>
        <ListRow emoji="📍" tile="bg-emerald-100" name={`${T("Family lives in", "Your family dey live for")} ${fam.name}`} desc={fam.opp <= 3 ? T("Opportunities there are limited. They would love to move somewhere better.", "Opportunity there small. Dem go like move go better place.") : T("They are doing alright there.", "Dem dey do well there.")} wrap />
        <ListRow emoji="💞" tile="bg-rose-100" name={T("Family happiness", "Family happiness")} desc={luckWord} right={`${Math.round(p.family.happy)}%`} />
        {p.houses.length > 0 && <ListRow emoji="💡" tile="bg-blue-100" name={T("Tip", "Tip")} desc={T("Use a house as \"Family\" in the Money tab to bring them to your state.", "Set one house as \"Family\" for Money tab to bring dem come your state.")} wrap />}
        {gifts.map((a) => <ListRow key={a} emoji="💸" tile="bg-amber-100" name={`${T("Send", "Send")} ${naira(a * p.index)}`} desc={T("to your family", "to your family")} disabled={p.money < a * p.index} onClick={() => run({ t: "send", amount: a * p.index })} />)}
      </ListGroup>
      <BackgroundCard p={p} /><OwedCard p={p} />
      </>)}
      {sub === "awards" && (<>
      <ListGroup title={T("Achievements", "Achievements")}>
        {p.achievements.length === 0 ? <ListRow emoji="🏆" tile="bg-slate-100" name={T("None yet", "Nothing yet")} /> : p.achievements.map((a) => <ListRow key={a} emoji="🏆" tile="bg-violet-100" name={a} />)}
      </ListGroup>
      </>)}
      {sub === "family" && <PeopleList p={p} run={run} group="family" />}
      {sub === "friends" && <PeopleList p={p} run={run} group="friends" />}
      {sub === "class" && <PeopleList p={p} run={run} group="class" />}
      {sub === "will" && p.age >= 18 && <WillCard p={p} run={run} />}
      {sub === "love" && (<>
      <RelationshipsCard p={p} run={run} />
      {!p.spouse && p.flags.dating && <ListGroup title={T("Dating", "Dating")}><ListRow emoji="💞" tile="bg-rose-100" wrap name={T(`Dating ${String(p.flags.dating)}`, `You dey date ${String(p.flags.dating)}`)} desc={T("A proposal may be coming.", "Proposal fit dey come.")} /></ListGroup>}
      </>)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Map tab
// ---------------------------------------------------------------------------
function MapTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const [dest, setDest] = useState<string | null>(null);
  const st = STATE_BY_ID[p.state];
  const regions = Array.from(new Set(TRAVEL_STATES.map((s) => s.region)));
  const REG_EMOJI: Record<string, [string, string]> = { "North Central": ["🌾", "bg-amber-100"], "North East": ["🏜️", "bg-orange-100"], "North West": ["🕌", "bg-yellow-100"], "South East": ["⛪", "bg-emerald-100"], "South South": ["🛢️", "bg-sky-100"], "South West": ["🌆", "bg-indigo-100"] };
  const top = (
    <ListGroup title={T("You are in", "Where you dey")} sub={T("Opportunity affects pay and what jobs exist. Insecurity raises kidnap and robbery risk, especially when you travel.", "Opportunity dey affect pay and wetin job dey. Insecurity dey raise kidnap and robbery risk, especially when you travel.")}>
      <ListRow emoji="📍" tile="bg-red-100" name={st.name} desc={st.capital} />
      <div className="space-y-2 px-3.5 py-3">
        <Meter label={T("Jobs", "Jobs")} value={st.opp} />
        <Meter label={T("Cost", "Cost")} value={st.cost * 5} max={10} invert />
        <Meter label={T("Insecurity", "Insecurity")} value={st.risk} invert />
      </div>
    </ListGroup>
  );
  return (
    <>
      <Hub back={T("Map", "Map")} top={top} groups={[
        { title: T("Travel in Nigeria", "Travel for Nigeria"), rows: regions.map((r) => ({
          id: r, emoji: REG_EMOJI[r]?.[0] ?? "📍", tile: REG_EMOJI[r]?.[1] ?? "bg-slate-100", name: r, desc: T(`${TRAVEL_STATES.filter((x) => x.region === r).length} states`, `${TRAVEL_STATES.filter((x) => x.region === r).length} states`),
          node: (
            <div className="space-y-2">
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
                {TRAVEL_STATES.filter((s) => s.region === r).map((s) => {
                  const here = s.id === p.state;
                  const mine = p.houses.some((h) => h.state === s.id);
                  return (
                    <button key={s.id} type="button" disabled={here || p.age < 16 || p.prison > 0} onClick={() => setDest(s.id)} className={cx("flex w-full items-center gap-3 px-3.5 py-3 text-left disabled:opacity-100", here ? "bg-blue-50" : "bg-white active:bg-slate-50")}>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[22px]">{here ? "📍" : "🗺️"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-extrabold leading-tight text-[#0b2a6b]">{s.name} {s.id === p.family.state && <Badge>{T("family", "family")}</Badge>} {mine && <Badge tone="gold">{T("your house", "your house")}</Badge>}</span>
                        <span className="block text-[12px] text-slate-500">{T("Jobs", "Jobs")} {s.opp}/10 · {T("Cost", "Cost")} {Math.round(s.cost * 5)}/10 · {T("Risk", "Risk")} {s.risk}/10</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-blue-600">{here ? T("Here", "Here") : T("Go ›", "Go ›")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ),
        })) },
      ]} />
      {dest && STATE_BY_ID[dest] && <TravelSheet p={p} to={STATE_BY_ID[dest]} run={run} onClose={() => setDest(null)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Power tab
// ---------------------------------------------------------------------------
function RoutesCard() {
  const routes: [string, string][] = [
    [T("The Ballot Box", "The Ballot Box"), T("Councillor, LG chairman, Rep, Senator, Governor, then President. Slow, expensive and the most common road.", "Councillor, LG chairman, Rep, Senator, Governor, then President. Slow, e cost well and na the most common road.")],
    [T("The Kingmaker", "The Kingmaker"), T("As a governor or big financier, build the party machine, bankroll loyalists in other states, capture the electoral umpire and the courts, win the party ticket, then run.", "As governor or big financier, build the party machine, fund your loyalists for other states, control the electoral umpire and the courts, win the party ticket, then contest.")],
    [T("The General", "The General"), T("Rise in the army to Captain or above and plot a coup. If it fails you may go to prison, but a prisoner of conscience can come out a hero, get anointed by the elders and return as a civilian president.", "Rise for army reach Captain or above and plot coup. If e fail you fit enter prison, but prisoner of conscience fit come out as hero, elders go anoint you and you go return as civilian president.")],
    [T("The Understudy", "The Understudy"), T("Be offered the Vice President slot. If the president dies or falls ill, you step in.", "Dem give you Vice President slot. If president die or sick, you go take over.")],
    [T("The Exile", "The Exile"), T("Speak out against a regime, flee abroad, and come back as a hero when democracy returns.", "Talk against the regime, run go abroad, then come back as hero when democracy return.")],
  ];
  const emo = ["🗳️", "🕴️", "🪖", "🤝", "✈️"];
  return (
    <ListGroup title={T("Roads to the Villa", "Roads to the Villa")} sub={T("Different people got to the top different ways.", "Different people reach the top by different ways.")}>
      {routes.map(([t, d], i) => <ListRow key={t} emoji={emo[i] ?? "🛣️"} tile="bg-sky-100" name={t} desc={d} wrap />)}
    </ListGroup>
  );
}

function PowerTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const pol = p.politics;
  const coupBlock = canPlotCoup(p);
  const showCoup = p.job?.id === "soldier" || Boolean(pol?.militaryRuler);
  const coupCard = showCoup && (
    <ListGroup title={T("Plot a coup", "Plot coup")} sub={T("High risk. Success makes you head of state. Failure means prison, or worse.", "Risk plenty. If you win, you be head of state. If you fail, na prison, or worse.")}>
      <ListRow emoji="🪖" tile="bg-red-100" name={T("Seize power", "Take power")} note={coupBlock} disabled={Boolean(coupBlock)} onClick={() => run({ t: "coup" })} />
    </ListGroup>
  );
  if (!pol) {
    const block = canJoinPolitics(p);
    return (
      <Hub back={T("Power", "Power")} groups={[{ rows: [
        { id: "join", emoji: "🗳️", tile: "bg-yellow-100", name: T("Join politics", "Join politics"), desc: T("From councillor to President", "From councillor to President"), node: (<>
        <ListGroup title={T("Politics", "Politics")} sub={T("From councillor to President. It costs money, connections and (sometimes) your conscience. Once you hold power you can build the country, or loot it.", "From councillor reach President. E need money, connection and (sometimes) your conscience. Once you get power you fit build the country, or loot am.")}>
          <ListRow emoji="🗳️" tile="bg-yellow-100" name={T("Join a political party", "Join political party")} right={naira(2_000_000 * p.index)} note={block} disabled={Boolean(block)} onClick={() => run({ t: "joinPolitics" })} />
        </ListGroup></> ) },
        { id: "coup", emoji: "🪖", tile: "bg-red-100", name: T("Seize power", "Seize power"), desc: T("High risk coup", "Coup, risk plenty"), hidden: !showCoup, node: coupCard },
        { id: "routes", emoji: "🛣️", tile: "bg-sky-100", name: T("Roads to the Villa", "Roads to the Villa"), desc: T("Five ways to the top", "Five ways reach the top"), node: <RoutesCard /> },
      ] }]} />
    );
  }
  const holding = pol.office >= 0 ? OFFICES[pol.office] : null;
  const next = pol.highest + 1 < OFFICES.length ? OFFICES[pol.highest + 1] : null;
  const block = canContest(p);
  const n = p.nation;
  const ruler = p.loot > 0 && p.goodDeeds <= 3 ? T("Looter", "Looter") : p.goodDeeds >= 6 && p.loot === 0 ? T("Reformer", "Reformer") : p.goodDeeds > 0 && p.loot > 0 ? T("Mixed record", "Mixed record") : T("Unknown", "Unknown");
  const zone = currentZone(p);
  const mine = playerZone(p);
  return (
    <Hub back={T("Power", "Power")} groups={[
      { rows: [
      { id: "office", emoji: "🏛️", tile: "bg-yellow-100", name: officeTitle(p) ?? T("Out of office", "No dey office"), desc: next && !pol.militaryRuler ? T(`Next: ${next.title}`, `Next: ${next.title}`) : T("Your political career", "Your political career"), node: (<>
      <ListGroup title={officeTitle(p) ?? T("Out of office", "No dey office")}>
        {holding && !pol.militaryRuler && <ListRow emoji="🏛️" tile="bg-yellow-100" name={T(`Term ${pol.terms}`, `Term ${pol.terms}`)} desc={T(`${pol.yearsLeft} year${pol.yearsLeft === 1 ? "" : "s"} left`, `${pol.yearsLeft} year${pol.yearsLeft === 1 ? "" : "s"} remain`)} right={`${naira(holding.salary * Math.pow(p.index, 0.9))}/${T("yr", "yr")}`} />}
        {pol.militaryRuler && <ListRow emoji="🪖" tile="bg-red-100" name={T("You rule by decree", "You dey rule by decree")} desc={T("Watch out for counter-coups.", "Watch out for counter-coup.")} wrap />}
        {pol.anointed && <ListRow emoji="🙏" tile="bg-yellow-100" name={T("Anointed", "Anointed")} />}
        {pol.hero && <ListRow emoji="🦸" tile="bg-emerald-100" name={T("People's hero", "People hero")} />}
        {pol.vp && <ListRow emoji="🤝" tile="bg-sky-100" name={T("Vice President", "Vice President")} />}
        {pol.godfather && <ListRow emoji="🕴️" tile="bg-rose-100" name={T("Owes a godfather", "Godfather dey follow you")} />}
        {pol.defected && <ListRow emoji="🔀" tile="bg-slate-100" name={T("Defected", "Defected")} />}
        {pol.kingmaker > 0 && <ListRow emoji="👑" tile="bg-yellow-100" name={`${T("Kingmaker", "Kingmaker")} ×${pol.kingmaker}`} />}
        <ListRow emoji="🗺️" tile="bg-violet-100" wrap name={T(`Presidency zoned to the ${zone}`, `Presidency zone to ${zone}`)} desc={`${T(`You are from the ${mine}`, `You come from ${mine}`)}${zone === mine ? T(". Advantage!", ". Na advantage!") : T(". Disadvantage.", ". Na disadvantage.")}`} />
        {next && !pol.militaryRuler && <ListRow emoji="🗳️" tile="bg-blue-100" name={T(`Run for ${next.title}`, `Contest for ${next.title}`)} note={block} disabled={Boolean(block)} onClick={() => run({ t: "contest" })} />}
        <ListRow emoji="📜" tile="bg-amber-100" wrap name={`${T("Your name as ruler", "Your name as ruler")}: ${ruler}`} desc={`${T("Stolen", "Stolen")} ${naira(p.loot)} · ${T("Good deeds", "Good deeds")} ${p.goodDeeds}`} />
      </ListGroup></>) },
      { id: "base", emoji: "🧱", tile: "bg-amber-100", name: T("Power base", "Power base"), desc: T("Party, umpire, courts, security", "Party, umpire, courts, security"), node: (<>
      <ListGroup title={T("Power bases", "Power bases")} sub={T("These decide who wins the ticket, the vote and the court case.", "These ones dey decide who go win ticket, vote and court case.")}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-3.5 py-3">
          <Bar label={T("Party machine", "Party machine")} value={pol.machine} tone="gold" />
          <Bar label={T("Electoral umpire (INEC)", "Electoral umpire (INEC)")} value={pol.umpire} tone="gold" />
          <Bar label={T("Courts", "Courts")} value={pol.courts} tone="gold" />
          <Bar label={T("Security chiefs", "Security chiefs")} value={pol.military} tone="gold" />
        </div>
      </ListGroup>
      <ListGroup title={T("Power moves", "Power moves")}>
        {POWER_MOVES.map((m) => { const b = powerMoveBlock(p, m.id); return <ListRow key={m.id} emoji="♟️" tile="bg-amber-100" name={m.label} desc={m.desc} wrap right={naira(powerMoveCost(p, m.id))} note={b} disabled={Boolean(b)} onClick={() => run({ t: "power", id: m.id })} />; })}
      </ListGroup></>) },
      { id: "coup", emoji: "🪖", tile: "bg-red-100", name: T("Seize power", "Seize power"), desc: T("High risk coup", "Coup, risk plenty"), hidden: !showCoup, node: coupCard },
      { id: "nation", emoji: "🇳🇬", tile: "bg-emerald-100", name: T("State of the nation", "How the country be"), desc: T(`Economy ${Math.round(n.economy)} · approval ${Math.round(n.approval)}`, `Economy ${Math.round(n.economy)} · approval ${Math.round(n.approval)}`), hidden: !holding, node: (<>
          <ListGroup title={T("The state of the nation", "How the country be")}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-3.5 py-3">
              <Bar label={T("Economy", "Economy")} value={n.economy} />
              <Bar label={T("Security", "Security")} value={n.security} />
              <Bar label={T("Welfare", "Welfare")} value={n.welfare} />
              <Bar label={T("Approval", "Approval")} value={n.approval} tone="gold" />
              <Bar label={T("EFCC / coup heat", "EFCC / coup heat")} value={n.heat} invert />
            </div>
          </ListGroup></>) },
      { id: "gov", emoji: "📋", tile: "bg-sky-100", name: T("Run the country", "Run the country"), desc: T(`${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} left this year`, `${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} remain this year`), hidden: !holding, node: (<>
          {(["good", "corrupt", "neutral"] as const).map((side) => (
            <ListGroup key={side} title={side === "good" ? T("Rule well", "Rule well") : side === "corrupt" ? T("Be corrupt", "Chop public money") : T("Politics as usual", "Normal politics")} sub={T(`${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} left this year`, `${p.actionsLeft} action remain this year`)}>
              {GOV_ACTIONS.filter((a) => a.side === side && pol.office >= a.minOffice).map((a) => {
                const dis = a.disabled?.(p) || (p.actionsLeft <= 0 ? T("No actions left", "No action remain") : false);
                return <ListRow key={a.id} emoji={side === "good" ? "🏗️" : side === "corrupt" ? "💰" : "🤝"} tile={side === "good" ? "bg-emerald-100" : side === "corrupt" ? "bg-rose-100" : "bg-sky-100"} name={a.label} desc={a.desc} wrap note={dis || undefined} disabled={Boolean(dis)} onClick={() => run({ t: "gov", id: a.id })} />;
              })}
            </ListGroup>
          ))}</>) },
      { id: "routes", emoji: "🛣️", tile: "bg-violet-100", name: T("Roads to the Villa", "Roads to the Villa"), desc: T("Five ways to the top", "Five ways reach the top"), node: <RoutesCard /> },
      ] }]} />
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
    kicker: T("Naija Life · Family Legacy", "Naija Life · Family Legacy"),
    title: T(`The ${d.surname} Dynasty`, `The ${d.surname} Dynasty`),
    stats: [
      { label: T("Generations", "Generations"), value: String(gens) },
      { label: T("Richest peak fortune", "Biggest fortune"), value: naira(richest) },
      { label: T("Prestige earned", "Prestige wey you earn"), value: String(prestige) },
    ],
    lines: best ? [T(`Greatest: ${best.name}, ${best.epitaph} (${best.highestOffice}).`, `Greatest: ${best.name}, ${best.epitaph} (${best.highestOffice}).`)] : [T(`Current head: ${current.name} ${current.surname}.`, `Current head: ${current.name} ${current.surname}.`)],
  };
}

function LegacyTab({ g }: { g: Game }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const card = lineageCard(g.dynasty, g.p);
    const r = await shareCard(card, T(`${card.title} on Naija Life: ${card.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}`, `${card.title} for Naija Life: ${card.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}`));
    setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  const p = g.p;
  return (
    <Hub back={T("Legacy", "Legacy")} groups={[{ rows: [
      { id: "dyn", emoji: "👑", tile: "bg-amber-100", name: T(`The ${g.dynasty.surname} dynasty`, `The ${g.dynasty.surname} dynasty`), desc: T(`Generation ${p.generation} · share your legacy`, `Generation ${p.generation} · share your legacy`), node: (<>
      <ListGroup title={T(`The ${g.dynasty.surname} dynasty`, `The ${g.dynasty.surname} dynasty`)}>
        <ListRow emoji="👑" tile="bg-amber-100" wrap name={T(`Generation ${p.generation}`, `Generation ${p.generation}`)} desc={T("When you die you continue as one of your children, with 70% of everything you built. The family name keeps growing.", "When you die you go continue as one of your pikin, with 70% of everything wey you build. The family name go dey grow.")} />
        <ListRow emoji="📤" tile="bg-blue-100" name={T("Share legacy card", "Share legacy card")} onClick={share} />
        {msg && <ListRow emoji="✅" tile="bg-emerald-100" name={msg} />}
      </ListGroup></>) },
      { id: "moments", emoji: "📸", tile: "bg-pink-100", name: T("Moments", "Moments"), desc: T(`${p.moments?.length ?? 0} shareable`, `${p.moments?.length ?? 0} to share`), node: <MomentsPanel p={p} /> },
      { id: "goals", emoji: "🎯", tile: "bg-emerald-100", name: T("Bucket list", "Bucket list"), desc: T(`${(p.goals ?? []).filter((x) => x.done).length}/${(p.goals ?? []).length} goals done`, `${(p.goals ?? []).filter((x) => x.done).length}/${(p.goals ?? []).length} goals done`), node: <GoalsPanel p={p} /> },
      { id: "gist", emoji: "🗞️", tile: "bg-sky-100", name: T("Naija Gist", "Naija Gist"), desc: T("What people are saying today", "Wetin people dey talk today"), node: <GistPanel p={p} /> },
      { id: "chal", emoji: "🏆", tile: "bg-amber-100", name: T("Weekly challenge", "Weekly challenge"), desc: T("Same start for everyone this week", "Same start for everybody this week"), node: <ChallengePanel p={p} /> },
      { id: "cur", emoji: "🧬", tile: "bg-sky-100", name: T("Current life", "Current life"), desc: `${p.name} ${p.surname} · ${T("Prestige", "Prestige")} ${p.prestige}`, node: (<>
      <ListGroup title={T("Current life", "Current life")}>
        <ListRow emoji="🧬" tile="bg-sky-100" name={`${p.name} ${p.surname}`} desc={`${T("Prestige", "Prestige")} ${p.prestige} · ${T("Peak worth", "Highest worth")} ${naira(p.peakWorth)}`} />
        <ListRow emoji="⚖️" tile="bg-amber-100" name={T("Record", "Record")} desc={`${T("Good deeds", "Good deeds")} ${p.goodDeeds} · ${T("Stolen", "Stolen")} ${naira(p.loot)} · ${T("Kidnapped", "Dem kidnap you")} ${p.kidnaps}×`} wrap />
      </ListGroup>
      </>) },
      { id: "anc", emoji: "🕯️", tile: "bg-violet-100", name: T("Ancestors", "Ancestors"), desc: T(`${g.dynasty.lineage.length} before you`, `${g.dynasty.lineage.length} before you`), hidden: g.dynasty.lineage.length === 0, node: (<>
      {g.dynasty.lineage.length > 0 && (
        <ListGroup title={T("Ancestors", "Ancestors")}>
          {[...g.dynasty.lineage].reverse().map((l, i) => (
            <ListRow key={i} emoji="🕯️" tile="bg-violet-100" wrap name={l.name} right={`${T("Gen", "Gen")} ${l.generation}`}
              desc={`${l.epitaph} · ${T(`Lived ${l.ageAtDeath} yrs`, `Live ${l.ageAtDeath} yrs`)} · ${l.highestOffice} · ${T("peak", "peak")} ${naira(l.peakWorth)} · ${l.cause}`} />
          ))}
        </ListGroup>
      )}</>) },
    ] }]} />
  );
}

// ---------------------------------------------------------------------------
// Death screen
// ---------------------------------------------------------------------------
function DeathScreen({ g, onHeir, onNew }: { g: Game; onHeir: (i: number) => void; onNew: (o: { name: string; gender: Gender; stateId: string | null; tribe: string | null; religion: string | null }) => void }) {
  const p = g.p;
  const entry = g.dynasty.lineage[g.dynasty.lineage.length - 1];
  const [msg, setMsg] = useState("");
  const obit = useObituary(p);
  const share = async () => {
    const r2 = await shareObituary(p, obit, "post");
    setMsg(r2 === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  const shareLegacy = async () => {
    const r = await shareCard(
      {
        kicker: T(`Naija Life · Generation ${p.generation}`, `Naija Life · Generation ${p.generation}`),
        title: `${p.name} ${p.surname}`,
        stats: [
          { label: T("Lived", "Years wey you live"), value: T(`${p.age} years`, `${p.age} years`) },
          { label: T("Peak fortune", "Biggest fortune"), value: naira(p.peakWorth) },
          { label: T("Known as", "Dem know am as"), value: entry?.epitaph ?? T("A Survivor", "A Survivor") },
        ],
        lines: [T(`Died: ${p.cause}.`, `E die: ${p.cause}.`), entry ? T(`Highest role: ${entry.highestOffice}.`, `Highest position: ${entry.highestOffice}.`) : ""],
      },
      T(`${p.name} ${p.surname} lived ${p.age} years in Naija Life. ${entry?.epitaph ?? ""}`, `${p.name} ${p.surname} live ${p.age} years for Naija Life. ${entry?.epitaph ?? ""}`),
    );
    setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  return (
    <Sheet title={T("Your life has ended", "Your life don end")}>
      <div className="mb-2 flex justify-center"><Avatar look={p.look} gender={p.gender} age={p.age} size={96} dim /></div>
      <p className="font-serif text-2xl font-bold">{p.name} {p.surname}</p>
      <p className="text-sm text-slate-600">{T(`Died at ${p.age}`, `E die at ${p.age}`)} · {p.cause}</p>
      <div className="my-3"><ObituaryView p={p} o={obit} /></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Card className="p-3"><div className="text-[11px] text-slate-500">{T("Net worth at death", "Worth wen e die")}</div><div className="font-bold text-blue-600">{naira(entry?.worth ?? 0)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-slate-500">{T("Remembered as", "Dem go remember am as")}</div><div className="font-bold">{entry?.epitaph}</div></Card>
      </div>
      <div className="mt-4 space-y-2">
        {p.kids.length > 0 ? (
          <>
            <p className="text-sm text-slate-700">{T("Who carries the family name?", "Who go carry the family name?")}</p>
            {p.kids.map((k, i) => (
              <Btn key={i} className="w-full" onClick={() => onHeir(i)}>{T(`Continue as ${k.name} ${p.surname} (age ${k.age})`, `Continue as ${k.name} ${p.surname} (age ${k.age})`)}</Btn>
            ))}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">{T("You had no children. The bloodline ends here.", "You no get pikin. The family line end here.")}</p>
            <Btn className="w-full" onClick={() => onNew({ name: "", gender: chance(0.5) ? "male" : "female", stateId: null, tribe: null, religion: null })}>{T("Start a brand-new family", "Start new family")}</Btn>
          </>
        )}
        <Btn tone="gold" className="w-full" onClick={share}>{T("Share the funeral report", "Share the funeral report")}</Btn>
        <Btn tone="ghost" className="w-full" onClick={async () => { const r3 = await shareObituary(p, obit, "story"); setMsg(r3 === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!")); }}>{T("Share as a story (9:16)", "Share as story (9:16)")}</Btn>
        <Btn tone="ghost" className="w-full" onClick={shareLegacy}>{T("Share the legacy card", "Share the legacy card")}</Btn>
        {msg && <p className="text-center text-xs text-emerald-600">{msg}</p>}
      </div>
    </Sheet>
  );
}
