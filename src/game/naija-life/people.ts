import { I, bump } from "./helpers";
import { transact } from "./ledger";
import { ALL_TRIBES } from "./data";
import { STAGE_JOBS, occupationFor } from "./occupation";
import { addFriend, jobsForArchetype, makeNpc, npcAge, remember } from "./family";
import { addPartner } from "./relationships";
import type { Npc, NpcRole, Player } from "./types";
import { T, chance, clamp, pick, rand, randInt } from "./util";
import { randomLook } from "./look";
import { STATE_BY_ID } from "./data";

// ---------------------------------------------------------------------------
// Careers that fit the age, and classmates
// ---------------------------------------------------------------------------
const AGED: NpcRole[] = ["sibling", "friend", "classmate", "cousin"];

export function refreshOccupation(p: Player, n: Npc) {
  if (!AGED.includes(n.role)) return;
  if (!n.adultJob) n.adultJob = STAGE_JOBS.test(n.occupation) ? pick(jobsForArchetype(p.fam.archetype)) : n.occupation;
  else if (STAGE_JOBS.test(n.adultJob)) n.adultJob = pick(jobsForArchetype(p.fam.archetype));
  n.occupation = occupationFor(Math.max(0, npcAge(p, n)), n.adultJob, n.id);
}

const CLASS_TRAITS = ["funny", "brainy", "lazy", "class prefect", "sports star", "gist master", "teacher's pet", "shy", "stylish", "generous"];

type Stage = "primary" | "secondary" | "university" | "nysc";
export const currentStage = (p: Player): Stage | null =>
  !p.school ? (p.flags.nyscServing === true ? "nysc" : null) : p.school.stage === "tertiary" ? (p.school.type === "university" ? "university" : null) : p.school.stage;

const schoolLabel = (p: Player, stage: Stage): string =>
  stage === "nysc" ? T("NYSC platoon", "NYSC platoon") : stage === "primary" ? T("Primary school", "Primary school") : stage === "secondary" ? T("Secondary school", "Secondary school") : `${p.campus?.uni ? p.campus.uni.toUpperCase() : T("University", "University")}`;

export function addClassmate(p: Player, stage: Stage): Npc {
  const gender = chance(0.5) ? "male" : "female";
  const spread = stage === "university" || stage === "nysc" ? randInt(-1, 4) : randInt(-1, 1);
  const st = STATE_BY_ID[p.state];
  const n = makeNpc({
    role: "classmate", gender, ageDelta: spread, tribe: chance(0.6) ? p.tribe : pick(ALL_TRIBES), stateId: p.state,
    income: 0, look: randomLook(gender, { region: st.region, religion: p.religion }),
    generosity: randInt(15, 90), strictness: randInt(10, 60), responsibility: randInt(25, 90), closeness: randInt(15, 40),
  });
  n.traits = [pick(CLASS_TRAITS)];
  n.stage = stage;
  n.school = schoolLabel(p, stage);
  n.adultJob = pick(jobsForArchetype(p.fam.archetype));
  refreshOccupation(p, n);
  if (stage === "university") n.occupation = T("Student", "Student");
  if (stage === "nysc") n.occupation = T("Corps member", "Corps member");
  p.npcs[n.id] = n;
  return n;
}

/** Make sure your current school has a class around you. */
export function fillClassmates(p: Player) {
  const stage = currentStage(p);
  for (const n of Object.values(p.npcs)) if (n.role === "classmate" && n.stage && n.stage !== stage && !n.former) n.former = true;
  if (!stage) return;
  const mates = Object.values(p.npcs).filter((n) => n.role === "classmate" && n.stage === stage && !n.former && n.alive);
  const target = stage === "university" ? 8 : 6;
  const add = mates.length === 0 ? target : Math.min(2, target - mates.length);
  for (let i = 0; i < add; i++) addClassmate(p, stage);
}

