"use client";
/** The new start: four short steps, one decision each. */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { Button, Portrait, PORTRAIT_NAMES, PORTRAIT_OPTIONS } from "../../game/ui/kit";
import { useFix } from "./store";
import { ARCH_NEED, DIFFICULTY, PRESIDENTS, START_NEED, STARTS } from "../engine/setup";
import { PROMISE_BY_ID, PLEDGE_DEADLINE, PLEDGE_META } from "../engine/promises";
import { calYear, monthLabel } from "../engine/util";
import type { Difficulty, Portrait as PortraitT } from "../engine/types";
import { PledgePicker } from "./Platform";
import { PerksCard } from "./Meta";
import { sfx } from "./sound";

const DIFFS: Difficulty[] = ["easy", "normal", "hard"];
const DIFF_NAME: Record<Difficulty, string> = { easy: "Kind", normal: "Fair", hard: "Brutal" };
const ATTR: { k: keyof PortraitT; label: string }[] = [{ k: "skin", label: "Skin" }, { k: "style", label: "Hairstyle" }, { k: "hair", label: "Hair colour" }, { k: "wear", label: "Headwear" }, { k: "outfit", label: "Outfit" }, { k: "accent", label: "Colour" }, { k: "glasses", label: "Glasses" }, { k: "beard", label: "Beard" }];
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
  const [sandbox, setSandbox] = useState(false);
  const [perks, setPerks] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => { Promise.all([saves.endings(), saves.hall(), saves.legacy()]).then(([e, h, m]) => setProgress(m.unlockAll ? 99 : Math.max(e.length, h.length))).catch(() => undefined); }, [saves]);
  const opts = PORTRAIT_OPTIONS as unknown as Record<string, number>;
  const turn = (k: keyof PortraitT, d: number) => { sfx("tap"); setPortrait((p) => ({ ...p, [k]: ((p[k] ?? 0) + d + opts[k]) % opts[k] })); };
  const shuffle = () => { sfx("tap"); const r = (n: number) => Math.floor(Math.random() * n); const fem = Math.random() < 0.5; setPortrait({ skin: 1 + r(opts.skin - 1), hair: r(opts.hair), style: fem ? [2, 4, 6][r(3)] : [0, 1, 3, 5, 7][r(5)], accent: r(opts.accent), wear: fem ? [0, 0, 2, 3][r(4)] : [0, 0, 1, 4][r(4)], glasses: r(3) === 0 ? 1 + r(2) : 0, beard: fem ? 0 : r(3), outfit: r(4) }); };
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
            <div className="fx-you-pic"><Portrait p={portrait} size={170} name={name || "the President"} /><button className="fx-link fx-link-light" onClick={shuffle}><Shuffle size={15} /> Surprise me</button></div>
            <div className="fx-you-form">
              <label htmlFor="pres-name" className="fx-wiz-label">Your name</label>
              <input id="pres-name" className="fx-input" placeholder="e.g. Adaora Bello" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
              <div className="fx-wiz-label" style={{ marginTop: 10 }}>Your look</div>
              <div className="fx-looks">{ATTR.map((a) => <div key={a.k} className="fx-look"><button aria-label={`Previous ${a.label}`} onClick={() => turn(a.k, -1)}><ChevronLeft size={18} /></button><span><b>{a.label}</b><i>{(PORTRAIT_NAMES as unknown as Record<string, readonly string[]>)[a.k]?.[(portrait[a.k] ?? 0) % opts[a.k]] ?? ""}</i></span><button aria-label={`Next ${a.label}`} onClick={() => turn(a.k, 1)}><ChevronRight size={18} /></button></div>)}</div>
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
            <div className="fx-inaug">
              <div className="fx-inaug-flag" aria-hidden><i /><i /><i /></div>
              <div className="fx-inaug-place">INAUGURATION DAY · EAGLE SQUARE, ABUJA · 29 MAY {calYear(0)}</div>
              <div className="fx-oath-card">
                <div className="fx-oath-pic"><Portrait p={portrait} size={92} name={name || "You"} /></div>
                <div><b className="fx-oath-name">{name.trim() || "Madam/Mr President"}</b><div className="g-small" style={{ color: "#cfe0ee" }}>{bg.icon} {bg.name}{start !== "normal" ? ` · ${STARTS.find((x) => x.id === start)?.name}` : ""}</div></div>
              </div>
              <blockquote className="fx-oath-text">
                &ldquo;I, <b>{name.trim() || "the President-elect"}</b>, do solemnly swear that I will be faithful and bear true allegiance to the Federal Republic of Nigeria; that I will discharge my duties to the best of my ability, faithfully and in accordance with the Constitution, in the interest of the sovereignty, integrity, solidarity, well-being and prosperity of the Federal Republic of Nigeria. So help me God.&rdquo;
              </blockquote>
              <div className="fx-wiz-label" style={{ marginTop: 4 }}>Your mandate</div>
              <div className="fx-oath-p">{picked.map((id) => <span key={id}>{PLEDGE_META[id]?.icon} {PROMISE_BY_ID[id]?.short}</span>)}</div>
              <div className="g-tiny" style={{ color: "#9db3c9", marginTop: 6 }}>Two hundred thousand people fill the square. The Chief Justice holds the Bible and the Qur&apos;an. The whole country is watching.</div>
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
                  <button className="fx-opt" aria-pressed={!quick && !legacy && !sandbox} onClick={() => { setQuick(false); setLegacy(false); setSandbox(false); }}><b>Full campaign</b><i>Two terms, every system</i></button>
                  <button className="fx-opt" aria-pressed={quick} onClick={() => { setQuick(true); setLegacy(false); setSandbox(false); }}><b>Quick term</b><i>One term, about 20 minutes</i></button>
                  <button className="fx-opt" aria-pressed={legacy && !sandbox} onClick={() => { setLegacy(true); setQuick(false); setSandbox(false); }}><b>Legacy mode</b><i>No term limits. Keep building.</i></button>
                  <button className="fx-opt" aria-pressed={sandbox} onClick={() => { setSandbox(true); setLegacy(true); setQuick(false); }}><b>Sandbox</b><i>Deep pockets, everything open, cheat tools. Not ranked.</i></button>
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
            : <button className="fx-big-btn" onClick={() => { sfx("fanfare"); startNew(undefined, picked, { difficulty, portrait, president: name.trim() || "Madam/Mr President", archetype, start, quick, legacy, perks, sandbox }); }}>Take the oath</button>}
        </div>
      </div>
    </div>
  );
}
