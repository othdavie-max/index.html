"use client";
import { useEffect, useState } from "react";
import { useFix } from "./store";
import { Badge, Button, ConfirmDialog, Modal } from "../../game/ui/kit";
import { SLOTS, type Slot } from "../persistence";
import { About } from "./Title";

export function SaveSlots({ mode, onDone }: { mode: "load" | "both"; onDone: () => void }) {
  const { saves, loadSlot, saveSlot, toast } = useFix();
  const [list, setList] = useState<Awaited<ReturnType<typeof saves.list>>>([]);
  const refresh = () => saves.list().then(setList).catch(() => undefined);
  useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (s: Slot) => (s === "auto" ? "Autosave" : `Slot ${s}`);
  return (
    <div className="g-col">
      {SLOTS.map((slot) => {
        const info = list.find((x) => x.slot === slot);
        const sm = info?.summary;
        return (
          <div key={slot} className="g-list-row">
            <div className="g-grow">
              <b>{label(slot)}</b>
              <div className="g-small g-muted">{sm ? `${sm.label} · Term ${sm.term} · approval ${sm.approval}% · saved ${new Date(sm.savedAt).toLocaleString()}` : "Empty"}</div>
            </div>
            {mode === "both" && slot !== "auto" && <Button size="sm" onClick={async () => { if (await saveSlot(slot)) { toast("Saved."); void refresh(); } }}>Save</Button>}
            <Button size="sm" variant={sm ? "primary" : "default"} disabled={!sm} onClick={async () => { if (await loadSlot(slot)) onDone(); }}>Load</Button>
            {sm && slot !== "auto" && <Button size="sm" variant="ghost" onClick={async () => { await saves.remove(slot); void refresh(); }}>Delete</Button>}
          </div>
        );
      })}
    </div>
  );
}