/** Yearly upkeep: ages, school cohorts, drifting friendships. */
export function refreshPeople(p: Player) {
  const stage = currentStage(p);
  const people = Object.values(p.npcs);
  for (const n of people) {
    if (!n.alive) continue;
    refreshOccupation(p, n);
    if (n.role === "classmate" || n.role === "friend") {
      if (n.stage && n.stage !== stage && !n.former) n.former = true;
      if ((n.met ?? 0) === 0 && n.role !== "friend") n.closeness = clamp(n.closeness - randInt(1, 3), 5, 100);
      else if ((n.met ?? 0) === 0) n.closeness = clamp(n.closeness - randInt(1, 4), 5, 100);
    }
    if (n.role === "classmate" && n.closeness >= 70) n.role = "friend";
    n.met = 0;
  }
  fillClassmates(p);
  // keep the old-classmate list from growing without end
  const old = Object.values(p.npcs).filter((n) => n.role === "classmate" && n.former).sort((a, b) => a.closeness - b.closeness);
  for (const n of old.slice(0, Math.max(0, old.length - 12))) delete p.npcs[n.id];
  delete p.flags.friendTries;
}

// ---------------------------------------------------------------------------
// Making friends
// ---------------------------------------------------------------------------
export function makeFriendBlock(p: Player): string | null {
  if (p.age < 3) return T("Too young", "You still too small");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if (Number(p.flags.friendTries ?? 0) >= 2) return T("You have met enough new people this year", "You don meet enough new people this year");
  if (Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive).length >= 12) return T("Your circle is full", "Your circle don full");
  return null;
}

export function makeFriend(p: Player): string {
  const b = makeFriendBlock(p);
  if (b) return b;
  p.flags.friendTries = Number(p.flags.friendTries ?? 0) + 1;
  const pr = p.age < 13 ? 0.95 : p.school ? 0.8 : 0.6;
  if (!chance(pr)) return T("You try to make conversation but it does not click.", "You try yarn but e no gel.");
  const f = addFriend(p, p.age < 13 ? randInt(-1, 2) : randInt(-3, 4));
  f.closeness = randInt(35, 55);
  const where = p.age < 13 ? T("in the compound", "for the compound") : p.school ? T("at school", "for school") : pick([T("at church", "for church"), T("at the market", "for market"), T("at a football viewing centre", "for viewing centre")]);
  return T(`You meet ${f.name.split(" ")[0]} ${where}. ${f.occupation}, ${f.traits[0] ?? "friendly"}. You swap names.`, `You meet ${f.name.split(" ")[0]} ${where}. ${f.occupation}, ${f.traits[0] ?? "friendly"}. You swap names.`);
}

// ---------------------------------------------------------------------------
// Things to do together
// ---------------------------------------------------------------------------
export interface Interaction {
  id: string;
  emoji: string;
  en: string;
  pcm: string;
  descEn: string;
  descPcm: string;
  roles: NpcRole[] | "all";
  /** Your age range. */
  you?: [number, number];
  /** Their age range. */
  them?: [number, number];
  cost?: number;
  run: (p: Player, n: Npc) => string;
}

const FAMILY: NpcRole[] = ["dad", "mom", "guardian", "grandparent", "uncle", "aunt"];
const PEERS: NpcRole[] = ["friend", "classmate", "cousin", "sibling"];
const first = (n: Npc) => n.name.split(" ")[0];
const close = (n: Npc, d: number) => { n.closeness = clamp(n.closeness + d, 0, 100); };
const fond = (p: Player, n: Npc, d: number, text: string) => { close(n, d); remember(p, n, text, d >= 0 ? "good" : "bad"); };
const isFamily = (n: Npc) => FAMILY.includes(n.role) || n.role === "sibling" || n.role === "cousin";

