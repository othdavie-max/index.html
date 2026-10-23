import { STATE_BY_ID, OFFICES } from "./data";
import { jobTitle } from "./helpers";
import { netWorth } from "./kidnap";
import { totalFollowers } from "./social";
import type { Bi, Mourner, Npc, Obituary, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";
import { campusLabel } from "./campus";

const bi = (en: string, pcm: string): Bi => ({ en, pcm });
const nn = (n: number) => n.toLocaleString("en-NG");
const first = (s: string) => s.split(" ")[0];

// Funny lines, English then Pidgin.
const CAME: Record<string, Bi[]> = {
  dad: [bi("Said 'be strong', then cried in the car for an hour.", "Talk say 'be strong', then cry for car for one hour."), bi("Gave a speech longer than the sermon.", "Give speech wey pass the sermon.")],
  mom: [bi("Wept for three days and still asked if you had eaten.", "Cry for three days and still ask if you don chop."), bi("Wore her best lace and cried louder than the choir.", "Wear her best lace and cry pass choir.")],
  guardian: [bi("Paid for the caterers and told everyone about it.", "Pay caterers and tell everybody about am.")],
  grandparent: [bi("Said 'I buried my own children, I didn't expect this' and the room went silent.", "Talk say 'I bury my own pikin, I no expect this one' and everywhere quiet.")],
  sibling: [bi("Fought over who gets your phone at the back of the church.", "Quarrel over who go carry your phone for back of church."), bi("Told the story of that one time you ruined Christmas. Everyone laughed through tears.", "Tell story of the time you spoil Christmas. Everybody laugh with tears.")],
  cousin: [bi("Came for the jollof, stayed for the gist.", "Come for jollof, stay for gist.")],
  uncle: [bi("Asked about the will before the body was cold.", "Ask about will before body cold.")],
  aunt: [bi("Took 40 photos and posted 38 of them.", "Snap 40 photo and post 38.")],
  friend: [bi("Told the funniest story about you. Nobody knew whether to laugh.", "Tell the funniest story about you. Nobody sabi if to laugh."), bi("Cried louder than your family. Whose funeral is it?", "Cry pass your family. Na who burial be this?")],
  classmate: [bi("Remembered the day you shared your lunch.", "Remember the day you share your food."), bi("Came with the old class WhatsApp group on speaker.", "Come with old class WhatsApp group for speaker.")],
  spouse: [bi("Couldn't speak. Held your hand the whole time.", "Fit no talk. Hold your hand all through."), bi("Wore white and read the eulogy through tears.", "Wear white and read eulogy with tears.")],
  kid: [bi("Spoke about you with a voice that kept breaking.", "Talk about you with voice wey dey break."), bi("Promised to carry the family name with pride.", "Promise to carry family name with pride.")],
  ex: [bi("Came 'to pay respects' and sat at the back looking mysterious.", "Come 'to pay respect' and sit back looking mysterious.")],
};
const ABSENT_FAR: Bi[] = [
  bi("Said 'traffic'. It was a Sunday.", "Talk say 'traffic'. Na Sunday."),
  bi("Could not get a flight (lives on the next street).", "No fit get flight (stay for next street)."),
  bi("Said they would be there 'in spirit'.", "Talk say dem go dey 'in spirit'."),
  bi("Had an owambe the same day. The jollof was better.", "Get owambe same day. The jollof better pass."),
  bi("Sent a 'RIP' on WhatsApp and a crying emoji.", "Send 'RIP' for WhatsApp with crying emoji."),
];
const ABSENT_COLD: Bi[] = [
  bi("You only called when you needed something.", "You only call when you need something."),
  bi("Last spoke to you three Christmases ago.", "Last yarn with you three Christmas ago."),
  bi("Had you saved as 'Do not pick'.", "Save your number as 'Do not pick'."),
];

const usedLines = new Set<string>();
/** A line nobody else at this funeral has had yet, when there are enough to go round. */
function takeLine(pool: Bi[]): Bi {
  const fresh = pool.filter((l) => !usedLines.has(l.en));
  const l = pick(fresh.length ? fresh : pool);
  usedLines.add(l.en);
  return l;
}

const roleBi = (n: Npc): Bi => {
  const m: Record<string, [string, string]> = { dad: ["Dad", "Papa"], mom: ["Mom", "Mama"], guardian: ["Guardian", "Guardian"], grandparent: [n.gender === "male" ? "Grandfather" : "Grandmother", n.gender === "male" ? "Grandfather" : "Grandmother"], sibling: [n.gender === "male" ? "Brother" : "Sister", n.gender === "male" ? "Brother" : "Sister"], cousin: ["Cousin", "Cousin"], uncle: ["Uncle", "Uncle"], aunt: ["Aunty", "Aunty"], friend: ["Friend", "Padi"], classmate: ["Old classmate", "Old classmate"], partner: ["Partner", "Partner"], ex: ["Ex", "Ex"] };
  const x = m[n.role] ?? [n.role, n.role];
  return bi(x[0], x[1]);
};

const baseChance: Record<string, number> = { dad: 0.97, mom: 0.97, guardian: 0.92, grandparent: 0.88, sibling: 0.9, cousin: 0.55, uncle: 0.7, aunt: 0.7, friend: 0.8, classmate: 0.42, partner: 0.9, ex: 0.3 };

const high = (p: Player) => p.politics?.highest ?? -1;
const worthReal = (p: Player) => Math.max(p.peakWorth, netWorth(p)) / p.index;

export function buildObituary(p: Player): Obituary {
  usedLines.clear();
  const rep = p.stats.reputation;
  const bigShot = high(p) >= 4 || worthReal(p) >= 2_000_000_000;
  const crooked = p.job?.id === "kidnapper" || p.loot > p.goodDeeds * 5_000_000_000 && p.loot > 0 || p.crime.record.length >= 3;
  const came: Mourner[] = [];
  const absent: Mourner[] = [];
  let expected = 0;
  const owes = new Set(p.loans.filter((l) => l.direction === "owed" && l.status === "active" && l.lenderId).map((l) => l.lenderId));

  for (const n of Object.values(p.npcs)) {
    if (!(n.role in baseChance)) continue;
    if (n.role === "partner" && p.spouse?.npcId !== n.id) continue;
    if (n.role === "classmate" && n.closeness < 35) continue;
    expected += 1;
    const age = Math.max(0, p.age + n.ageDelta);
    const mk = (line: Bi): Mourner => ({ name: n.name, role: roleBi(n), look: n.look, gender: n.gender, age, line });
    if (!n.alive) { if (absent.length < 40 && ["dad", "mom", "grandparent", "uncle", "aunt"].includes(n.role)) absent.push(mk(bi("Already on the other side, waiting with a cold drink.", "Already for the other side, dey wait with cold drink."))); continue; }
    let pr = baseChance[n.role] + (n.closeness - 50) / 120;
    const bad = n.memories.filter((m) => m.tone === "bad").length;
    pr -= bad * 0.1;
    if (n.id && owes.has(n.id)) pr -= 0.25;
    if (rep < 25) pr -= 0.2;
    if (crooked) pr -= 0.2;
    if (bigShot) pr += 0.25;
    if (["cousin", "uncle", "aunt"].includes(n.role) && worthReal(p) > 100_000_000) pr += 0.15;
    if (chance(clamp(pr, 0.03, 0.99))) came.push(mk(takeLine(CAME[n.role] ?? CAME.friend)));
    else {
      let reason: Bi;
      if (n.id && owes.has(n.id)) reason = bi("Still waiting for the money you borrowed.", "Still dey wait for the money wey you borrow.");
      else if (bad > 0) { const m = [...n.memories].reverse().find((x) => x.tone === "bad"); reason = bi(`Never forgot: "${m?.text ?? "that thing you did"}"`, `Never forget: "${m?.text ?? "that thing wey you do"}"`); }
      else if (crooked && ["dad", "mom", "guardian", "sibling"].includes(n.role)) reason = bi("Disowned you after the 'incident' and stayed home.", "Disown you after the 'incident' and stay house.");
      else if (n.closeness < 30) reason = pick(ABSENT_COLD);
      else reason = pick(ABSENT_FAR);
      absent.push(mk(reason));
    }
  }
  // Spouse and children are not NPCs
  if (p.spouse && !Object.values(p.npcs).some((n) => n.id === p.spouse?.npcId)) {
    expected += 1;
    came.push({ name: p.spouse.name, role: bi("Spouse", "Spouse"), look: p.spouse.look ?? p.look, gender: p.gender === "male" ? "female" : "male", age: p.age, line: takeLine(CAME.spouse) });
  }
  for (const k of p.kids) {
    expected += 1;
    const pr = 0.9 + ((k.closeness ?? 60) - 50) / 300 - (crooked ? 0.2 : 0);
    const m: Mourner = { name: `${k.name} ${p.surname}`, role: bi(k.gender === "male" ? "Son" : "Daughter", k.gender === "male" ? "Son" : "Daughter"), look: k.look ?? p.look, gender: k.gender, age: k.age, line: takeLine(CAME.kid) };
    if (chance(clamp(pr, 0.2, 0.99))) came.push(m); else absent.push({ ...m, line: bi("Could not forgive the way you ran the family.", "No fit forgive how you run the family.") });
  }
  const order = ["Spouse", "Son", "Daughter", "Mom", "Dad", "Guardian", "Brother", "Sister", "Grandmother", "Grandfather", "Friend", "Aunty", "Uncle", "Cousin", "Old classmate", "Ex"];
  const rank = (m: Mourner) => { const i = order.indexOf(m.role.en); return i < 0 ? 99 : i; };
  came.sort((a, b) => rank(a) - rank(b));

  // Crowds: the powerful, the rich and the popular get a bigger turnout
  let crowd = randInt(6, 25);
  if (bigShot) crowd += randInt(300, 2500);
  if (rep > 70) crowd += randInt(40, 200);
  if (p.businesses.length) crowd += p.businesses.length * randInt(10, 40);
  if (totalFollowers(p) > 50_000) crowd += Math.round(Math.min(totalFollowers(p) / 400, 2000));
  if (rep < 25 || crooked) crowd = Math.round(crowd * 0.3);
  const totalCame = came.length + crowd;
  const totalExpected = expected + Math.round(crowd / (0.55 + rand(0, 0.3)));

  // Special guests
  const g: Bi[] = [];
  const jid = p.job?.id ?? "";
  const hi = high(p);
  if (p.achievements.includes("Became President")) g.push(bi("The nation declared a public holiday. Banks closed, markets opened anyway, and a 21-gun salute scared half of Abuja.", "Government declare public holiday. Banks close, market open anyway, and 21-gun salute scare half of Abuja."));
  else if (hi === 4) g.push(bi("The state declared three days of mourning. Civil servants have never mourned so happily.", "State declare three days mourning. Civil servants never mourn so happily."));
  else if (hi >= 2) g.push(bi("Political rivals came to confirm it was real. A senator fell asleep during the eulogy.", "Political rivals come confirm say e real. One senator sleep for eulogy."));
  if (jid === "doctor") g.push(bi("Hundreds of former patients came. Someone shouted 'is there a doctor in the house?' and everybody looked at the casket.", "Hundreds of former patients come. Person shout 'any doctor for here?' and everybody look casket."));
  if (jid === "lawyer") g.push(bi("The funeral was adjourned twice for 'procedural reasons'.", "Dem adjourn the funeral twice for 'procedural reason'."));
  if (jid === "teacher") g.push(bi("Four generations of students came. One still said 'sorry sir' out of habit.", "Four generations of students come. One still talk 'sorry sir' by habit."));
  if (jid === "nurse") g.push(bi("The whole hospital ward came in uniform. For once nobody was on night shift.", "Whole hospital ward come in uniform. For once nobody dey night shift."));
  if (jid === "engineer") g.push(bi("Colleagues argued about the structural integrity of the casket.", "Colleagues dey argue about structural integrity of casket."));
  if (["soldier", "police", "navy", "airforce"].includes(jid)) g.push(bi("A guard of honour fired three volleys. The neighbourhood dogs have not recovered.", "Guard of honour fire three volleys. Neighbourhood dogs never recover."));
  if (jid === "kidnapper") g.push(bi("Two policemen attended 'for security'. They were really looking for the money.", "Two policemen attend 'for security'. Dem dey find the money."));
  if (jid === "yahoo") g.push(bi("Fake condolence messages arrived from 'a Prince' requesting a small fee to release the wreath.", "Fake condolence message land from 'one Prince' wey want small fee to release wreath."));
  if (["okada", "keke", "driver"].includes(jid)) g.push(bi("The motor park honked for five solid minutes. The cemetery has still not recovered.", "Motor park honk for five solid minutes. Cemetery never recover."));
  if (["creator", "tiktoker", "influencer", "youtuber", "streamer"].includes(jid) || totalFollowers(p) > 100_000) g.push(bi(`#RIP${first(p.name)} trended for two hours before a celebrity breakup replaced it.`, `#RIP${first(p.name)} trend for two hours before one celebrity breakup replace am.`));
  if (p.campus?.sug === "won") g.push(bi("Old comrades chanted 'Aluta continua!' at the graveside. The groundsman was confused.", "Old comrades shout 'Aluta continua!' for graveside. Groundsman confuse."));
  if (p.campus?.cls === "First Class") g.push(bi("The university sent a representative with a framed 'we remember you' letter.", "University send representative with framed 'we remember you' letter."));
  if (p.businesses.length) g.push(bi("Your staff came in uniform. One quietly asked if next month's salary will still be paid.", "Your staff come in uniform. One quietly ask if next month salary go still enter."));
  if (worthReal(p) >= 1_000_000_000) g.push(bi("Helicopters landed on the football pitch. Relatives you never met cried the loudest.", "Helicopters land for football pitch. Relatives wey you never meet cry pass everybody."));
  if (p.crime.record.length > 0 && !g.some((x) => x.en.includes("policemen"))) g.push(bi("A policeman attended 'for old times' sake' and left with a bottle of Fanta.", "One policeman attend 'for old times sake' and comot with bottle of Fanta."));
  if (p.state === "abroad" || p.achievements.includes("Japa success")) g.push(bi("Friends in London joined on Zoom. Somebody forgot to unmute and everyone heard a blender.", "Friends for London join for Zoom. Person forget to unmute and everybody hear blender."));
  if (p.age >= 85) g.push(bi("'God's time is the best,' said the village, and sold more drinks.", "'God time na the best,' the village talk, and sell more drink."));
  if (totalCame < 15) g.push(bi("Not many came, but the jollof was top tier.", "Not many people come, but the jollof top tier."));
  g.push(p.religion === "Muslim" ? bi("The burial was before sunset, as tradition requires. The imam's eulogy was short, honest and sweet.", "Dem bury before sunset, as tradition want. Imam eulogy short, honest and sweet.") : bi("The choir sang so well that three people asked if they were available for weddings.", "The choir sing so well that three people ask if dem free for wedding."));

  // Verdict
  const chaos = p.crime.record.length + p.kidnaps * 2 + (p.job?.id === "kidnapper" ? 4 : 0) + (p.achievements.includes("Escaped prison") ? 2 : 0);
  const good = p.goodDeeds + (rep > 70 ? 3 : 0) + (p.flags.own_foundation ? 3 : 0);
  const loved = came.length / Math.max(1, expected);
  const rating = clamp(Math.round(20 + Math.min(25, Math.log10(Math.max(1, worthReal(p))) * 3) + Math.min(20, good * 3) + loved * 20 + Math.min(15, (high(p) + 1) * 3) + Math.min(10, p.age / 8) - chaos * 3 - (crooked ? 12 : 0)), 3, 99);
  const nothing = p.age >= 35 && p.achievements.length <= 1 && worthReal(p) < 5_000_000 && p.kids.length === 0 && high(p) < 0;
  let tag: Obituary["tag"]; let tagline: Bi;
  if (p.achievements.includes("Became President")) { tag = { emoji: "👑", en: "A legendary life", pcm: "Legendary life" }; tagline = bi("They will teach this one in schools (and argue about it at the motor park).", "Dem go teach this one for school (and argue am for motor park)."); }
  else if (crooked && p.loot > 0) { tag = { emoji: "🐍", en: "A looter's life", pcm: "Looter's life" }; tagline = bi("Rich, loud and loved by exactly nobody who is not on the payroll.", "Rich, loud and nobody love am except people for payroll."); }
  else if (hi >= 4) { tag = { emoji: "🏛️", en: "A big-man life", pcm: "Big-man life" }; tagline = bi("Convoys, sirens and a very long list of titles.", "Convoy, siren and very long list of title."); }
  else if (chaos >= 5) { tag = { emoji: "🎢", en: "A crazy life", pcm: "Crazy life" }; tagline = bi("Arrests, kidnappings and plot twists. Nollywood has called.", "Arrest, kidnap and plenty plot twist. Nollywood don call."); }
  else if (crooked) { tag = { emoji: "🕶️", en: "A shady life", pcm: "Shady life" }; tagline = bi("Everybody has a story. Nobody wants to tell it in daylight.", "Everybody get story. Nobody wan tell am for daylight."); }
  else if (good >= 6 && rep >= 60) { tag = { emoji: "🌱", en: "A useful life", pcm: "Useful life" }; tagline = bi("Left the place better than they met it. Rare in these parts.", "Leave the place better than how dem meet am. E rare for here."); }
  else if (worthReal(p) >= 1_000_000_000) { tag = { emoji: "💰", en: "A money-bags life", pcm: "Money-bags life" }; tagline = bi("Made it big. The relatives have already started the WhatsApp group.", "Make am big. Relatives don start WhatsApp group."); }
  else if (totalFollowers(p) > 100_000) { tag = { emoji: "📸", en: "A famous life", pcm: "Famous life" }; tagline = bi("Everybody knew the name. Fewer knew the person.", "Everybody know the name. Few know the person."); }
  else if (p.age < 30) { tag = { emoji: "🕯️", en: "A life cut short", pcm: "Life wey cut short" }; tagline = bi("Gone too soon, with so much still to try.", "Gone too early, plenty thing remain."); }
  else if (nothing) { tag = { emoji: "🗑️", en: "A wasted life", pcm: "Wasted life" }; tagline = bi("Lots of time, lots of potential, not a lot to show. Next life, try harder.", "Plenty time, plenty potential, small to show. Next life, try pass."); }
  else if (p.businesses.length >= 2 || ["trader", "hawker"].includes(jid)) { tag = { emoji: "💼", en: "A hustler's life", pcm: "Hustler's life" }; tagline = bi("Woke up early, slept late, and never said 'I'm tired'. (They were.)", "Wake early, sleep late, never talk say 'I tire'. (E tire am.)"); }
  else if (p.moments && p.moments.length >= 4) { tag = { emoji: "✨", en: "A unique life", pcm: "Unique life" }; tagline = bi("Nothing like it. Nothing will be like it again.", "Nothing like am. Nothing go like am again."); }
  else { tag = { emoji: "🕊️", en: "A peaceful life", pcm: "Peaceful life" }; tagline = bi("Not much drama, not much money, plenty of rice. A good run.", "No much drama, no much money, plenty rice. Good run."); }

  // What they did
  const h: Bi[] = [];
  const st = STATE_BY_ID[p.birthState];
  h.push(bi(`Born in ${st?.name ?? "Nigeria"} into a "${p.fam.label}" family.`, `Born for ${st?.name ?? "Nigeria"} inside "${p.fam.label}" family.`));
  if (p.campus?.graduated) h.push(bi(`Studied at ${campusLabel(p)} and came out with ${p.campus.cls}.`, `Read for ${campusLabel(p)} and finish with ${p.campus.cls}.`));
  else if (p.edu === "tertiary") h.push(bi("Went to university and graduated, to the delight of the whole street.", "Go university and graduate, make the whole street happy."));
  else if (p.edu === "none" || p.edu === "primary") h.push(bi("Left school early and learnt life the hard way.", "Leave school early and learn life the hard way."));
  const title = hi >= 0 ? OFFICES[hi].title : jobTitle(p);
  h.push(bi(`Ended up as: ${title}.`, `E end as: ${title}.`));
  h.push(bi(`Peak fortune: ${naira(p.peakWorth)}. Died with ${naira(netWorth(p))}.`, `Biggest fortune: ${naira(p.peakWorth)}. E die with ${naira(netWorth(p))}.`));
  if (p.spouse) h.push(bi(`Married ${p.spouse.name}${p.kids.length ? ` and had ${p.kids.length} child${p.kids.length === 1 ? "" : "ren"}` : ""}.`, `Marry ${p.spouse.name}${p.kids.length ? ` and get ${p.kids.length} pikin` : ""}.`));
  else if (p.kids.length) h.push(bi(`Raised ${p.kids.length} child${p.kids.length === 1 ? "" : "ren"}.`, `Raise ${p.kids.length} pikin.`));
  else h.push(bi("Never married and never had children. Peace and quiet were enjoyed.", "Never marry and no get pikin. Enjoy peace and quiet."));
  const exes = p.rel.partners.filter((r) => r.stage === "ex").length;
  if (exes >= 3) h.push(bi(`Dated ${exes} people who are now "just friends" (they are not).`, `Date ${exes} people wey don turn "just friends" (e no be so).`));
  if (p.kidnaps > 0) h.push(bi(`Was kidnapped ${p.kidnaps} time${p.kidnaps === 1 ? "" : "s"}${typeof p.flags.kidEscaped === "number" ? " and escaped once" : ""}. Still went to work after.`, `Dem kidnap am ${p.kidnaps} time${p.kidnaps === 1 ? "" : "s"}${typeof p.flags.kidEscaped === "number" ? " and e escape once" : ""}. E still go work after.`));
  if (p.crime.record.length > 0) h.push(bi(`Had ${p.crime.record.length} run-in${p.crime.record.length === 1 ? "" : "s"} with the law.`, `Get ${p.crime.record.length} wahala with police.`));
  if (p.businesses.length) h.push(bi(`Owned ${p.businesses.length} business${p.businesses.length === 1 ? "" : "es"} and paid more tax than anyone knew.`, `Own ${p.businesses.length} business and pay more tax than people sabi.`));
  if (p.loot > 0) h.push(bi(`Quietly took ${naira(p.loot)} that was not theirs.`, `Quietly take ${naira(p.loot)} wey no be theirs.`));
  else if (p.goodDeeds >= 4) h.push(bi("Did a lot of good that nobody posted about.", "Do plenty good wey nobody post."));
  for (const m of (p.moments ?? []).slice(0, 3)) h.push(bi(`${m.emoji} ${m.en}`, `${m.emoji} ${m.pcm}`));
  const doneGoals = (p.goals ?? []).filter((x) => x.done).length;
  if (doneGoals) h.push(bi(`Finished ${doneGoals} of 3 life goals.`, `Finish ${doneGoals} of 3 life goals.`));

  const causeLine = ((): Bi | null => {
    const c = (p.cause || "").toLowerCase();
    if (c.includes("heart")) return bi("Heart attack: fuel price, light bill and the group chat finally did it.", "Heart attack: fuel price, light bill and group chat finally do am.");
    if (c.includes("malaria")) return bi("Malaria. A true Nigerian to the end.", "Malaria. True Nigerian to the end.");
    if (c.includes("stroke")) return bi("Stroke. Too many people asking for money.", "Stroke. Too many people dey ask for money.");
    if (c.includes("kidnap")) return bi("Kidnappers. Some roads should simply not be taken.", "Kidnappers. Some road no suppose to waka.");
    if (c.includes("surrender")) return bi("Chose to let go. Another chapter begins.", "Choose to let go. Another chapter dey start.");
    if (c.includes("old age")) return bi("Old age, which in Naija is a miracle on its own.", "Old age, wey for Naija na miracle.");
    return null;
  })();

  const verdict = bi(
    rating >= 80 ? "A life people will talk about for years." : rating >= 60 ? "A good run. Not perfect, but people showed up." : rating >= 40 ? "An average life, with some good chapters." : "A tough life. The jollof at the funeral was the best part.",
    rating >= 80 ? "Life wey people go talk about for years." : rating >= 60 ? "Good run. E no perfect, but people show." : rating >= 40 ? "Normal life, with some good chapters." : "Hard life. Jollof for burial na the best part.",
  );
  return { tag, tagline, rating, highlights: h.slice(0, 10), came: came.slice(0, 14), absent: absent.slice(0, 10), turnout: { came: totalCame, expected: Math.max(totalExpected, totalCame) }, guests: g.slice(0, 6), cause: causeLine, verdict };
}

void nn;