export function HowTo({ onClose }: { onClose: () => void }) {
  const steps = [
    ["Debt, savings and lending", "Economy then Debt shows what Nigeria owes, whether it is falling and how long until you are debt-free (5% of the economy). Repay local and foreign debt there. Once debt is under 10%, Lending opens: a savings fund, and neighbours asking for loans that earn interest and influence, and can default."],
    ["The armed forces", "Power then Military: recruit, buy jets from abroad, build a local arms industry, look after veterans. A stronger army is safer and wins respect, but it costs money every month, raises coup risk if you neglect your generals, and your neighbours arm in response. Border clashes and peacekeeping calls test it."],
    ["New states", "Regions sometimes petition for their own state. Creating one pleases its people and costs about ₦14bn a month in governor and civil service, and invites the next petition."],
    ["Play it out", "Some crises have a 🎮 button: haggle with a union, audit a padded budget, decide who to trust on coup night. At rallies you tap to pump up the crowd, and the presidential debate is timed. Your skill, not a dice roll, decides these."],
    ["Follow five families", "Open Economy then Street to follow Mama Nkechi, a nurse, an okada rider, a farmer and a graduate through the years. Their lives follow your decisions, and once a year one of them writes to you."],
    ["Foreign relations, your party, your family", "Govern then Foreign: the IMF, China, the US and ECOWAS offer help with strings. People then Party: four factions, a primary, and a vice president whose ambition grows. People then Cabinet & backers shows your family and your health, and a secret illness is a real risk."],
    ["Sectors, replays and the daily challenge", "Economy then Sectors lets you switch on programmes for farming, oil and gas, tech and manufacturing. At the start choose who you were (general, tech founder, market leader, pastor or imam) and how you take over (even after a coup). Try the daily challenge, and fill the endings gallery in the Hall of Presidents."],
    ["Everyone is answerable", "Ministers, governors and lawmakers can all be warned, prosecuted, jailed or executed, and then they are gone for good. Jailed ones come out later, bitter, and become enemies. Warn an appointee (\"you are here to work, not to eat\") and he steals less, but only if you punish the ones who steal anyway. Open People then Enemies to see who is gone."],
    ["Staying on has a price", "Scrapping term limits needs most of the Assembly firmly on your side and a lot of lobbying. At the end of your last term you can refuse to leave: ECOWAS suspends Nigeria, the Supreme Court rules against you, governors refuse to recognise you, officers meet in secret and the unions shut the country. Every time you do it, it gets worse."],
    ["Your desk is never empty", "Every month new cards land on your Desk: a governor begging, a minister asking for money, a market woman's letter, a journalist's question. Cards remember you: promise a village a road and it comes back in a year and a half, kept or broken."],
    ["Everything you do has echoes", "Execute, jail, arrest, sack or rig, and named people react over months: senators flee abroad, a home state erupts, a son swears revenge. Open Power then \"What I caused\" to see the trail, and People then Enemies to buy off, befriend or crush the people you wronged."],
    ["Build, maintain, invite", "Refineries only work while they are maintained, and local fuel really lowers the pump price and the queues. When investors trust Nigeria, real offers arrive: a refinery, a solar park, a factory. Accept the terms and watch the project open. Late in the game, unlock national dreams: the World Cup, a coastal railway, 24-hour power, a Nigerian astronaut."],
    ["Success has a price", "People judge you against last year, not day one, so expectations rise every year. Each term brings its own crisis: an oil crash, a plot by your vice president, a succession fight."],
    ["Day One: pick your people", "You start by choosing a Chief of Staff, a Vice President and your ministers. Qualified strangers are skilled, but the people who paid for your campaign want jobs and contracts. Hire your own people and they steal. Freeze your backers out and they sabotage you with protests, bandits and a blocked Assembly."],
    ["Listen to your advisers", "Tap “Ask my advisers” on any law, strongman tool or big move, and on every crisis. A skilled, honest adviser warns you with real numbers. A flatterer says everything is fine. A general wants force. The Advisers button gives a monthly briefing."],
    ["Big moves and records", "Open Big Moves for the beer-parlour promises: fix the naira by decree, sell the jets, cut lawmakers' pay, close the borders. Hit a number Nigeria has not seen in years (petrol under ₦100, inflation in single digits) and you get a record card."],
    ["Tap the map", "Every state wears a face: happy or angry. Tap a state to see what is wrong there and act. Use the lenses on top (Mood, Politics, Food…) to see the country differently. Symbols mark protests, attacks, floods and corruption cases."],
    ["Clear your desk, then NEXT TURN", "Notices stack on the left. Tap one to decide. The big gold button ends the month; if something still needs you it turns red and shows how many."],
    ["Rule the Assembly", "Open Assembly: tap any lawmaker. Investigate, arrest, leak, blackmail, protect or take your cut. Lawmakers steal, and the stronger your anti-corruption law, the less they dare."],
    ["Climb the law ladder", "Open Power. Weak laws, asset recovery, prison, life sentences, then the death penalty. Each rung needs an Assembly vote, or you can decree it at democracy's expense. Harsh laws can punish the innocent and anger the world."],
    ["Democrat or strongman", "Power also holds the strongman toolkit: buy INEC, silence the press, arrest your rival, postpone the election, pay or purge the generals. It can win elections and it can end in a coup, an uprising or a trial. Watch Street anger, Coup risk and World pressure at the top."],
    ["Many endings", "Father or Mother of the Nation, Respected Statesman, Iron-Fist Builder, President for Life, Kleptocrat in Exile, Overthrown, Toppled by the People, On Trial and more. Lose an election you rigged? You can try to annul it, with the army deciding."],
    ["Read the red card", "The Presidency panel shows the country's biggest problem right now, and why."],
    ["Pick an action", "Green chips show what gets better, red what gets worse. Each choice shows its cost and how uncertain it is."],
    ["Watch the yellow “Later” box", "Most decisions plant a consequence that arrives months later: silos run empty, unions copy a pay deal, open contracting starts saving money. “Coming up” on the Presidency screen lists them, and what you do before then decides how they turn out."],
    ["Watch the news", "Prices, the naira, jobs and security all move. Read what changed and what your choice did."],
    ["Pick your team", "Your cabinet's skill makes policies work better; honesty decides how much money leaks. Technocrats are skilled, loyalists keep the party behind you, regional heavyweights bring votes. Reshuffles are free for three months."],
    ["Work with the system", "Big changes such as fuel subsidy reform need the National Assembly: lobby, then call the vote. Keep governors and groups (traders, farmers, youth, workers, business, military, faith leaders) on side, set the yearly budget, and address the nation at key moments."],
    ["Win the election", "Six months before election day the campaign opens: hold rallies by zone, run a door-to-door drive, face your rival in a debate. You need over 50% nationally and 25% in 24 of 37 states. Then watch election night state by state."],
    ["Build for later", "Policies and Projects take months to work. The Map shows where trouble is brewing, and where your projects are."],
  ];
  return (
    <Modal title="How to play (one minute)" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <div className="g-col">
        {steps.map(([t, b], i) => <div key={t} className="fx-step"><i>{i + 1}</i><div><b>{t}</b><div className="g-small g-muted">{b}</div></div></div>)}
        <div className="g-small g-muted">You have four years (48 months) and three promises. Keeping promises and keeping people happy raise your re-election chance (the green circle). At the end, your legacy report shows what you really changed.</div>
      </div>
    </Modal>
  );
}