/** Ask a friend out; a date makes it likelier. */
function askOut(p: Player, n: Npc, bonus: number): string {
  if (p.spouse || p.rel.partners.some((r) => ["exclusive", "engaged", "married"].includes(r.stage))) return T("You are already committed to someone.", "You don get person already.");
  if (n.gender === p.gender) return T(`${first(n)} smiles kindly: you are better as friends.`, `${first(n)} smile and talk say una better as friends.`);
  if (chance(clamp(0.15 + bonus + n.closeness / 200 + p.stats.looks / 400, 0.05, 0.85))) {
    const pn = addPartner(p, { name: n.name, look: n.look, gender: n.gender }, "dating");
    delete p.npcs[n.id];
    p.flags.dating = n.name; p.flags.datingNpc = pn.id;
    bump(p, "happiness", 10);
    return T(`${first(n)} says yes! You are officially dating.`, `${first(n)} talk yes! You two don dey date officially.`);
  }
  bump(p, "happiness", -3); fond(p, n, bonus > 0 ? 2 : -4, bonus > 0 ? "We had a nice evening." : "You asked me out and I said no.");
  return bonus > 0 ? T(`A lovely evening, but ${first(n)} sees you as a friend. For now.`, `Evening sweet, but ${first(n)} still see you as friend. For now.`) : T(`${first(n)} says no, kindly. It is a bit awkward for a while.`, `${first(n)} talk no, softly. E awkward for small time.`);
}

