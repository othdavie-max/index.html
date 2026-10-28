"use client";
/** The new start: four short steps, one decision each. */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { Button, Portrait, PORTRAIT_OPTIONS } from "../../game/ui/kit";
import { useFix } from "./store";
import { ARCH_NEED, DIFFICULTY, PRESIDENTS, START_NEED, STARTS } from "../engine/setup";
import { PROMISE_BY_ID, PLEDGE_DEADLINE, PLEDGE_META } from "../engine/promises";
import { monthLabel } from "../engine/util";
import type { Difficulty, Portrait as PortraitT } from "../engine/types";
import { PledgePicker } from "./Platform";
import { PerksCard } from "./Meta";
import { sfx } from "./sound";

const DIFFS: Difficulty[] = ["easy", "normal", "hard"];
const DIFF_NAME: Record<Difficulty, string> = { easy: "Kind", normal: "Fair", hard: "Brutal" };
const ATTR: { k: keyof PortraitT; label: string }[] = [{ k: "skin", label: "Skin" }, { k: "hair", label: "Hair" }, { k: "style", label: "Style" }, { k: "accent", label: "Outfit" }];
const BG_STORY: Record<string, string> = {
  career: "Thirty years in the system. You know every door and every dossier.", general: "You have given orders all your life. The barracks still answers your calls.",
  tech: "You built something from nothing. The old guard thinks you are a child.", market: "You grew up behind a stall. You know what a naira really buys.", cleric: "You lead a congregation of thousands. People trust you before they hear you.",
};

