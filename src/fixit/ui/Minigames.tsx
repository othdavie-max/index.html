"use client";
/** Short, tappable games that replace a dice roll with your own skill: haggling with a union, auditing a padded budget,
 *  choosing who to trust on coup night, a rally, a timed debate. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../../game/ui/kit";
import { hashString } from "../../game/engine/rng";
import { sfx } from "./sound";

export type MiniGame = "haggle" | "audit" | "coupnight";
/** events that offer a mini-game, and which option it decides */
export const EVENT_MINIS: Record<string, { game: MiniGame; opt: string; label: string; blurb: string }> = {
  unionWage: { game: "haggle", opt: "half", label: "Haggle face to face", blurb: "Meet the union leader. Find the number he will accept without overpaying." },
  budgetPadding: { game: "audit", opt: "veto", label: "Audit it yourself", blurb: "Find the fake lines in the budget before the Senate President arrives. Find them and your veto sticks." },
  coupAttempt: { game: "coupnight", opt: "loyal", label: "Coup night: decide who to trust", blurb: "You have ten seconds and one phone call." },
};

function Overlay({ title, sub, children, onClose }: { title: string; sub: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fx-mg" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fx-mg-card">
        <div className="g-tiny" style={{ letterSpacing: ".14em", fontWeight: 800, color: "#8a6a12" }}>PLAY IT OUT</div>
        <h2>{title}</h2>
        <p className="g-small g-muted">{sub}</p>
        {children}
        {onClose && <button className="fx-mg-skip" onClick={onClose}>Cancel</button>}
      </div>
    </div>
  );
}
function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  useEffect(() => { end.current = onEnd; });
  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = setInterval(() => { const l = Math.max(0, seconds - (Date.now() - t0) / 1000); setLeft(l); if (l <= 0) { clearInterval(id); end.current(); } }, 100);
    return () => clearInterval(id);
  }, [running, seconds]);
  return left;
}
const Timer = ({ left, total }: { left: number; total: number }) => <div className="fx-mg-timer" role="progressbar" aria-label="Time left" aria-valuenow={Math.round(left)} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${(left / total) * 100}%`, background: left < total * 0.3 ? "#e11d48" : "#c8a24a" }} /></div>;

// ---------------------------------------------------------------- haggle
function Haggle({ seed, onDone, onClose }: { seed: string; onDone: (ok: boolean, msg: string) => void; onClose: () => void }) {
  const r = useMemo(() => 36 + (hashString(seed) % 34), [seed]);
  const [offer, setOffer] = useState(30);
  const [round, setRound] = useState(1);
  const [say, setSay] = useState("The union leader folds his arms: 'Make me an offer.'");
  const bid = () => {
    sfx("tap");
    const d = offer - r;
    if (d >= 0 && d <= 13) { sfx("good"); onDone(true, "A deal at 2 a.m., and he shook your hand. You did not overpay."); return; }
    if (d > 13) { sfx("good"); onDone(true, "He accepted before you finished the sentence. You overpaid, but the strike is off."); return; }
    if (round >= 3) { sfx("bad"); onDone(false, "He walked out and called the strike."); return; }
    setSay(d < -22 ? "'Is this a joke?' He stands up to leave." : d < -10 ? "'You are insulting the workers.' But he stays seated." : "'Closer. Much closer. Think about it.'");
    setRound(round + 1);
  };
  return (
    <Overlay title="Haggle with the union" sub={`Offer a pay rise. You have 3 tries. Too low and he walks; too high and you overpay. (Offer ${round} of 3)`} onClose={onClose}>
      <div className="fx-mg-say">🧑🏾‍🏭 {say}</div>
      <label htmlFor="hg" className="g-small"><b>Your offer: {offer}</b> <span className="g-muted">(0 = nothing, 100 = everything)</span></label>
      <input id="hg" type="range" min={0} max={100} value={offer} onChange={(e) => setOffer(Number(e.target.value))} />
      <Button variant="primary" onClick={bid}>Make the offer</Button>
    </Overlay>
  );
}

// ---------------------------------------------------------------- audit
const LEGIT = ["Road resurfacing, Kano ring road", "Hospital equipment, 12 clinics", "School desks and roofs, Kogi", "Water treatment plant, Enugu", "Rural electrification, Niger State", "Teacher training programme", "Bridge repair, Ondo", "Border post upgrade, Seme"];
const PADDED = ["100 empowerment trucks (no trucks exist)", "Borehole, village that sits on a river", "Presidential goat-rearing project, ₦2bn", "Solar street lights for a lit city", "Training for 4,000 ghost workers", "Constituency road, length: 0 km", "Gym and spa for Assembly staff", "Foreign 'study tour' for committee wives"];
function Audit({ seed, onDone, onClose }: { seed: string; onDone: (ok: boolean, msg: string) => void; onClose: () => void }) {
  const items = useMemo(() => {
    const h = hashString(seed);
    const pad = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => ((a * 31 + h) % 17) - ((b * 31 + h) % 17)).slice(0, 3).map((i) => PADDED[i]);
    const ok = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => ((a * 13 + h) % 11) - ((b * 13 + h) % 11)).slice(0, 5).map((i) => LEGIT[i]);
    return [...pad.map((t) => ({ t, pad: true })), ...ok.map((t) => ({ t, pad: false }))].sort((a, b) => ((a.t.length * 7 + h) % 13) - ((b.t.length * 7 + h) % 13));
  }, [seed]);
  const [flag, setFlag] = useState<Set<string>>(new Set());
  const [fin, setFin] = useState(false);
  const finish = () => {
    if (fin) return; setFin(true);
    const hits = items.filter((i) => i.pad && flag.has(i.t)).length, wrong = items.filter((i) => !i.pad && flag.has(i.t)).length;
    const ok = hits >= 2 && wrong <= 1;
    sfx(ok ? "good" : "bad");
    onDone(ok, ok ? `You found ${hits} of the 3 fake lines. With the evidence on TV, your veto holds.` : `You flagged ${wrong} honest lines and missed ${3 - hits} fake ones. The Senate President laughed at your 'audit'.`);
  };
  const left = useCountdown(20, !fin, finish);
  return (
    <Overlay title="Audit the padded budget" sub="Three lines are fake. Tap the ones that are padding, then submit. Wrongly flagging honest lines costs you." onClose={onClose}>
      <Timer left={left} total={20} />
      <div className="fx-mg-grid">{items.map((i) => <button key={i.t} className="fx-mg-item" aria-pressed={flag.has(i.t)} onClick={() => { sfx("tap"); const n = new Set(flag); if (n.has(i.t)) n.delete(i.t); else n.add(i.t); setFlag(n); }}>{i.t}</button>)}</div>
      <Button variant="primary" onClick={finish}>Submit my audit ({flag.size} flagged)</Button>
    </Overlay>
  );
}

// ---------------------------------------------------------------- coup night
const OFFICERS = [
  { loyal: ["His salary was paid early and he thanked you for it.", "His son lives in the barracks next to the villa.", "At the last briefing he said: 'whatever happens, I am with you'."], traitor: ["His phone has been off since 10 p.m.", "His car was seen at the plotters' meeting point.", "He asked three aides where you were sleeping tonight."], neutral: ["He says he is 'waiting for orders from the proper authority'.", "He has not slept in the barracks for two days.", "He avoided the photo at the last parade."] },
];
const NAMES = ["Col. Bala Ahmed", "Gen. Tunde Ojo", "Brig. Emeka Nwosu", "Maj. Gen. Yusuf Dikko", "Col. Segun Adeyemi", "Brig. Gen. Ngozi Eze"];
function CoupNight({ seed, onDone, onClose }: { seed: string; onDone: (ok: boolean, msg: string) => void; onClose: () => void }) {
  const h = hashString(seed);
  const order = useMemo(() => (["loyal", "traitor", "neutral"] as const).map((k, i) => ({ k, name: NAMES[(h + i * 2) % 6], cues: [OFFICERS[0][k][(h + i) % 3], OFFICERS[0][k][(h + i + 1) % 3]] })).sort((a, b) => ((a.name.length * 3 + h) % 7) - ((b.name.length * 3 + h) % 7)), [h]);
  const [done, setDone] = useState(false);
  const pick = (k: string | null) => {
    if (done) return; setDone(true);
    if (k === "loyal") { sfx("good"); onDone(true, "You called the right man. His loyal units sealed the road to the villa."); }
    else if (k === "neutral" && h % 3 === 0) { sfx("good"); onDone(true, "The 'neutral' general hesitated, then stood with you. You were lucky."); }
    else { sfx("doom"); onDone(false, k === "traitor" ? "You called a plotter. He told them exactly where you were." : "You hesitated and the minutes ran out."); }
  };
  const left = useCountdown(10, !done, () => pick(null));
  return (
    <Overlay title="Coup night" sub="Armoured vehicles are on the road to the villa. You can call one officer. Read the clues carefully. Ten seconds." onClose={onClose}>
      <Timer left={left} total={10} />
      <div className="fx-mg-grid">{order.map((o) => <button key={o.name} className="fx-mg-item" onClick={() => pick(o.k)}><b>{o.name}</b><span>{o.cues[0]}</span><span>{o.cues[1]}</span></button>)}</div>
    </Overlay>
  );
}

export function MiniHost({ game, seed, onDone, onClose }: { game: MiniGame; seed: string; onDone: (ok: boolean, msg: string) => void; onClose: () => void }) {
  const [res, setRes] = useState<{ ok: boolean; msg: string } | null>(null);
  if (res) return <Overlay title={res.ok ? "You did it" : "It went wrong"} sub={res.msg}><Button variant="primary" onClick={() => onDone(res.ok, res.msg)}>Continue</Button></Overlay>;
  const done = (ok: boolean, msg: string) => setRes({ ok, msg });
  if (game === "haggle") return <Haggle seed={seed} onDone={done} onClose={onClose} />;
  if (game === "audit") return <Audit seed={seed} onDone={done} onClose={onClose} />;
  return <CoupNight seed={seed} onDone={done} onClose={onClose} />;
}

// ---------------------------------------------------------------- rally: tap to build the crowd
export function RallyTap({ place, onDone, onClose }: { place: string; onDone: (boost: number) => void; onClose: () => void }) {
  const [taps, setTaps] = useState(0);
  const [on, setOn] = useState(false);
  const [fin, setFin] = useState(false);
  const left = useCountdown(6, on && !fin, () => { setFin(true); });
  const boost = Math.min(1.6, 0.7 + taps / 40);
  return (
    <Overlay title={`Rally in the ${place}`} sub="Get the crowd roaring! Tap the megaphone as fast as you can for six seconds." onClose={fin ? undefined : onClose}>
      <Timer left={on ? left : 6} total={6} />
      <div className="fx-mg-crowd" aria-hidden>{"🙌".repeat(Math.min(14, 3 + Math.floor(taps / 4)))}</div>
      {!fin ? <button className="fx-mg-tap" onClick={() => { if (!on) setOn(true); setTaps((t) => t + 1); sfx("tap"); }} aria-label="Tap to pump up the crowd">📣 TAP! {taps}</button> : <><div className="fx-mg-say">The crowd energy: <b>{Math.round(boost * 100)}%</b> of a normal rally.</div><Button variant="primary" onClick={() => { sfx(boost > 1 ? "fanfare" : "good"); onDone(boost); }}>Count the votes</Button></>}
    </Overlay>
  );
}

// ---------------------------------------------------------------- timed debate
import { DEBATE_ANSWERS, DEBATE_QUESTIONS } from "../engine/rival";
function DebateStep({ q, n, total, onPick, onClose }: { q: (typeof DEBATE_QUESTIONS)[number]; n: number; total: number; onPick: (aid: string | null, sec: number) => void; onClose: () => void }) {
  const [t0] = useState(() => Date.now());
  const [gone, setGone] = useState(false);
  const choose = (aid: string | null) => { if (gone) return; setGone(true); onPick(aid, (Date.now() - t0) / 1000); };
  const left = useCountdown(9, !gone, () => choose(null));
  return (
    <Overlay title={`Presidential debate (${n}/${total})`} sub="Answer fast. Quick, confident answers score extra; freezing costs you." onClose={onClose}>
      <Timer left={left} total={9} />
      <div className="fx-mg-say">🎤 {q.q}</div>
      <div className="g-col" style={{ gap: 8 }}>{DEBATE_ANSWERS.map((a) => <button key={a.id} className="fx-mg-item" onClick={() => choose(a.id)}><b>{a.label}</b><span>{a.blurb}</span></button>)}</div>
    </Overlay>
  );
}
export function TimedDebate({ answered, onAnswer, onClose }: { answered: Set<string>; onAnswer: (qid: string, aid: string, bonus: number) => void; onClose: () => void }) {
  const [todo] = useState(() => DEBATE_QUESTIONS.filter((q) => !answered.has(q.id)));
  const [i, setI] = useState(0);
  const q = todo[i];
  if (!q) return <Overlay title="Debate over" sub="Millions watched. The polls will tell you who won."><Button variant="primary" onClick={onClose}>Back to the campaign</Button></Overlay>;
  return <DebateStep key={q.id} q={q} n={i + 1} total={todo.length} onClose={onClose} onPick={(aid, sec) => { const bonus = aid === null ? -0.8 : sec < 4 ? 0.5 : sec < 7 ? 0.1 : -0.2; sfx("tap"); onAnswer(q.id, aid ?? "attack", bonus); setI(i + 1); }} />;
}
