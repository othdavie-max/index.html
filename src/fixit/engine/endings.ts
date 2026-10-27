/**
 * Endings. How your presidency ends is not just win or lose: it depends on how you ruled (honestly or with an iron
 * fist), how it ended (voted out, coup, uprising, impeachment, term limits) and what you did on the way (stealing,
 * rigging, jailing). All fictional.
 */
import type { FixState } from "./types";
import { nb, snap } from "./util";
import { dictator, authoritarian } from "./power";

export interface Ending { id: string; name: string; icon: string; tone: "good" | "bad" | "mixed"; epilogue: string }

export const ENDINGS: { id: string; name: string; icon: string; blurb: string }[] = [
  { id: "father", name: "Father/Mother of the Nation", icon: "🕊️", blurb: "Honest, free and loved." },
  { id: "builder", name: "Iron-Fist Builder", icon: "🏗️", blurb: "Harsh rule, but the country got richer." },
  { id: "forlife", name: "President for Life", icon: "👑", blurb: "You never let go." },
  { id: "kleptocrat", name: "Kleptocrat in Exile", icon: "✈️", blurb: "You looted and ran." },
  { id: "coup", name: "Overthrown in a Coup", icon: "🪖", blurb: "The generals decided." },
  { id: "uprising", name: "Toppled by the People", icon: "✊", blurb: "A nation said enough." },
  { id: "trial", name: "On Trial", icon: "⚖️", blurb: "Your successors came for you." },
  { id: "impeached", name: "Impeached", icon: "🏛️", blurb: "The Assembly removed you." },
  { id: "statesman", name: "Respected Statesman", icon: "🎖️", blurb: "You left office with your head high." },
  { id: "votedout", name: "Voted Out", icon: "🗳️", blurb: "The voters said no." },
  { id: "retired", name: "Quietly Retired", icon: "🏡", blurb: "A forgettable end to a forgettable term." },
];

export const isDirty = (s: FixState) => s.me.evidence >= 35 || s.rule.executions > 0 || s.rule.wrongful >= 2 || s.rule.stolenElection || s.me.acts.filter((a) => a === "kickback").length >= 2;

export function computeEnding(s: FixState): Ending {
  const last = s.terms[s.terms.length - 1];
  const P = s.rule;
  const end = last?.end ?? snap(s);
  const flee = s.flags.exit === "flee";
  const wealth = s.me.wealth;
  const hap = end.happiness;
  const terms = s.terms.length;
  const done = s.projects.filter((p) => p.status === "done").length;
  const stayed = last && (last.result === "won" || last.result === "completed");
  const cause = s.ended?.cause;
  const dirty = s.me.evidence >= 35 || P.executions > 0 || P.wrongful >= 2 || P.stolenElection || s.me.acts.filter((a) => a === "kickback").length >= 2;
  const money = `₦${Math.round(wealth).toLocaleString()}m`;
  const out = (id: string, tone: Ending["tone"], epilogue: string): Ending => { const d = ENDINGS.find((x) => x.id === id)!; return { id, name: d.name, icon: d.icon, tone, epilogue }; };

  if (cause === "coup" || cause === "uprising") {
    if (flee && wealth >= 300) return out("kleptocrat", "bad", `You boarded a jet in the dark with ${money} in accounts abroad. A villa on the Mediterranean, an Interpol notice at home, and a nation that will remember who left it poorer.`);
    if (cause === "coup") return out("coup", "bad", `Soldiers announced the end of your government on state television. ${P.executions ? "The new junta cites the executions you ordered" : "The new junta promises elections 'soon'"}. ${dirty ? "Investigators are already opening your files." : "You were allowed to leave quietly."}`);
    return out("uprising", "bad", `After months of protests the army refused to fire on the crowds. You left the villa by a back gate. ${dirty ? "Prosecutors are preparing charges." : "History may judge you more kindly than the crowds did."}`);
  }
  if (last && (last.result === "lost" || last.result === "removed")) {
    if (flee && wealth >= 300) return out("kleptocrat", "bad", `As the count came in, your plane was already fuelled. ${money} sits in accounts abroad. Home is a memory and an arrest warrant.`);
    if (dirty) return out("trial", "bad", `Your successors opened the files: ${P.executions ? `${P.executions} executions, ` : ""}${P.wrongful ? `${P.wrongful} wrongful convictions, ` : ""}${P.stolenElection ? "a stolen election, " : ""}${s.me.evidence >= 35 ? "a paper trail of corruption" : "abuses of power"}. You are in the dock, and the laws you passed may be used against you.`);
    if (last.result === "removed") return out("impeached", "bad", "Parliament voted to remove you. You left office as the opposition celebrated, and the country wondered how it came to this.");
    return out("votedout", hap >= 50 ? "mixed" : "bad", `Voters chose someone else. ${hap >= 50 ? "You handed over power peacefully, and that counts for something." : "The transition was bitter."}`);
  }
  if (stayed) {
    if (s.term >= 3 && authoritarian(s)) return out("forlife", "mixed", `Term limits fell, elections became ceremonies and the opposition learned silence. After ${terms} terms you are still President. ${hap >= 50 ? "The economy grew and many do not mind." : "The mood is quiet and watchful."}`);
    if (dictator(s) && P.termExtra === 0 && s.term >= 2 && P.maxTerms > 2) return out("forlife", "mixed", `You rewrote the rules and kept the villa. Nigeria is ruled by one person, you, and the rest of the country waits to see how long that lasts.`);
    if (authoritarian(s) && (hap >= 50 || end.realIncome >= 95) && done >= 4) return out("builder", "mixed", `Roads, power plants and refineries rose under your iron grip, and the press that might have asked about the bill was silent. ${P.executions ? "The executions are still debated." : ""} Admirers call you a builder; critics say you bought progress with freedom.`);
    if (P.democracy >= 62 && hap >= 52 && s.me.evidence < 15 && P.wrongful === 0 && P.executions === 0 && wealth < 800) return out("father", "good", `You left office loved and un-stolen-from. Elections were free, courts mostly independent, and a generation of Nigerians learned that a president can serve without stealing.`);
    if (P.democracy >= 55) return out("statesman", "good", `You ran the country within the law and handed over power to a successor. The record is mixed, the dignity is not.`);
    if (dirty || wealth >= 800) return out("trial", "bad", "You survived the term, but the files on your dealings are growing and your successor owes you nothing.");
    return out("retired", "mixed", "You served and left. Nigerians will remember you for a few things and forget the rest.");
  }
  return out("retired", "mixed", `Your presidency ended with ${nb(s.fin.treasury)} in the treasury and a country still arguing about you.`);
}