export const INTERACTIONS: Interaction[] = [
  { id: "chat", emoji: "💬", en: "Have a chat", pcm: "Yarn small", descEn: "Catch up. Always welcome.", descPcm: "Catch up. Always good.", roles: "all", run: (p, n) => { bump(p, "happiness", 2); fond(p, n, randInt(3, 7), "We had a good chat."); return T(`You and ${first(n)} talk for a long time about everything and nothing.`, `You and ${first(n)} yarn for long about everything and nothing.`); } },
  { id: "play", emoji: "⚽", en: "Play together", pcm: "Play together", descEn: "Football, suwe, ten-ten and hide-and-seek.", descPcm: "Football, suwe, ten-ten and hide-and-seek.", roles: PEERS, you: [3, 14], them: [3, 16], run: (p, n) => { bump(p, "happiness", 4); bump(p, "fitness", 1); fond(p, n, randInt(6, 10), "We played together."); return pick([T(`You and ${first(n)} play football until the sun goes down. Your knee is scratched and you are happy.`, `You and ${first(n)} play football till sun go down. Your knee scratch but you happy.`), T(`${first(n)} wins at ten-ten and will not stop bragging. You laugh anyway.`, `${first(n)} win ten-ten and no wan stop to dey form. You laugh anyway.`)]); } },
  { id: "lunch", emoji: "🍱", en: "Share your lunch", pcm: "Share your food", descEn: "A small kindness goes far.", descPcm: "Small kindness dey go far.", roles: ["friend", "classmate", "sibling"], you: [4, 17], cost: 300, run: (p, n) => { transact(p, { amount: -I(p, 300), reason: T("Shared snacks and lunch", "Share snacks and food"), category: "personal" }); bump(p, "reputation", 1); fond(p, n, randInt(7, 11), "You shared your lunch with me."); return T(`You give ${first(n)} half of your food. They remember it.`, `You give ${first(n)} half of your food. E go remember.`); } },
  { id: "befriend", emoji: "🤝", en: "Ask to be friends", pcm: "Ask make una be friends", descEn: "Turn a classmate into a real friend.", descPcm: "Turn classmate to correct friend.", roles: ["classmate"], you: [4, 120], run: (p, n) => {
    const friends = Object.values(p.npcs).filter((x) => x.role === "friend" && x.alive).length;
    if (friends >= 12) return T("Your circle is already full.", "Your circle don full.");
    if (n.closeness >= 40 || chance(0.35 + n.closeness / 200)) { n.role = "friend"; close(n, 12); remember(p, n, "We became friends.", "good"); return T(`${first(n)} grins: "Of course, we are friends now."`, `${first(n)} smile: "Of course, we don be friends now."`); }
    close(n, randInt(6, 10)); return T(`${first(n)} says "Let's see how it goes." You are getting there.`, `${first(n)} talk say "Make we see how e go." You dey get there.`);
  } },
  { id: "homework", emoji: "📚", en: "Do homework together", pcm: "Do assignment together", descEn: "Two heads are better than one.", descPcm: "Two head better pass one.", roles: ["friend", "classmate", "sibling", "cousin"], you: [6, 18], them: [6, 20], run: (p, n) => { bump(p, "smarts", 1); fond(p, n, randInt(4, 8), "We did our homework together."); return T(`You and ${first(n)} finish the assignment, then spend an hour on nonsense.`, `You and ${first(n)} finish the assignment, then waste one hour for nonsense.`); } },
  { id: "hangout", emoji: "🍹", en: "Hang out", pcm: "Hang out", descEn: "Food, drinks and gist.", descPcm: "Food, drinks and gist.", roles: ["friend", "classmate", "colleague", "cousin", "sibling"], you: [13, 120], them: [12, 120], cost: 8000, run: (p, n) => { transact(p, { amount: -I(p, 8000), reason: T(`Hanging out with ${first(n)}`, `Hang out with ${first(n)}`), category: "personal" }); bump(p, "happiness", 5); bump(p, "connections", 1); fond(p, n, randInt(6, 10), "We hung out."); return T(`Suya, cold drinks and three hours of gist with ${first(n)}.`, `Suya, cold drink and three hours of gist with ${first(n)}.`); } },
  { id: "party", emoji: "🎉", en: "Go to a party", pcm: "Go party", descEn: "Big fun. Sometimes big wahala.", descPcm: "Big fun. Sometimes big wahala.", roles: ["friend", "classmate"], you: [16, 120], them: [16, 120], cost: 25000, run: (p, n) => { transact(p, { amount: -I(p, 25000), reason: T(`Party with ${first(n)}`, `Party with ${first(n)}`), category: "personal" }); bump(p, "happiness", 6); bump(p, "connections", 2); fond(p, n, randInt(8, 12), "We partied."); if (chance(0.15)) { bump(p, "stress", 5); transact(p, { amount: -I(p, 20000), reason: T("Phone stolen at a party", "Dem thief phone for party"), category: "personal" }); return T(`Great night with ${first(n)}, until somebody picks your pocket.`, `Sweet night with ${first(n)}, till person thief your pocket.`); } return T(`You and ${first(n)} dance until the DJ gives up. Legends.`, `You and ${first(n)} dance till DJ give up. Legends.`); } },
  { id: "advice", emoji: "🧭", en: "Ask for advice", pcm: "Ask for advice", descEn: "Wisdom from someone who knows you.", descPcm: "Wisdom from person wey know you.", roles: "all", you: [10, 120], them: [14, 120], run: (p, n) => { const wise = n.responsibility >= 55; bump(p, "smarts", wise ? 2 : 1); bump(p, "stress", wise ? -4 : -1); fond(p, n, 3, "You asked me for advice."); return wise ? T(`${first(n)} gives you sound advice. You write it down.`, `${first(n)} give you correct advice. You write am down.`) : T(`${first(n)} means well, but the advice is... questionable. You smile and nod.`, `${first(n)} mean well, but the advice... e get question. You smile and nod.`); } },
  { id: "gist", emoji: "🗞️", en: "Share gist", pcm: "Share gist", descEn: "Who did what, and why.", descPcm: "Who do wetin, and why.", roles: PEERS, you: [8, 120], run: (p, n) => { bump(p, "happiness", 3); fond(p, n, randInt(3, 6), "We shared gist."); if (chance(0.12)) { bump(p, "reputation", -1); return T(`The gist reaches the wrong ears and you get blamed. Embarrassing.`, `The gist reach wrong ears and dem blame you. Shame.`); } return T(`${first(n)} has news you did not expect. You gasp in the right places.`, `${first(n)} get news wey you no expect. You gasp for the correct places.`); } },
  { id: "apologise", emoji: "🕊️", en: "Make up", pcm: "Settle am", descEn: "Fix a strained relationship.", descPcm: "Settle small wahala.", roles: "all", you: [5, 120], run: (p, n) => { if (chance(0.75)) { bump(p, "stress", -3); fond(p, n, randInt(10, 18), "You made up with me."); n.trust = clamp(n.trust + 4); return T(`You say sorry first. ${first(n)} hugs you and the air clears.`, `You say sorry first. ${first(n)} hug you and everything clear.`); } fond(p, n, -2, "You tried to make up."); return T(`${first(n)} is not ready to talk yet. Give it time.`, `${first(n)} never ready to talk. Give am time.`); } },
  { id: "favour", emoji: "🤝", en: "Ask for a favour", pcm: "Ask for favour", descEn: "A contact, a referral, a helping hand.", descPcm: "Contact, referral, helping hand.", roles: ["friend", "classmate", "cousin", "uncle", "aunt"], you: [18, 120], them: [20, 120], run: (p, n) => { if (n.closeness >= 45 && chance(0.55 + n.generosity / 400)) { bump(p, "connections", 3); fond(p, n, -1, "I helped you out."); return T(`${first(n)} makes a call and an introduction lands in your inbox.`, `${first(n)} make call and introduction land for your inbox.`); } fond(p, n, -3, "You asked a favour too early."); return T(`${first(n)} says "let me see what I can do" which means no.`, `${first(n)} talk say "make I see wetin I fit do" wey mean no.`); } },
  { id: "askout", emoji: "💘", en: "Ask them out", pcm: "Toast am", descEn: "Take a chance on love.", descPcm: "Try your luck for love.", roles: ["friend", "classmate", "colleague"], you: [16, 120], them: [16, 120], run: (p, n) => askOut(p, n, 0) },
  { id: "date_friend", emoji: "🍷", en: "Take them on a date", pcm: "Carry am go date", descEn: "Dinner, drinks, and see where it goes.", descPcm: "Food, drinks, make we see wetin go happen.", roles: ["friend", "classmate", "colleague"], you: [18, 120], them: [18, 120], cost: 20000, run: (p, n) => {
    if (n.gender === p.gender) return T(`${first(n)} laughs: "Not like that, but this was fun."`, `${first(n)} laugh: "No be like that, but e sweet."`);
    transact(p, { amount: -I(p, 20000), reason: T(`Date with ${first(n)}`, `Date with ${first(n)}`), category: "dating" });
    return askOut(p, n, 0.2);
  } },
  // Campus
  { id: "study", emoji: "📖", en: "Study together", pcm: "Read together", descEn: "Better grades and a stronger bond.", descPcm: "Better grade and stronger bond.", roles: ["classmate", "friend"], you: [17, 60], run: (p, n) => { bump(p, "smarts", 1); if (p.campus) { p.campus.effort += 0.6; p.campus.network = clamp(p.campus.network + 2); } fond(p, n, randInt(5, 9), "We studied together."); return T(`You and ${first(n)} revise through the night with noodles and bad coffee.`, `You and ${first(n)} read all night with noodles and bad coffee.`); } },
  { id: "notes", emoji: "📝", en: "Borrow lecture notes", pcm: "Borrow lecture notes", descEn: "A small boost, at a small price.", descPcm: "Small boost, small price.", roles: ["classmate"], you: [17, 60], run: (p, n) => { if (p.campus) p.campus.effort += 0.4; fond(p, n, -2, "You borrowed my notes."); return T(`${first(n)} hands over neat notes and asks for them back "by tomorrow". They are not getting them back by tomorrow.`, `${first(n)} give you neat notes and ask make you return "by tomorrow". You no go return by tomorrow.`); } },
  { id: "project", emoji: "👥", en: "Team up on a project", pcm: "Team up for project", descEn: "Group work. Pray they carry weight.", descPcm: "Group work. Pray say dem go carry weight.", roles: ["classmate", "friend"], you: [17, 60], run: (p, n) => { if (p.campus) { p.campus.effort += 0.8; p.campus.lead = clamp(p.campus.lead + 2); } fond(p, n, randInt(4, 8), "We did a project together."); return n.traits.includes("lazy") ? T(`${first(n)} disappears on the deadline. You do most of it, but it still passes.`, `${first(n)} vanish for deadline. You do most of am, but e still pass.`) : T(`You and ${first(n)} split the work fairly. The lecturer is impressed.`, `You and ${first(n)} share the work well. Lecturer impress.`); } },
  // Family
  { id: "family_time", emoji: "📺", en: "Spend time together", pcm: "Spend time together", descEn: "Watch TV, eat, simply be there.", descPcm: "Watch TV, chop, just dey there.", roles: FAMILY, run: (p, n) => { p.family.happy = clamp(p.family.happy + 3); bump(p, "happiness", 3); fond(p, n, randInt(5, 8), "We spent the evening together."); return T(`An evening with ${first(n)}: rice, Nollywood and nobody checks their phone.`, `Evening with ${first(n)}: rice, Nollywood and nobody dey look phone.`); } },
  { id: "chores", emoji: "🧹", en: "Help with chores", pcm: "Help with house work", descEn: "Sweep, wash, fetch. Earns trust.", descPcm: "Sweep, wash, fetch. E dey build trust.", roles: ["dad", "mom", "guardian", "grandparent", "aunt", "uncle"], you: [6, 40], run: (p, n) => { bump(p, "fitness", 1); n.trust = clamp(n.trust + 3); fond(p, n, randInt(4, 7), "You helped with chores."); if (p.age < 18 && chance(0.4)) { transact(p, { amount: I(p, 1500), reason: T(`Small reward from ${first(n)}`, `Small reward from ${first(n)}`), category: "allowance" }); return T(`You help ${first(n)} with chores and get a little something for it.`, `You help ${first(n)} with chores and e give you small something.`); } return T(`${first(n)} says "good child" and you feel ten feet tall.`, `${first(n)} talk say "good pikin" and you feel big.`); } },
  { id: "school_talk", emoji: "🎒", en: "Talk about school", pcm: "Talk about school", descEn: "Share how school is going.", descPcm: "Share how school dey go.", roles: ["dad", "mom", "guardian"], you: [5, 28], run: (p, n) => { if (!p.school) return T("You are not in school right now.", "You no dey school now."); p.family.happy = clamp(p.family.happy + 3); fond(p, n, randInt(3, 6), "You told me about school."); return p.stats.smarts >= 60 ? T(`${first(n)} beams when you talk about your grades.`, `${first(n)} smile well when you talk about your grades.`) : T(`${first(n)} listens, then gives a long talk about the importance of reading.`, `${first(n)} listen, then give long talk about reading book.`); } },
  { id: "good_news", emoji: "🎊", en: "Share good news", pcm: "Share good news", descEn: "Let them celebrate with you.", descPcm: "Make dem celebrate with you.", roles: FAMILY, you: [16, 120], run: (p, n) => { p.family.happy = clamp(p.family.happy + 4); bump(p, "happiness", 3); fond(p, n, randInt(4, 7), "You shared good news with me."); return T(`${first(n)} screams with joy and tells the whole family before you hang up.`, `${first(n)} shout for joy and tell the whole family before you drop call.`); } },
  { id: "permission", emoji: "🚪", en: "Ask permission to go out", pcm: "Ask permission to go out", descEn: "Depends on how strict they are.", descPcm: "E depend on how strong dem be.", roles: ["dad", "mom", "guardian"], you: [10, 17], run: (p, n) => { if (chance(clamp(0.8 - n.strictness / 130 + n.closeness / 300, 0.15, 0.9))) { bump(p, "happiness", 4); fond(p, n, 2, "You asked permission properly."); return T(`${first(n)} says yes, "but be back before dark".`, `${first(n)} talk yes, "but come back before dark".`); } bump(p, "stress", 2); fond(p, n, -1, "You asked to go out."); return T(`${first(n)} says no. The lecture on "bad company" takes ten minutes.`, `${first(n)} talk no. The lecture on "bad company" take ten minutes.`); } },
  { id: "stories", emoji: "📖", en: "Listen to their stories", pcm: "Listen to their stories", descEn: "Old days, old lessons.", descPcm: "Old days, old lessons.", roles: ["grandparent", "uncle", "aunt", "dad", "mom", "guardian"], run: (p, n) => { bump(p, "smarts", 1); bump(p, "happiness", 2); fond(p, n, randInt(5, 8), "You listened to my stories."); return T(`${first(n)} tells a story from before independence and you learn something new.`, `${first(n)} tell story from before independence and you learn something new.`); } },
  { id: "pray", emoji: "🙏", en: "Pray together", pcm: "Pray together", descEn: "Calm and closeness.", descPcm: "Calm and closeness.", roles: FAMILY, run: (p, n) => { bump(p, "stress", -4); fond(p, n, randInt(4, 7), "We prayed together."); return T(`You and ${first(n)} pray together. You feel lighter after.`, `You and ${first(n)} pray together. You feel lighter after.`); } },
  { id: "cook", emoji: "🍲", en: "Cook together", pcm: "Cook together", descEn: "Jollof secrets, passed down.", descPcm: "Jollof secrets wey dem pass down.", roles: ["mom", "grandparent", "aunt", "guardian"], you: [6, 120], run: (p, n) => { bump(p, "happiness", 3); fond(p, n, randInt(5, 8), "We cooked together."); return T(`${first(n)} finally reveals the secret to the jollof. You have been sworn to secrecy.`, `${first(n)} finally show you the jollof secret. Dem swear you to secrecy.`); } },
  { id: "secret", emoji: "🤫", en: "Share a secret", pcm: "Share secret", descEn: "Only for the siblings you trust.", descPcm: "Only for sibling wey you trust.", roles: ["sibling", "cousin"], you: [8, 120], run: (p, n) => { n.trust = clamp(n.trust + 4); fond(p, n, randInt(6, 9), "You told me a secret."); return T(`You and ${first(n)} swap secrets and swear never to tell Mummy.`, `You and ${first(n)} swap secrets and swear say you no go tell Mummy.`); } },
  { id: "call", emoji: "📞", en: "Call them", pcm: "Call am", descEn: "A quick call across the distance.", descPcm: "Quick call across the distance.", roles: "all", you: [16, 120], cost: 500, run: (p, n) => { transact(p, { amount: -I(p, 500), reason: T(`Airtime for a call to ${first(n)}`, `Airtime for call to ${first(n)}`), category: "airtime" }); fond(p, n, randInt(2, 4), "You called me."); if (isFamily(n)) p.family.happy = clamp(p.family.happy + 1); return T(`You call ${first(n)}. The network breaks twice, but the love gets through.`, `You call ${first(n)}. Network cut two times, but love still pass.`); } },
];