export function Setup({ onBack }: { onBack: () => void }) {
  const { startNew, saves, lang, setLang } = useFix();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [portrait, setPortrait] = useState<PortraitT>({ skin: 3, hair: 0, style: 0, accent: 0 });
  const [archetype, setArchetype] = useState("career");
  const [picked, setPicked] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [start, setStart] = useState("normal");
  const [quick, setQuick] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [perks, setPerks] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => { Promise.all([saves.endings(), saves.hall(), saves.legacy()]).then(([e, h, m]) => setProgress(m.unlockAll ? 99 : Math.max(e.length, h.length))).catch(() => undefined); }, [saves]);
  const opts = PORTRAIT_OPTIONS as unknown as Record<string, number>;
  const turn = (k: keyof PortraitT, d: number) => { sfx("tap"); setPortrait((p) => ({ ...p, [k]: (p[k] + d + opts[k]) % opts[k] })); };
  const shuffle = () => { sfx("tap"); setPortrait({ skin: 1 + Math.floor(Math.random() * Math.max(1, opts.skin - 1)), hair: Math.floor(Math.random() * opts.hair), style: Math.floor(Math.random() * opts.style), accent: Math.floor(Math.random() * opts.accent) }); };
  const bg = PRESIDENTS.find((p) => p.id === archetype)!;
  const titles = ["Who are you?", "Where do you come from?", "What will you promise?", "Take the oath"];
  const by = monthLabel(PLEDGE_DEADLINE);
  const go = (n: number) => { sfx("tap"); setStep(n); };
  return (
    <div className="fx-hero fx-wiz-screen">
      <div className="fx-wiz">
        <div className="fx-wiz-dots" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4} aria-label={`Step ${step + 1} of 4`}>{[0, 1, 2, 3].map((i) => <span key={i} data-on={i <= step ? "1" : undefined} />)}</div>
        <h1 className="fx-wiz-h">{titles[step]}</h1>

        {step === 0 && (
          <div className="fx-wiz-body fx-you">
            <div className="fx-you-pic"><Portrait p={portrait} size={170} name={name || "the President"} /><button className="fx-link" onClick={shuffle}><Shuffle size={15} /> Surprise me</button></div>
            <div className="fx-you-form">
              <label htmlFor="pres-name" className="fx-wiz-label">Your name</label>
              <input id="pres-name" className="fx-input" placeholder="e.g. Adaora Bello" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
              <div className="fx-wiz-label" style={{ marginTop: 10 }}>Your look</div>
              <div className="fx-looks">{ATTR.map((a) => <div key={a.k} className="fx-look"><button aria-label={`Previous ${a.label}`} onClick={() => turn(a.k, -1)}><ChevronLeft size={18} /></button><span>{a.label}</span><button aria-label={`Next ${a.label}`} onClick={() => turn(a.k, 1)}><ChevronRight size={18} /></button></div>)}</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fx-wiz-body">
            <div className="fx-bgs" role="group" aria-label="Your background">
              {PRESIDENTS.map((p) => { const need = ARCH_NEED[p.id] ?? 0, lock = progress < need; return (
                <button key={p.id} className="fx-bg" aria-pressed={archetype === p.id} disabled={lock} onClick={() => { sfx("tap"); setArchetype(p.id); }}>
                  <span className="fx-bg-ic" aria-hidden>{lock ? "🔒" : p.icon}</span>
                  <b>{p.name}</b>
                  {lock ? <i className="fx-bg-lock">Finish {need - progress} more {need - progress === 1 ? "game" : "games"} to unlock</i> : <>
                    <i className="fx-bg-story">{BG_STORY[p.id]}</i>
                    <span className="fx-bg-pro">＋ {p.perk}</span><span className="fx-bg-con">－ {p.weak}</span></>}
                </button>
              ); })}
            </div>
            {progress < 3 && <button className="fx-link" onClick={() => { setProgress(99); void saves.legacy().then((m) => saves.saveLegacy({ ...m, unlockAll: true })).catch(() => undefined); }}>Know the game already? Unlock every background.</button>}
          </div>
        )}

        {step === 2 && (
          <div className="fx-wiz-body">
            <p className="fx-wiz-sub">Pick three. Every promise has a number and a deadline ({by}). Voters, rivals and Naija X will remember.</p>
            <PledgePicker value={picked} onChange={setPicked} />
          </div>
        )}

        {step === 3 && (
          <div className="fx-wiz-body fx-oath">
            <div className="fx-oath-card">
              <Portrait p={portrait} size={84} name={name || "You"} />
              <div><b style={{ fontSize: 22 }}>{name.trim() || "Madam/Mr President"}</b><div className="g-small" style={{ color: "#cfe0ee" }}>{bg.icon} {bg.name}{start !== "normal" ? ` · ${STARTS.find((x) => x.id === start)?.name}` : ""}</div>
                <div className="fx-oath-p">{picked.map((id) => <span key={id}>{PLEDGE_META[id]?.icon} {PROMISE_BY_ID[id]?.short}</span>)}</div></div>
            </div>
            <div className="fx-diff">
              <div className="fx-wiz-label">How hard should Nigeria be?</div>
              <input type="range" min={0} max={2} step={1} value={DIFFS.indexOf(difficulty)} onChange={(e) => setDifficulty(DIFFS[Number(e.target.value)])} aria-label="Difficulty" list="diffs" />
              <div className="fx-diff-ticks">{DIFFS.map((d) => <span key={d} data-on={difficulty === d ? "1" : undefined}>{DIFF_NAME[d]}</span>)}</div>
              <div className="g-small" style={{ color: "#cfe0ee" }}>{DIFFICULTY[difficulty].blurb}</div>
            </div>
            <button className="fx-link" onClick={() => setMore(!more)} aria-expanded={more}>{more ? "▲ Fewer options" : "▼ More options"}</button>
            {more && (
              <div className="fx-more-opts">
                <div className="fx-wiz-label">Game length</div>
                <div className="fx-chips">
                  <button className="fx-opt" aria-pressed={!quick && !legacy} onClick={() => { setQuick(false); setLegacy(false); }}><b>Full campaign</b><i>Two terms, every system</i></button>
                  <button className="fx-opt" aria-pressed={quick} onClick={() => { setQuick(true); setLegacy(false); }}><b>Quick term</b><i>One term, about 20 minutes</i></button>
                  <button className="fx-opt" aria-pressed={legacy} onClick={() => { setLegacy(true); setQuick(false); }}><b>Legacy mode</b><i>No term limits. Keep building.</i></button>
                </div>
                <div className="fx-wiz-label">How you take over</div>
                <div className="fx-chips">{STARTS.map((x) => { const need = START_NEED[x.id] ?? 0, lock = progress < need; return <button key={x.id} className="fx-opt" aria-pressed={start === x.id} disabled={lock} onClick={() => setStart(x.id)}><b>{lock ? "🔒" : x.icon} {x.name}</b><i>{lock ? `Finish ${need - progress} more` : x.blurb}</i></button>; })}</div>
                <div className="fx-wiz-label">Street voices in</div>
                <div className="fx-chips"><button className="fx-opt" aria-pressed={lang === "en"} onClick={() => setLang("en")}><b>English</b></button><button className="fx-opt" aria-pressed={lang === "pcm"} onClick={() => setLang("pcm")}><b>Naija Pidgin</b></button></div>
                <div className="fx-wiz-label">Legacy perks from past games</div>
                <PerksCard onChange={setPerks} />
              </div>
            )}
          </div>
        )}

        <div className="fx-wiz-nav">
          <Button variant="light" onClick={() => (step === 0 ? onBack() : go(step - 1))}>Back</Button>
          {step < 3
            ? <button className="fx-big-btn" disabled={step === 2 && picked.length !== 3} onClick={() => go(step + 1)}>{step === 2 ? `Next (${picked.length}/3)` : "Next"}</button>
            : <button className="fx-big-btn" onClick={() => { sfx("fanfare"); startNew(undefined, picked, { difficulty, portrait, president: name.trim() || "Madam/Mr President", archetype, start, quick, legacy, perks }); }}>Take the oath</button>}
        </div>
      </div>
    </div>
  );
}
