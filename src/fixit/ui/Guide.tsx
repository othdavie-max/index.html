"use client";
/** The in-game guide: a hub of topics, a spotlight tour of the real screen, and an "explain as I tap" mode. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "../../game/ui/kit";
import { useFix } from "./store";
import { sfx } from "./sound";
import { FALLBACK, RULES, TOPICS, TOUR, type Step } from "./guideData";
import { HowToFull } from "./Menu";

type Cmd = "hub" | "tour" | "explain";
const EV = "fix:guide";
export const openGuide = (cmd: Cmd = "hub") => { try { window.dispatchEvent(new CustomEvent(EV, { detail: cmd })); } catch { /* ignore */ } };
const SEEN = "fix:tourSeen";
const seen = () => { try { return localStorage.getItem(SEEN) === "1"; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN, "1"); } catch { /* ignore */ } };
export const tourSeen = seen;

/** the guide hub: pick a topic, start the tour, or turn on explain mode */
export function GuideHub({ onClose }: { onClose: () => void }) {
  const { state } = useFix();
  const [open, setOpen] = useState<string | null>("goal");
  const [full, setFull] = useState(false);
  const go = (c: Cmd) => { onClose(); setTimeout(() => openGuide(c), 60); };
  return (
    <Modal title="Guide: how to play" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <div className="g-col" style={{ gap: 10 }}>
        <div className="gx-cta">
          <button className="gx-cta-btn" disabled={!state} onClick={() => go("tour")}><b>▶️ Take the tour</b><span>{state ? "1 minute. We point at every button." : "Start a game first, then tap ? for the tour."}</span></button>
          <button className="gx-cta-btn" disabled={!state} onClick={() => go("explain")}><b>👆 Explain as I tap</b><span>{state ? "Tap anything to learn what it does. Nothing gets pressed." : "Available once a game is running."}</span></button>
        </div>
        <div className="g-tiny g-muted">Or read a topic:</div>
        {TOPICS.map((t) => (
          <div key={t.id} className="gx-topic" data-open={open === t.id ? "1" : undefined}>
            <button className="gx-topic-h" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}><span aria-hidden>{t.icon}</span><b>{t.title}</b><i aria-hidden>{open === t.id ? "▲" : "▼"}</i></button>
            {open === t.id && <ul className="gx-lines">{t.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
          </div>
        ))}
        <div className="gx-topic" data-open={full ? "1" : undefined}>
          <button className="gx-topic-h" aria-expanded={full} onClick={() => setFull(!full)}><span aria-hidden>📚</span><b>Every feature, in detail</b><i aria-hidden>{full ? "▲" : "▼"}</i></button>
          {full && <HowToFull />}
        </div>
      </div>
    </Modal>
  );
}

interface Rect { x: number; y: number; w: number; h: number }
const rectOf = (el: Element | null): Rect | null => { if (!el) return null; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; return { x: r.left, y: r.top, w: r.width, h: r.height }; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const closeDrawer = () => { (document.querySelector(".fx-drawer-head button[aria-label='Close']") as HTMLElement | null)?.click(); };

/** spotlight tour over the real screen */
function Tour({ onEnd }: { onEnd: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step: Step = TOUR[i];
  const token = useRef(0);
  const place = useCallback(async (n: number) => {
    const my = ++token.current; const st = TOUR[n];
    closeDrawer();
    if (st.open) {
      await sleep(120);
      (document.querySelector(`.fx-tool[data-g=${st.open}]`) as HTMLElement | null)?.click();
      await sleep(380);
    } else await sleep(60);
    if (my !== token.current) return;
    const el = st.sel ? document.querySelector(st.sel) : null;
    if (el && st.sel !== ".fx-stage") el.scrollIntoView({ block: "nearest", inline: "nearest" });
    setRect(rectOf(el));
  }, []);
  useEffect(() => { void place(i); }, [i, place]);
  useEffect(() => { const h = () => void place(i); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [i, place]);
  const finish = useCallback(() => { markSeen(); closeDrawer(); onEnd(); }, [onEnd]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [finish]);
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const low = rect ? rect.y + rect.h / 2 > vh * 0.5 : false; // target in the lower half: put the card at the top
  const pad = 6;
  return (
    <div className="gx-tour" role="dialog" aria-label="Guided tour">
      <div className="gx-block" />
      {rect && <div className="gx-spot" style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }} />}
      {!rect && <div className="gx-dim" />}
      <div className="gx-card" data-pos={rect ? (low ? "top" : "bottom") : "mid"}>
        <div className="gx-step">{i + 1} / {TOUR.length}</div>
        <b>{step.title}</b>
        <p>{step.text}</p>
        <div className="gx-actions">
          <button className="gx-skip" onClick={finish}>Skip</button>
          <span className="g-grow" />
          {i > 0 && <Button size="sm" onClick={() => { sfx("tap"); setI(i - 1); }}>Back</Button>}
          <Button size="sm" variant="primary" onClick={() => { sfx("tap"); if (i === TOUR.length - 1) finish(); else setI(i + 1); }}>{i === TOUR.length - 1 ? "Done" : "Next"}</Button>
        </div>
      </div>
    </div>
  );
}

const labelOf = (el: Element) => {
  const a = el.getAttribute("aria-label") ?? ""; const t = el.getAttribute("title") ?? ""; const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return [a, txt, t].filter(Boolean).join(" | ");
};
const ruleFor = (label: string) => {
  const parts = label.split(" | ");
  for (const p of parts) { const r = RULES.find((x) => x.re.test(p)); if (r) return r; }
  return null;
};

/** tap anything to learn what it does; nothing is pressed */
function Explain({ onEnd }: { onEnd: () => void }) {
  const [card, setCard] = useState<{ title: string; body: string; el: HTMLElement | null; top?: boolean } | null>(null);
  useEffect(() => {
    const h = (e: Event) => {
      const t = e.target as HTMLElement | null; if (!t) return;
      if (t.closest(".gx-ui")) return;
      const el = t.closest("[data-help],button,a,[role=button],select,input,label,.fx-res") as HTMLElement | null;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (!el) {
        if (t.closest(".fx-stage, svg")) setCard({ title: "The map", body: "Each state wears a face: happy or angry. Tap a state (outside Explain mode) to see its problems and act there.", el: null });
        return;
      }
      sfx("tap");
      const custom = el.getAttribute("data-help");
      const lab = labelOf(el);
      const r = custom ? { title: lab.split(" | ")[0] || "This", body: custom } : ruleFor(lab);
      const rc = el.getBoundingClientRect(); setCard({ title: r?.title ?? (lab.split(" | ").find((x) => x.length < 40) || "This button"), body: r?.body ?? FALLBACK, el, top: rc.top + rc.height / 2 > window.innerHeight * 0.55 });
    };
    const opts = { capture: true } as const;
    document.addEventListener("click", h, opts);
    return () => document.removeEventListener("click", h, opts);
  }, []);
  return (
    <>
      <div className="gx-ui gx-explain-bar" role="status"><span>👆 Explain mode: tap anything to learn what it does</span><button onClick={onEnd}>Exit</button></div>
      {card && (
        <div className="gx-ui gx-explain-card" data-top={card.top ? "1" : undefined} role="dialog" aria-label={card.title}>
          <b>{card.title}</b>
          <p>{card.body}</p>
          <div className="gx-actions">
            <Button size="sm" onClick={() => setCard(null)}>Got it</Button>
            {card.el && <Button size="sm" variant="primary" onClick={() => { const el = card.el; onEnd(); setTimeout(() => el?.click(), 80); }}>Do it now</Button>}
          </div>
        </div>
      )}
    </>
  );
}

/** mounted once: listens for guide commands, offers the tour to new players */
export function GuideLayer() {
  const { screen, state, tab } = useFix();
  const [rawMode, setMode] = useState<Cmd | null>(null);
  const [rawOffer, setOffer] = useState(false);
  const mode = screen === "play" ? rawMode : null; const offer = screen === "play" && rawOffer;
  useEffect(() => { const h = (e: Event) => setMode(((e as CustomEvent).detail as Cmd) ?? "hub"); window.addEventListener(EV, h); return () => window.removeEventListener(EV, h); }, []);
  const ready = screen === "play" && !!state && state.staff.picked && tab === "world" && !seen();
  // offer the tour only when nothing else (the yearly agenda, a decision) is covering the map
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => { if (!document.querySelector(".gm-modal, .fx-drawer-wrap, .fx-oath, .gx-tour")) setOffer(true); }, 1500);
    return () => clearInterval(id);
  }, [ready]);
  const end = () => setMode(null);
  return (
    <>
      {mode === "hub" && <GuideHub onClose={end} />}
      {mode === "tour" && <Tour onEnd={end} />}
      {mode === "explain" && <Explain onEnd={end} />}
      {offer && !mode && !seen() && (
        <div className="gx-ui gx-offer" role="dialog" aria-label="Take the tour">
          <b>New here?</b>
          <p>Take a 1-minute tour. We will point at every button and say what it does.</p>
          <div className="gx-actions">
            <button className="gx-skip" onClick={() => { markSeen(); setOffer(false); }}>No thanks</button>
            <span className="g-grow" />
            <Button size="sm" variant="primary" onClick={() => { setOffer(false); setMode("tour"); }}>Start the tour</Button>
          </div>
        </div>
      )}
    </>
  );
}
