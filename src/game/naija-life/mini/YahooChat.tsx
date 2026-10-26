"use client";

import { useMemo, useState } from "react";
import { T } from "../util";
import { pickOne, shuffle } from "./hooks";

type Kind = "smooth" | "pushy" | "odd";
const ROUNDS: { them: [string, string]; replies: { k: Kind; t: [string, string] }[] }[] = [
  { them: ["Hello, who is this? I don't remember you.", "Hello, who be this? I no remember you."], replies: [
    { k: "smooth", t: ["Sorry to bother you, we met in the group chat last week. How have you been?", "Sorry to disturb, we meet for the group chat last week. How you dey?"] },
    { k: "pushy", t: ["Never mind that. I need a favour urgently.", "Forget that one. I need favour urgently."] },
    { k: "odd", t: ["Wrong number, bye.", "Wrong number, bye."] }] },
  { them: ["My day was long. Work is stressful.", "My day long. Work stress me."], replies: [
    { k: "smooth", t: ["That sounds tough. Rest well, you deserve it.", "E hard o. Rest well, you deserve am."] },
    { k: "pushy", t: ["Okay. So about that money...", "Okay. So about that money..."] },
    { k: "odd", t: ["lol", "lol"] }] },
  { them: ["Why do you never want to video call?", "Why you no dey want video call?"], replies: [
    { k: "smooth", t: ["My camera is broken, I'm fixing it this week. I'd love to see you.", "My camera spoil, I go fix am this week. I wan see you."] },
    { k: "pushy", t: ["Stop asking questions.", "Stop to dey ask question."] },
    { k: "odd", t: ["What is a video call?", "Wetin be video call?"] }] },
  { them: ["I'm not sure I can trust you.", "I no sure say I fit trust you."], replies: [
    { k: "smooth", t: ["I understand. Take your time, I'm not going anywhere.", "I understand. Take your time, I no dey go anywhere."] },
    { k: "pushy", t: ["You have to decide today or never.", "You must decide today or never."] },
    { k: "odd", t: ["Trust is overrated.", "Trust no be anything."] }] },
];

/** Two quick rounds of picking the smoothest reply. */
export function YahooChat({ onFinish }: { onFinish: (s: number) => void }) {
  const rounds = useMemo(() => shuffle(ROUNDS).slice(0, 2).map((r) => ({ ...r, replies: shuffle(r.replies) })), []);
  const [i, setI] = useState(0);
  const [pts, setPts] = useState(0);
  const [picked, setPicked] = useState<Kind | null>(null);
  const r = rounds[i];
  const choose = (k: Kind) => {
    if (picked) return;
    setPicked(k);
    const gain = k === "smooth" ? 1 : k === "pushy" ? 0.25 : 0;
    setTimeout(() => { const t = pts + gain; if (i + 1 >= rounds.length) onFinish(t / rounds.length); else { setPts(t); setI(i + 1); setPicked(null); } }, 900);
  };
  return (
    <div className="rounded-2xl bg-[#e5ddd5] p-3">
      <div className="mb-2 max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[14px] text-slate-800 shadow-sm">{T(r.them[0], r.them[1])}</div>
      {picked && <div className="mb-2 ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-[14px] text-slate-800 shadow-sm">{T(r.replies.find((x) => x.k === picked)!.t[0], r.replies.find((x) => x.k === picked)!.t[1])}</div>}
      {picked && <div className="mb-2 text-center text-[12px] font-bold text-slate-600">{picked === "smooth" ? pickOne([T("They are warming up 😊", "Dem dey warm up 😊"), T("Typing...", "Typing...")]) : picked === "pushy" ? T("They hesitate... 🤨", "Dem dey hesitate... 🤨") : T("Seen. No reply. 😶", "Seen. No reply. 😶")}</div>}
      {!picked && <div className="space-y-2">{r.replies.map((x) => <button key={x.k} type="button" onClick={() => choose(x.k)} className="block w-full rounded-2xl bg-white/90 px-3 py-2.5 text-left text-[13.5px] font-semibold text-slate-700 shadow-sm active:scale-[0.98]">{T(x.t[0], x.t[1])}</button>)}</div>}
    </div>
  );
}