export function interactionsFor(p: Player, n: Npc): Interaction[] {
  const you = p.age;
  const them = npcAge(p, n);
  return INTERACTIONS.filter((i) => {
    if (i.roles !== "all" && !i.roles.includes(n.role)) return false;
    if (i.id === "apologise" && n.closeness >= 55) return false;
    if (i.you && (you < i.you[0] || you > i.you[1])) return false;
    if (i.them && (them < i.them[0] || them > i.them[1])) return false;
    if (["study", "notes", "project"].includes(i.id) && !(p.campus && !p.campus.graduated && n.stage === "university" && !n.former)) return false;
    if (i.id === "homework" && !p.school) return false;
    if (i.id === "lunch" && !p.school && n.role !== "sibling") return false;
    return true;
  });
}

export function interactBlock(p: Player, n: Npc, i: Interaction): string | null {
  if (!n.alive) return T("They are no longer with us", "E don die");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  if ((n.met ?? 0) >= 3) return T(`You have spent plenty of time with ${first(n)} this year`, `You don spend plenty time with ${first(n)} this year`);
  if (i.cost && p.money < I(p, i.cost)) return T("Not enough cash", "Cash no reach");
  return null;
}

export function interact(p: Player, npcId: string, id: string): string {
  const n = p.npcs[npcId];
  const i = INTERACTIONS.find((x) => x.id === id);
  if (!n || !i) return "";
  if (!interactionsFor(p, n).includes(i)) return "";
  const b = interactBlock(p, n, i);
  if (b) return b;
  n.met = (n.met ?? 0) + 1;
  const wasId = n.id;
  const msg = i.run(p, n);
  if (p.npcs[wasId]) n.closeness = clamp(n.closeness, 0, 100);
  return msg;
}

void rand;