export function MenuModal({ onClose }: { onClose: () => void }) {
  const { state, quit, startNew, saveSlot, toast, act } = useFix();
  const [sub, setSub] = useState<"slots" | "about" | "how" | "new" | null>(null);
  if (!state) return null;
  return (
    <>
      <Modal title="Menu" onClose={onClose}>
        <div className="g-col">
          <div className="g-small g-muted">President {state.meta.president} · seed <code>{state.meta.seed}</code> (the same seed reproduces the same world and shocks)</div>
          <div className="g-row g-wrap">
            <Button variant="primary" onClick={async () => { if (await saveSlot("auto")) toast("Saved."); }}>Save now</Button>
            <Button onClick={() => setSub("slots")}>Save slots</Button>
            <Button onClick={() => setSub("how")}>How to play</Button>
            <Button onClick={() => setSub("about")}>About &amp; data</Button>
          </div>
          <label className="g-row g-small"><input type="checkbox" checked={state.settings.autosave} onChange={(e) => act((s) => { s.settings.autosave = e.target.checked; return { ok: true, message: "Setting saved." }; }, { silent: true })} /> Autosave after each month</label>
          <label className="g-row g-small"><input type="checkbox" checked={!!state.flags.noSummary} onChange={(e) => act((s) => { s.flags.noSummary = e.target.checked; return { ok: true, message: "" }; }, { silent: true })} /> Skip the end-of-month summary window</label>
          <div className="g-row g-wrap" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
            <Button onClick={quit}>Save &amp; quit to title</Button>
            <Button variant="danger" onClick={() => setSub("new")}>New presidency…</Button>
          </div>
        </div>
      </Modal>
      {sub === "slots" && <Modal title="Save slots" onClose={() => setSub(null)}><SaveSlots mode="both" onDone={() => { setSub(null); onClose(); }} /></Modal>}
      {sub === "how" && <HowTo onClose={() => setSub(null)} />}
      {sub === "about" && <About onClose={() => setSub(null)} />}
      {sub === "new" && <ConfirmDialog title="Start a new presidency?" body={<>The current game is autosaved first. You can <Badge>replay this same world</Badge> from the legacy report after a term.</>} confirmLabel="Start new" tone="danger" onCancel={() => setSub(null)} onConfirm={async () => { await saveSlot("auto"); setSub(null); onClose(); startNew(); }} />}
    </>
  );
}
