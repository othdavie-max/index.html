import { COURSES, STATE_BY_ID, TRAVEL_STATES } from "./data";
import { I, bump, eligibleJobs, luckBonus, enterPrison, jobDef, moveTo, randomName, stateOf } from "./helpers";
import type { AutoDef, Choice, EventDef, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";
import { kidLook, lookToStr, randomLook, strToLook } from "./look";
import { developCondition } from "./health";
import { addPartner, marry } from "./relationships";
import { schoolHousing } from "./world";

const isSelfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const adult = (p: Player) => p.age >= 18;
const evt = (id: string, data: Record<string, string | number | boolean> = {}): Pending => ({ kind: "event", id, data });

function startTertiary(p: Player, type: "university" | "polytechnic"): void {
  p.school = { stage: "tertiary", yearsLeft: type === "university" ? 4 : 3, type };
  p.flags.schoolType = type === "university" && ["nepo", "strictRich", "upperMiddle", "newlyRich"].includes(p.fam.archetype) && chance(0.45) ? "private" : "public";
  schoolHousing(p, true);
}

// ---------------------------------------------------------------------------
// Events with choices
// ---------------------------------------------------------------------------
export const EVENTS: EventDef[] = [
  {
    id: "family_ask",
    title: dual("Family trouble", "Family wahala"),
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 3 + (STATE_BY_ID[p.family.state].opp < 4 ? 2 : 0) : 0),
    init: () => ({ who: pick([T("Uncle Emeka", "Uncle Emeka"), T("Aunty Bisi", "Aunty Bisi"), T("Your cousin", "Your cousin"), T("Mama", "Mama"), T("Your elder brother", "Your big brother"), T("Papa", "Papa")]), why: pick([T("school fees", "school fees"), T("a hospital bill", "hospital bill"), T("a wedding contribution", "wedding contribution"), T("rent that is due", "rent wey don due"), T("a funeral levy", "funeral levy"), T("a goat for the festival", "goat for the festival")]) }),
    text: (p, d) => T(`${d.who} just called you from ${STATE_BY_ID[p.family.state].name}. "My child, God chose you to bless this family. We need money for ${d.why}. Please don't be angry."`, `${d.who} don call you from ${STATE_BY_ID[p.family.state].name}. "Omo, na you God use bless this family. We need money for ${d.why}. No vex o."`),
    choices: (p) => [
      { label: T("Send generously", "Send am well-well"), sub: T(`${naira(p.money * 0.08)} (8% of your cash)`, `${naira(p.money * 0.08)} (8% of your cash)`), run: (q) => { const a = Math.max(0, q.money * 0.08); q.money -= a; q.family.happy = clamp(q.family.happy + 15); bump(q, "reputation", 3); return T(`You send ${naira(a)}. Everybody is praying for you.`, `You send ${naira(a)}. Everybody dey pray for you.`); } },
      { label: T("Send a small amount", "Send small something"), sub: `${naira(p.money * 0.02)}`, run: (q) => { const a = Math.max(0, q.money * 0.02); q.money -= a; q.family.happy = clamp(q.family.happy + 5); return T(`You send ${naira(a)}. They say 'thank you', but it sounds like 'is this all?'`, `You send ${naira(a)}. Dem say 'thank you' but e sound like 'na only this one?'`); } },
      { label: T("Block their number", "Block their number"), run: (q) => { q.family.happy = clamp(q.family.happy - 18); bump(q, "reputation", -4); bump(q, "stress", 4); return T("You go silent. By Sunday, the whole family WhatsApp group has heard about it.", "You go quiet. By Sunday, the whole family WhatsApp group don hear am."); } },
    ],
  },
  {
    id: "checkpoint",
    title: dual("Police checkpoint", "Police checkpoint"),
    weight: (p) => (adult(p) ? (p.traveled ? 7 : 2) : 0),
    text: () => T("A policeman flags you down at a checkpoint. \"Oga, where are your particulars? What have you brought for me?\"", "One policeman flag you down for checkpoint. \"Oga, where your particulars? Wetin you carry for me?\""),
    choices: (p) => [
      { label: T("Pay him something small", "Settle him small"), sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); return T("He smiles. 'Safe journey, sir.'", "He smile. 'Safe journey, sir.'"); } },
      { label: T("Argue your rights", "Argue your rights"), run: (q) => { if (chance(0.5)) { bump(q, "reputation", 2); return T("He backs down. You lose an hour but keep your pride.", "He back down. You lose one hour but you keep your pride."); } q.money -= I(q, 20_000); bump(q, "stress", 8); return T("He takes you to the station. After three hours you still pay ₦20K 'bail'.", "He carry you go station. After three hours you still pay ₦20K 'bail'."); } },
      { label: T("Speed off", "Zoom comot"), run: (q) => { if (chance(0.3)) { const r = enterPrison(q, 1); return T(`${r}They catch you down the road.`, `${r}Dem catch you down the road.`); } bump(q, "stress", 5); return T("You escape. Your heart is still pounding.", "You escape. Your heart still dey pound."); } },
    ],
  },
  {
    id: "scam_text",
    title: dual("SMS alert", "SMS alert"),
    weight: (p) => (p.age >= 16 ? 2.5 : 0),
    text: () => T("Unknown number: \"CONGRATULATIONS! Your BVN has won ₦5,000,000 in the Presidential Empowerment Draw. Send ₦25,000 to claim it.\"", "Unknown number: \"CONGRATULATIONS! Your BVN don win ₦5,000,000 for Presidential Empowerment Draw. Send ₦25,000 to claim am.\""),
    choices: (p) => [
      { label: T("Send the ₦25,000", "Send the ₦25,000"), disabled: p.money < I(p, 25_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 25_000); bump(q, "happiness", -6); return T("You have been scammed. The number is switched off. Lesson learnt.", "Dem scam you. The number don switch off. Lesson don learn."); } },
      { label: T("Ignore it", "Ignore am"), run: () => T("You see through it. Sharp guy.", "You see through am. Sharp guy.") },
      { label: T("Report to the bank", "Report am to the bank"), run: (q) => { bump(q, "smarts", 1); return T("The bank thanks you and does nothing.", "The bank thank you but dem do nothing."); } },
    ],
  },
  {
    id: "love",
    title: dual("Matters of the heart", "Heart matter"),
    weight: (p) => (adult(p) && !p.spouse && !p.flags.dating ? 3 : 0),
    init: (p) => {
      const g = p.gender === "male" ? "female" : "male";
      return { name: `${randomName(p.tribe, g)} ${pick(["Okoro", "Bello", "Adeola", "Nwachukwu", "Danjuma", "Ekpo"])}`, where: pick([T("at church", "for church"), T("at a friend's wedding", "for your friend wedding"), T("on Instagram", "for Instagram"), T("at the market", "for market"), T("in the danfo", "inside danfo")]), look: lookToStr(randomLook(g, { region: stateOf(p).region, religion: p.religion })) };
    },
    text: (_p, d) => T(`You meet ${d.name} ${d.where}. There is something there.`, `You meet ${d.name} ${d.where}. Something dey there o.`),
    choices: (p, d) => [
      { label: T("Shoot your shot", "Shoot your shot"), run: (q) => { if (chance(0.3 + q.stats.looks / 250 + q.stats.happiness / 400 + q.stats.reputation / 400)) { { const g2 = q.gender === "male" ? "female" : "male"; const pn = addPartner(q, { name: String(d.name), look: strToLook(String(d.look)) ?? randomLook(g2), gender: g2 }, "exclusive"); q.flags.dating = String(d.name); q.flags.datingLook = String(d.look); q.flags.datingNpc = pn.id; } bump(q, "happiness", 12); return T(`${d.name} said yes! You are officially dating.`, `${d.name} talk yes! You two don dey date officially.`); } bump(q, "happiness", -6); return T(`${d.name} left you on 'seen'. Ouch.`, `${d.name} leave you on 'seen'. Chai.`); } },
      { label: T("Spend on a fancy date", "Take am for fine date"), sub: naira(I(p, 80_000)), disabled: p.money < I(p, 80_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 80_000); if (chance(0.7)) { { const g2 = q.gender === "male" ? "female" : "male"; const pn = addPartner(q, { name: String(d.name), look: strToLook(String(d.look)) ?? randomLook(g2), gender: g2 }, "exclusive"); q.flags.dating = String(d.name); q.flags.datingLook = String(d.look); q.flags.datingNpc = pn.id; } bump(q, "happiness", 14); return T(`The jollof, the music, the vibes were perfect. ${d.name} is now your girlfriend/boyfriend.`, `The jollof, the music, the vibes sweet die. ${d.name} don become your girlfriend/boyfriend.`); } return T("You spent it all and got friend-zoned. Painful.", "You spend everything, dem friend-zone you. E pain."); } },
      { label: T("Not interested", "No interest"), run: () => T("You walk away. Maybe next time.", "You waka go. Maybe next time.") },
    ],
  },
  {
    id: "proposal",
    title: dual("Time to marry", "Time to marry o"),
    weight: (p) => (p.flags.dating && !p.spouse && p.age >= 20 ? 6 : 0),
    init: (p) => ({ bride: Math.round(I(p, rand(1_200_000, 5_000_000))) }),
    text: (p, d) => T(`You and ${p.flags.dating} are getting serious. Their family wants to meet yours. The bride price list has arrived: ${naira(Number(d.bride))} plus yam tubers, wrappers, and 'miscellaneous'.`, `You and ${p.flags.dating} don dey serious. Their family wan meet yours. The bride price list don land: ${naira(Number(d.bride))} plus yam tubers, wrappers, and 'miscellaneous'.`),
    choices: (p, d) => {
      const price = Number(d.bride);
      const finish = (q: Player, cost: number, family: number): string => { q.money -= cost; let sid = String(q.flags.datingNpc ?? ""); if (!sid || !q.npcs[sid]) { const g2 = q.gender === "male" ? "female" : "male"; sid = addPartner(q, { name: String(q.flags.dating), look: strToLook(String(q.flags.datingLook ?? "")) ?? randomLook(g2, { region: stateOf(q).region }), gender: g2 }, "engaged").id; } marry(q, sid); q.family.happy = clamp(q.family.happy + family); bump(q, "happiness", 15); return T(`You are married! ${q.spouse?.name ?? "Your partner"} is now your spouse.`, `You don marry! ${q.spouse?.name ?? "Your partner"} don become your spouse.`); };
      return [
        { label: T("Full traditional wedding", "Full traditional wedding"), sub: naira(price * 2), disabled: p.money < price * 2 ? T("Need more money", "Need more money") : false, run: (q) => finish(q, price * 2, 12) },
        { label: T("Church wedding and reception", "Church wedding and reception"), sub: naira(price * 1.2), disabled: p.money < price * 1.2 ? T("Need more money", "Need more money") : false, run: (q) => finish(q, price * 1.2, 9) },
        { label: T("Negotiate the price", "Reduce the price"), sub: naira(price * 0.6), run: (q) => { if (chance(0.6)) return finish(q, price * 0.6, 5); bump(q, "happiness", -8); delete q.flags.dating; return T("The negotiation turns into an argument. They call off the wedding.", "The negotiation turn quarrel. Dem cancel the wedding."); } },
        { label: T("Court wedding only", "Court wedding only"), sub: naira(I(p, 150_000)), run: (q) => finish(q, I(q, 150_000), -8) },
        { label: T("Not ready yet", "I never ready"), run: (q) => { bump(q, "stress", 3); return T("You asked for more time. They did not look happy.", "You ask for more time. Their face no show joy."); } },
      ];
    },
  },
  {
    id: "hospital",
    title: dual("You are sick", "You don sick"),
    weight: () => 0,
    text: () => T("Your body is hot, your joints ache, your head is pounding. Is it malaria? Typhoid? Or something worse?", "Body dey hot, joints dey ache, head dey pound. Na malaria? Typhoid? Or something worse?"),
    choices: (p) => [
      { label: T("Government hospital", "Government hospital"), sub: naira(I(p, 30_000)), run: (q) => { q.money -= I(q, 30_000); if (chance(0.7)) { bump(q, "health", 10); return T("You wait 6 hours but they treat you. Cheap, but exhausting.", "You wait 6 hours but dem treat you. E cheap, but e tire you."); } bump(q, "health", -6); return T("Doctors are on strike. You go home without treatment.", "Doctors dey strike. You go back house without treatment."); } },
      { label: T("Private hospital", "Private hospital"), sub: naira(I(p, 1_500_000)), disabled: p.money < I(p, 1_500_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 1_500_000); bump(q, "health", 18); return T("Air-conditioned ward. Fast service. It costs a lot, but you are well again.", "Air-conditioned ward. Fast service. E cost, but you don well again."); } },
      { label: T("Prayer house / herbal mixture", "Prayer house / agbo"), run: (q) => { if (chance(0.4)) { bump(q, "health", 8); return T("The herbs work. Or the malaria just left by itself.", "The agbo work. Or the malaria just comot by itself."); } bump(q, "health", -14); return T("It gets worse. You should have gone to hospital.", "E worse. You for go hospital."); } },
      { label: T("Fly abroad for treatment", "Fly abroad for treatment"), sub: naira(I(p, 25_000_000)), disabled: p.money < I(p, 25_000_000) ? T("Only for big people", "Na for big people") : false, run: (q) => { q.money -= I(q, 25_000_000); bump(q, "health", 30); return T("The best doctors in the world fixed you up. Wow.", "The best doctors for world fix you well-well. Wow."); } },
    ],
  },
  {
    id: "jamb",
    title: dual("JAMB season", "JAMB season"),
    weight: () => 0,
    text: () => T("You have finished secondary school! JAMB day has arrived and the whole street is watching you. Time to chase admission.", "You don finish secondary school! JAMB day don reach and the whole street dey look you. Time to chase admission."),
    choices: (p) => [
      { label: T("Write it honestly", "Write am clean"), run: (q) => { const score = Math.round(clamp(110 + q.stats.smarts * 1.7 + rand(-25, 25), 100, 380)); return { text: T(`Your score: ${score}.`, `Your score na ${score}.`), spawn: [evt("admission", { score })] }; } },
      { label: T("Buy 'expo' from a centre", "Buy 'expo' for centre"), sub: naira(I(p, 30_000)), disabled: p.money < I(p, 30_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 30_000); if (chance(0.3)) { bump(q, "reputation", -15); q.edu = "secondary"; return T("You are caught. JAMB bans you. You must find another road.", "Dem catch you. JAMB ban you. Go find another road."); } const score = randInt(240, 320); return { text: T(`The 'expo' worked. Score: ${score}!`, `The 'expo' work. Score: ${score}!`), spawn: [evt("admission", { score })] }; } },
      { label: T("Skip school, go hustle", "Skip school, go hustle"), run: (q) => { q.edu = "secondary"; return T("Certificates are not everything. Time to make money.", "Certificate no be everything. Na time to make money."); } },
    ],
  },
  {
    id: "admission",
    title: dual("Admission list", "Admission list"),
    weight: () => 0,
    text: (_p, d) => T(`Your JAMB score is ${d.score}. Cut-off marks are everything. Where will you go?`, `Your JAMB score na ${d.score}. Cut-off mark na everything. Where you wan go?`),
    choices: (p, d) => [
      { label: T("University", "University"), sub: T("4 years", "4 years"), disabled: Number(d.score) < 200 ? T("Score too low", "Score too low") : false, run: (q) => { startTertiary(q, "university"); q.edu = "secondary"; return { text: T("You got into university! Welcome to campus life.", "You enter university! Welcome to campus life."), spawn: [evt("course")] }; } },
      { label: T("Polytechnic", "Polytechnic"), sub: T("3 years", "3 years"), disabled: Number(d.score) < 150 ? T("Score too low", "Score too low") : false, run: (q) => { startTertiary(q, "polytechnic"); q.course = "Engineering"; return T("You enrolled at a polytechnic. Practical skills, real work.", "You register for polytechnic. Practical skills, real work."); } },
      { label: T("Vocational training", "Learn a trade"), sub: T("1-2 years, learn a trade", "1-2 years, learn work with hand"), run: (q) => { q.edu = "secondary"; return { text: T("You choose to learn a trade instead of a degree.", "You choose to learn trade instead of degree."), spawn: [evt("trade_choice")] }; } },
      { label: T("Retake JAMB next year", "Write JAMB again next year"), run: (q) => { bump(q, "stress", 6); q.edu = "secondary"; return T("You will try again.", "You go try again."); } },
      { label: T("Skip school and hustle", "Skip school, go hustle"), run: (q) => { q.edu = "secondary"; return T("School is not for everyone.", "School no be for everybody."); } },
    ],
  },
  {
    id: "course",
    title: dual("Choose a course", "Pick your course"),
    weight: () => 0,
    text: () => T("What are you studying? Your parents already have an opinion (it is Medicine, Law or Engineering).", "Wetin you wan read? Your parents don already get opinion (na Medicine, Law or Engineering)."),
    choices: () => COURSES.map<Choice>((c) => ({
      label: c,
      run: (q) => {
        q.course = c;
        const parentsHappy = ["Medicine", "Law", "Engineering"].includes(c);
        q.family.happy = clamp(q.family.happy + (parentsHappy ? 8 : -5));
        return parentsHappy ? T(`You chose ${c}. Your parents are already telling the neighbours.`, `You choose ${c}. Your parents don start to tell the neighbours.`) : T(`You chose ${c}. Your mother is disappointed but supportive.`, `You choose ${c}. Your mama no happy, but she dey support you.`);
      },
    })),
  },
  {
    id: "nysc",
    title: dual("NYSC posting", "NYSC posting"),
    weight: () => 0,
    init: () => ({ posted: pick(TRAVEL_STATES.filter((s) => s.id !== "abuja" && s.id !== "lagos")).id }),
    text: (_p, d) => T(`You are a graduate! NYSC has posted you to ${STATE_BY_ID[String(d.posted)].name} State for national service.`, `You don graduate! NYSC don post you go ${STATE_BY_ID[String(d.posted)].name} State for national service.`),
    choices: (p, d) => [
      { label: T("Go and serve", "Go serve"), run: (q) => { const note = moveTo(q, String(d.posted)); bump(q, "connections", 6); bump(q, "smarts", 2); q.flags.nysc = true; q.money += I(q, 77_000); return T(`Camp, khaki, 'Ever Ready', and a year in ${STATE_BY_ID[String(d.posted)].name}. You made friends.${note}`, `Camp, khaki, 'Ever Ready', and one year for ${STATE_BY_ID[String(d.posted)].name}. You make friends.${note}`); } },
      { label: T("Work your posting to Abuja", "Work your posting go Abuja"), sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 150_000); q.flags.nysc = true; const note = moveTo(q, "abuja"); bump(q, "connections", 10); return T(`A 'contact' at the NYSC secretariat arranged it. You now serve in Abuja.${note}`, `One 'contact' for NYSC secretariat arrange am. You don dey serve for Abuja.${note}`); } },
      { label: T("Skip it entirely", "Skip am totally"), run: (q) => { q.flags.nysc = true; bump(q, "reputation", -8); return T("No certificate for you, but you saved a year.", "You no go get certificate, but you save one year."); } },
    ],
  },
  {
    id: "fees_trouble",
    title: dual("School fees trouble", "School fees wahala"),
    weight: (p) => (p.school?.stage === "tertiary" && p.classAtBirth === "struggling" ? 4 : 0),
    text: () => T("School fees are due and your family cannot pay on time. The bursar says 'no fees, no exam'.", "School fees don reach and your family no fit pay on time. Bursar say 'no fees, no exam'."),
    choices: () => [
      { label: T("Hustle on weekends", "Hustle for weekend"), run: (q) => { bump(q, "stress", 10); bump(q, "health", -3); return T("You sell recharge cards and tutor juniors. You pay, just barely.", "You sell recharge card and teach juniors. You pay am, just about."); } },
      { label: T("Borrow from a loan app", "Borrow from loan app"), run: (q) => { q.debt += I(q, 300_000); bump(q, "stress", 12); return T("The fees are paid. The interest will follow you for years.", "Fees don pay. The interest go follow you for years."); } },
      { label: T("Defer a year", "Defer one year"), run: (q) => { if (q.school) q.school.yearsLeft += 1; return T("You sat out a year to work and save.", "You stay out one year to work and save."); } },
    ],
  },
  {
    id: "cult",
    title: dual("Campus brotherhood", "Campus brotherhood"),
    weight: (p) => (p.school?.stage === "tertiary" && p.school.type !== "vocational" ? 2 : 0),
    text: () => T("A senior brother pulls you aside near the hostel. \"You are sharp. Join us. We protect our own.\"", "One senior brother pull you aside near hostel. \"You sharp. Join us. We dey protect our own.\""),
    choices: () => [
      { label: T("Join the brotherhood", "Join the brotherhood"), run: (q) => { bump(q, "connections", 12); if (chance(0.35)) { q.flags.cult = true; bump(q, "reputation", -10); bump(q, "health", -15); return T("A rival clash leaves you injured, but you are connected for life.", "Rival clash leave you injure, but you don connect for life."); } return T("You are in. The connections are real.", "You don enter. The connections real."); } },
      { label: T("Politely decline", "Decline with respect"), run: (q) => { bump(q, "reputation", 2); return T("You keep a low profile and you stay safe.", "You low-key, and your head still dey your neck."); } },
    ],
  },
  {
    id: "robbery",
    title: dual("Armed robbery!", "Armed robbery!"),
    weight: (p) => (adult(p) ? 0.6 + stateOf(p).risk * 0.5 : 0),
    text: () => T("Midnight. Armed robbers jump your fence and enter your sitting room. \"Where is the money?!\"", "Midnight. Armed robbers jump your fence enter sitting room. \"Where the money dey?!\""),
    choices: () => [
      { label: T("Hand over everything", "Give dem everything"), run: (q) => { const lost = Math.max(0, q.money * rand(0.1, 0.3)); q.money -= lost; bump(q, "stress", 14); return T(`They left with ${naira(lost)}, your phones and your generator. You are alive.`, `Dem carry ${naira(lost)}, your phones and your generator go. You dey alive.`); } },
      { label: T("Fight back", "Fight back"), run: (q) => { if (chance(0.45)) { bump(q, "reputation", 10); return T("You raise the alarm; neighbours come; the robbers run. You are a hero now.", "You raise alarm; neighbours come; robbers run. You don turn hero."); } const lost = Math.max(0, q.money * 0.3); q.money -= lost; const r = developCondition(q, "gunshot"); return { text: T(`They shot you and took ${naira(lost)}. You are bleeding badly.`, `Dem shoot you and carry ${naira(lost)}. Blood dey comot well-well.`), spawn: r.pending }; } },
    ],
  },
  {
    id: "bet",
    title: dual("Betting slip", "Betting slip"),
    weight: (p) => (adult(p) && p.age < 50 && p.money > I(p, 100_000) ? 2.5 : 0),
    text: () => T("Your guy says 'Arsenal will win, 7 odds, sure bet'. The app is open. The odds look sweet.", "Your guy talk say 'Arsenal go win, 7 odds, sure bet'. The app dey open. The odds dey sweet you."),
    choices: (p) => [
      { label: T("Stake small", "Stake small"), sub: naira(p.money * 0.03), run: (q) => { const a = q.money * 0.03; q.money -= a; if (chance(0.2 + luckBonus(q) / 2)) { q.money += a * 7; return T(`It landed! You win ${naira(a * 7)}!`, `E enter! You win ${naira(a * 7)}!`); } return T(`Lost ${naira(a)}. 'It was almost', you tell yourself.`, `You lose ${naira(a)}. 'E nearly enter', na wetin you tell yourself.`); } },
      { label: T("Go all in (30%)", "Go all in (30%)"), sub: naira(p.money * 0.3), run: (q) => { const a = q.money * 0.3; q.money -= a; if (chance(0.15 + luckBonus(q) / 2)) { q.money += a * 8; return T(`ALL IN WON. ${naira(a * 8)} in the bank. Legend.`, `ALL IN ENTER. ${naira(a * 8)} dey bank. Legend.`); } bump(q, "stress", 10); return T(`The betting app swallowed ${naira(a)}. You swear 'never again'.`, `Betting app swallow ${naira(a)}. You swear 'never again'.`); } },
      { label: T("Delete the app", "Delete the app"), run: (q) => { bump(q, "smarts", 1); return T("You saved yourself today.", "You save yourself today."); } },
    ],
  },
  {
    id: "ponzi",
    title: dual("'Guaranteed' investment", "'Guaranteed' investment"),
    weight: (p) => (adult(p) && p.money > I(p, 2_000_000) ? 2 : 0),
    text: () => T("Your friend shows you a screenshot of an online platform. \"Invest ₦100K, get ₦200K in 30 days! Everyone is making it!\"", "Your friend show you screenshot of one online platform. \"Invest ₦100K, get ₦200K in 30 days! Everybody dey make am!\""),
    choices: (p) => [
      { label: T("Invest 20% of your cash", "Put 20% of your cash"), sub: naira(p.money * 0.2), run: (q) => { const a = q.money * 0.2; q.money -= a; if (chance(0.3 + luckBonus(q))) { q.money += a * 2; return T(`You double your money! You cash out in time. ${naira(a * 2)} back.`, `You double your money! You cash out in time. ${naira(a * 2)} don return.`); } bump(q, "stress", 12); return T(`The platform crashes overnight. ${naira(a)} gone. The founder is in Dubai.`, `The platform crash overnight. ${naira(a)} don go. The founder don reach Dubai.`); } },
      { label: T("Run away from it", "Run comot"), run: (q) => { bump(q, "smarts", 1); return T("If it sounds too good to be true... You did not touch it.", "If e too sweet to be true... You no touch am."); } },
    ],
  },
  {
    id: "ajo",
    title: dual("Ajo / Esusu savings", "Ajo / Esusu savings"),
    weight: (p) => (adult(p) && p.money > I(p, 300_000) ? 2 : 0),
    text: () => T("Market women invite you to join their monthly ajo. The collector is respected, but it all runs on trust.", "Market women invite you join their monthly ajo. The collector get respect, but everything na trust."),
    choices: (p) => [
      { label: T("Join the circle", "Join the ajo"), sub: naira(Math.max(I(p, 300_000), p.money * 0.1)), run: (q) => { const a = Math.max(I(q, 300_000), q.money * 0.1); q.money -= a; if (chance(0.78)) { q.money += a * 1.25; bump(q, "connections", 2); return T(`Your turn comes, and you collect ${naira(a * 1.25)}. Trust is a currency.`, `Your turn reach, and you collect ${naira(a * 1.25)}. Trust na currency.`); } bump(q, "stress", 8); return T("The collector vanishes with everybody's money. They report to the police. Nothing happens.", "Collector vanish with everybody money. Dem report to police. Nothing happen."); } },
      { label: T("Pass", "Pass"), run: () => T("You prefer your own account.", "You prefer your own account.") },
    ],
  },
  {
    id: "yahoo_invite",
    title: dual("Easy money", "Easy money"),
    weight: (p) => (p.age >= 17 && p.age <= 32 && !p.job && stateOf(p).opp >= 2 ? 3 : 0),
    text: () => T("Your friend pulls up in a new car. \"I earn more than your boss. Join me, I will teach you everything. Fast money.\"", "Your friend pull up with new car. \"I dey make pass your oga. Join me, I go teach you everything. Fast money.\""),
    choices: () => [
      { label: T("Learn the game", "Learn the game"), run: (q) => { q.job = { id: "yahoo", rank: 0, years: 0 }; bump(q, "reputation", -6); return T("You have become a 'Yahoo boy'. EFCC is real, don't forget.", "You don become 'Yahoo boy'. EFCC dey o, no forget am."); } },
      { label: T("No way", "No way"), run: (q) => { bump(q, "reputation", 2); return T("Your conscience is clear.", "Your conscience clear."); } },
    ],
  },
  {
    id: "gang_invite",
    title: dual("Dangerous offer", "Dangerous offer"),
    weight: (p) => (p.age >= 18 && p.age <= 36 && stateOf(p).risk >= 5 && p.money < I(p, 500_000) && p.job?.id !== "kidnapper" ? 1.2 : 0),
    text: () => T("A man from the forest area offers you work: \"Just be our eyes on the highway. We pay well.\" You know what it means.", "One man from the forest area offer you work: \"Just be our eye for highway. We dey pay well.\" You sabi wetin e mean."),
    choices: () => [
      { label: T("Join the gang", "Join the gang"), run: (q) => { q.job = { id: "kidnapper", rank: 0, years: 0 }; bump(q, "reputation", -30); return T("You have joined a kidnapping gang. Sleep will never be easy again.", "You don join kidnapping gang. Sleep no go easy again."); } },
      { label: T("Refuse and leave", "Refuse, comot"), run: (q) => { bump(q, "stress", 6); return T("You refuse and walk away quietly. Wise.", "You refuse and waka quietly. Wise."); } },
    ],
  },
  {
    id: "gang_op",
    title: dual("Gang operation", "Gang operation"),
    weight: (p) => (p.job?.id === "kidnapper" ? 14 : 0),
    text: (p) => T(`The commander sends you to the ${stateOf(p).name} highway. "Pick a target. Choose well. The ransom must come in this week."`, `The commander send you go ${stateOf(p).name} highway. "Pick target. Choose well. Ransom must enter this week."`),
    choices: () => [
      { label: T("Soft target: a trader", "Soft target: one trader"), sub: T("Low ransom, low risk", "Small ransom, small risk"), run: (q) => { if (chance(0.15)) { const r = enterPrison(q, randInt(3, 8)); return T(`${r}The target's family called the police.`, `${r}The target family call police.`); } const cut = Math.round(I(q, rand(1_500_000, 4_000_000))); q.money += cut; q.loot += cut; return T(`The ransom is paid. Your share: ${naira(cut)}.`, `Ransom don pay. Your share na ${naira(cut)}.`); } },
      { label: T("Big target: a rich man's son", "Big target: rich man pikin"), sub: T("Huge ransom, high risk", "Big ransom, high risk"), run: (q) => { if (chance(0.45)) { if (chance(0.5)) { q.alive = false; q.cause = T("Killed in a military raid on a kidnappers' camp", "Die for military raid for kidnappers camp"); return T("Soldiers surrounded the camp at dawn. There was no escape.", "Soldiers surround the camp for dawn. No way to escape."); } const r = enterPrison(q, randInt(8, 18)); return T(`${r}Soldiers caught the whole gang.`, `${r}Soldiers catch the whole gang.`); } const cut = Math.round(I(q, rand(15_000_000, 60_000_000))); q.money += cut; q.loot += cut; return T(`The family pays big. Your share: ${naira(cut)}. Don't spend it all in one place.`, `The family pay big. Your share na ${naira(cut)}. No spend am all for one place.`); } },
      { label: T("Quit the gang", "Quit the gang"), run: (q) => { if (chance(0.4)) { q.alive = false; q.cause = T("Killed by former gang members", "Former gang members kill am"); return T("You tried to quit. They found you.", "You try to quit. Dem find you."); } q.job = null; bump(q, "stress", 12); return T("You slipped away in the night and left the area. For now, you're free.", "You sneak comot for night and leave the area. For now, you free."); } },
    ],
  },
  {
    id: "yahoo_op",
    title: dual("The big hit", "The big hit"),
    weight: (p) => (p.job?.id === "yahoo" ? 8 : 0),
    text: () => T("A 'client' abroad wants to send money. This could be the big one... or the last one.", "One 'client' abroad wan send money. This one fit be the big one... or the last one."),
    choices: () => [
      { label: T("Push for the big payout", "Push for the big money"), run: (q) => { if (chance(0.3)) { const r = enterPrison(q, randInt(2, 7)); return T(`${r}EFCC raid your apartment at 5 a.m.`, `${r}EFCC raid your apartment 5 a.m.`); } const g = Math.round(I(q, rand(8_000_000, 40_000_000))); q.money += g; q.loot += g; return T(`You collect ${naira(g)}. Flash that new car (slowly).`, `You collect ${naira(g)}. Flash that new car (small small).`); } },
      { label: T("Quit and go legit", "Quit, go legit"), run: (q) => { q.job = null; bump(q, "stress", -5); return T("You deleted the accounts and started over.", "You delete the accounts and start afresh."); } },
    ],
  },
  {
    id: "arrested",
    title: dual("Arrested!", "Dem arrest you!"),
    weight: () => 0,
    init: (p) => ({ years: randInt(2, 6), bribe: Math.round(I(p, rand(2_000_000, 8_000_000))) }),
    text: (_p, d) => T(`You are in a cell facing ${d.years} years. A lawyer says there is 'another way'.`, `You dey cell, ${d.years} years dey wait you. One lawyer say 'another way' dey.`),
    choices: (p, d) => [
      { label: T("'Settle' with the officers", "'Settle' the officers"), sub: naira(Number(d.bribe)), disabled: p.money < Number(d.bribe) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= Number(d.bribe); if (chance(0.55)) return T("The case vanishes. Naija.", "The case disappear. Naija."); return ((__r0) => T(`${__r0}You were still jailed after paying.`, `${__r0}Dem still jail you after you don pay.`))(enterPrison(q, Number(d.years))); } },
      { label: T("Hire a good lawyer", "Hire better lawyer"), sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 3_000_000); if (chance(0.5)) return T("Your lawyer found a loophole. You walked free.", "Your lawyer find loophole. You waka go free."); return enterPrison(q, Math.max(1, Number(d.years) - 2)); } },
      { label: T("Accept your fate", "Accept your fate"), run: (q) => enterPrison(q, Number(d.years)) },
    ],
  },
  {
    id: "prison_bribe",
    title: dual("Life in Kuje", "Kuje life"),
    weight: (p) => (p.prison > 1 ? 5 : 0),
    text: () => T("Life in Kuje is hard: overcrowded, hot, bad food. A warder says for 'a little something' he can make your stay easier.", "Life for Kuje hard: overcrowded, hot, food no good. One warder say for 'small something' e fit make your stay easier."),
    choices: (p) => [
      { label: T("Pay the warder", "Pay the warder"), sub: naira(I(p, 1_000_000)), disabled: p.money < I(p, 1_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 1_000_000); q.prison = Math.max(0, q.prison - 1); return T("He pulled some strings. You'll be out a year sooner.", "He pull some strings. You go comot one year earlier."); } },
      { label: T("Keep your head down", "Keep low"), run: (q) => { bump(q, "health", -4); bump(q, "smarts", 2); return T("You read, you waited. You survived another year.", "You read, you wait. You survive another year."); } },
    ],
  },
  {
    id: "tenant",
    title: dual("Tenant trouble", "Tenant wahala"),
    weight: (p) => (p.houses.some((h) => h.use === "rent") ? 4 : 0),
    text: () => T("One of your tenants has not paid for months. He says 'Sir, business is slow, just give me a little time'.", "One of your tenants never pay for months. He say 'Sir, business dey dull, just give me small time'."),
    choices: (p) => [
      { label: T("Be merciful", "Have mercy"), run: (q) => { bump(q, "reputation", 4); q.money -= I(q, 200_000); return T("You forgive the debt. People call you a good landlord.", "You forgive the debt. People call you good landlord."); } },
      { label: T("Serve a quit notice", "Give am quit notice"), run: (q) => { bump(q, "reputation", -3); const rented = q.houses.find((h) => h.use === "rent"); if (rented) rented.use = "empty"; return T("He moves out. The house stands empty for now.", "He move out. The house empty for now."); } },
      { label: T("Send area boys to 'talk'", "Send area boys go 'talk'"), sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); bump(q, "reputation", -10); return T("The rent is paid the next day. People in the area talk, though.", "Rent enter next day. But people for area dey talk."); } },
    ],
  },
  {
    id: "levy",
    title: dual("Market levy", "Market levy"),
    weight: (p) => (isSelfEmployed(p) ? 3.5 : 0),
    text: () => T("The market association chairman wants a 'development levy'. Task force men are also walking around.", "Market association chairman want 'development levy'. Task force men sef dey waka around."),
    choices: (p) => [
      { label: T("Pay up", "Pay am"), sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); bump(q, "connections", 1); return T("No trouble this year. For now.", "No wahala this year. For now."); } },
      { label: T("Refuse", "Refuse"), run: (q) => { if (chance(0.5)) { q.money -= I(q, 350_000); return T("Task force seizes your goods. You pay a ₦350K fine.", "Task force seize your goods. You pay ₦350K fine."); } return T("They leave you alone. This time.", "Dem leave you alone. This time."); } },
    ],
  },
  {
    id: "job_plug",
    title: dual("A connection", "One plug"),
    weight: (p) => (p.age >= 20 && !p.job && !p.school && p.stats.connections >= 20 ? 6 : 0),
    text: () => T("Your uncle says: \"I have spoken to someone for you. There is a vacancy and the oga says bring your CV on Monday.\"", "Your uncle talk: \"I don talk to somebody for you. Vacancy dey and oga say bring your CV Monday.\""),
    choices: () => [
      { label: T("Take it", "Take am"), run: (q) => { const options = eligibleJobs(q).filter((j) => j.group === "formal" || j.id === "rideapp" || j.id === "attendant"); if (options.length === 0) return T("You went for the interview but didn't have the qualifications.", "You go for the interview but your qualifications no reach."); const best = options[randInt(0, Math.min(options.length - 1, 3))]; q.job = { id: best.id, rank: 0, years: 0 }; return T(`You land the job: ${best.title}! 'Who you know' at work again.`, `You land the job: ${best.title}! Na 'who you know' work again.`); } },
      { label: T("Decline politely", "Decline with respect"), run: () => T("Thanks, but no thanks.", "Thank you, but I no fit.") },
    ],
  },
  {
    id: "church_seed",
    title: dual("Sow a seed", "Sow seed"),
    weight: (p) => (adult(p) && p.money > I(p, 500_000) ? 2 : 0),
    text: (p) => T(`Sunday service. The ${p.religion === "Muslim" ? "Imam" : "pastor"} says: "Whoever gives the biggest seed today will see the miracle by morning."`, `Sunday service. The ${p.religion === "Muslim" ? "Imam" : "pastor"} talk say: "Anybody wey give the biggest seed today go see miracle by morning."`),
    choices: (p) => [
      { label: T("Give a big offering", "Give big offering"), sub: naira(p.money * 0.05), run: (q) => { const a = q.money * 0.05; q.money -= a; bump(q, "reputation", 6); bump(q, "happiness", 4); q.stats.connections = clamp(q.stats.connections + 2); return T(`You gave ${naira(a)} and got a loud 'Amen'.`, `You give ${naira(a)} and receive loud 'Amen'.`); } },
      { label: T("Give small", "Give small"), sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); return T("Small money, small blessing.", "Small money, small blessing."); } },
      { label: T("Keep your money", "Keep your money"), run: (q) => { bump(q, "reputation", -2); return T("You kept your seed for yourself.", "You keep your seed for yourself."); } },
    ],
  },
  {
    id: "funeral",
    title: dual("Burial arrangements", "Burial arrangement"),
    weight: () => 0,
    text: () => T("Your parent has died. In Naija, burial is a big matter: relatives expect a proper send-off. Everybody is watching what you will do.", "Your parent don die. For Naija, burial na big matter: relatives expect proper send-off. Everybody dey watch wetin you go do."),
    choices: (p) => [
      { label: T("Grand burial", "Grand burial"), sub: naira(I(p, 6_000_000)), disabled: p.money < I(p, 6_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 6_000_000); bump(q, "reputation", 12); bump(q, "connections", 5); q.family.happy = clamp(q.family.happy + 12); return T("One week of mourning, a live band, 500 people. The village will talk about it for years.", "One week mourning, live band, 500 people. The village go dey talk about am for years."); } },
      { label: T("Decent burial", "Decent burial"), sub: naira(I(p, 1_500_000)), run: (q) => { q.money -= I(q, 1_500_000); bump(q, "reputation", 3); return T("A decent and respectful burial.", "Decent burial wey get respect."); } },
      { label: T("Simple, quiet burial", "Simple, quiet burial"), run: (q) => { bump(q, "reputation", -6); q.family.happy = clamp(q.family.happy - 12); return T("Some relatives grumble that it was too small.", "Some relatives dey grumble say e too small."); } },
    ],
  },
  {
    id: "owambe_invite",
    title: dual("Owambe weekend", "Owambe weekend"),
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 2 : 0),
    text: () => T("Your friend's wedding is this Saturday. The aso-ebi money is due and the owambe will be loud.", "Your friend wedding dey this Saturday. Aso-ebi money don due and the owambe go loud."),
    choices: (p) => [
      { label: T("Buy the aso-ebi and spray", "Buy aso-ebi, go spray"), sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); bump(q, "happiness", 8); bump(q, "connections", 3); return T("You dance all night and meet useful people.", "You dance whole night and meet useful people."); } },
      { label: T("Stay home", "Stay house"), run: (q) => { bump(q, "happiness", -2); return T("You save money but you miss the jollof.", "You save money but you miss the jollof."); } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Automatic events (no decisions)
// ---------------------------------------------------------------------------
export const AUTOS: AutoDef[] = [
  { id: "nepa", weight: (p) => (p.age >= 6 ? 4 : 0), run: (p) => { if (p.flags.solar) return T("NEPA takes the light again, but your solar powers the whole house. Neighbours envy you.", "NEPA take light again, but your solar carry the whole house. Neighbours dey envy you."); p.money -= I(p, 80_000) * (p.age >= 18 ? 1 : 0); bump(p, "stress", 4); return T("NEPA takes the light for three weeks. You are buying fuel for the generator. Ouch.", "NEPA take light for three weeks. You dey buy fuel for generator. Chai."); } },
  { id: "fuel", weight: (p) => (p.age >= 16 ? 3 : 0), run: (p) => { bump(p, "stress", 3); return T("Fuel scarcity! Queues at every filling station. One litre now costs like a small bag of rice.", "Fuel scarcity! Queue dey every filling station. One litre now cost like small rice."); } },
  { id: "subsidy", weight: (p) => (p.age >= 10 ? 1.5 : 0), run: (p) => { p.index *= 1.12; bump(p, "stress", 4); return T("Government announces fuel subsidy removal. Transport fares double overnight.", "Government announce fuel subsidy removal. Transport fare double overnight."); } },
  { id: "naira", weight: (p) => (p.age >= 10 ? 1.5 : 0), run: (p) => { p.index *= 1.1; return T("The naira crashes against the dollar. Market prices jump again.", "Naira crash against dollar. Market price jump again."); } },
  { id: "harmattan", weight: () => 3, run: (p) => { bump(p, "health", -4); return T("Harmattan season: dry throat, cracked lips, dust everywhere.", "Harmattan season: dry throat, cracked lips, dust dey everywhere."); } },
  { id: "asuu", weight: (p) => (p.school?.stage === "tertiary" && p.school.type === "university" ? 5 : 0), run: (p) => { if (p.school && chance(0.4)) { p.school.yearsLeft += 1; return T("ASUU declares a strike. School shuts for months; your graduation is delayed by one year.", "ASUU declare strike. School shut for months; your graduation delay by one year."); } bump(p, "stress", 4); return T("ASUU threatens a strike but calls it off after emergency talks.", "ASUU threaten strike but dem call am off after emergency talks."); } },
  { id: "traffic", weight: (p) => (p.age >= 18 && stateOf(p).opp >= 8 ? 3 : 0), run: (p) => { bump(p, "stress", 5); return T("You spend 4 hours in Lagos/Abuja go-slow. Traffic is a lifestyle.", "You spend 4 hours for Lagos/Abuja go-slow. Traffic na lifestyle."); } },
  { id: "kindness", weight: () => 2, run: (p) => { bump(p, "happiness", 6); bump(p, "reputation", 1); return T("A stranger returns your lost phone. There is still hope in this country.", "One stranger return your lost phone. Hope still dey this country."); } },
  { id: "baby", weight: (p) => (p.spouse && p.age >= 21 && p.age <= 44 && p.kids.length < 5 ? 6 : 0), run: (p) => {
    const gender = chance(0.5) ? "male" : "female";
    const name = randomName(p.tribe, gender);
    const dadLook = p.gender === "male" ? p.look : p.spouse?.look; const momLook = p.gender === "female" ? p.look : p.spouse?.look;
    p.kids.push({ name, age: 0, gender, look: kidLook(dadLook, momLook, gender) });
    bump(p, "happiness", 12);
    p.money -= I(p, 250_000);
    return T(`${p.spouse?.name} gave birth to ${name}! The naming ceremony drew half the street.`, `${p.spouse?.name} born ${name}! The naming ceremony pull half the street.`);
  } },
  { id: "viral", weight: (p) => (p.job && isSelfEmployed(p) ? 1.0 * (0.4 + p.luck / 80) : p.job?.id === "creator" || p.job?.id === "singer" || p.job?.id === "actor" ? 1.6 * (0.4 + p.luck / 80) : 0), run: (p) => {
    const j = jobDef(p);
    if (j && p.job && p.job.rank < j.ladder.length - 1) { p.job.rank += 1; p.flags.viral = (Number(p.flags.viral) || 0) + 1; return T(`Your ${j.group === "creative" ? "post" : "business"} goes VIRAL! You move up to: ${j.ladder[p.job.rank].title}.`, `Your ${j.group === "creative" ? "post" : "business"} go VIRAL! You move up to: ${j.ladder[p.job.rank].title}.`); }
    bump(p, "reputation", 3); return T("Your content goes viral again. People recognise you everywhere.", "Your stuff go viral again. People dey recognise you everywhere.");
  } },
  { id: "okada", weight: (p) => (["keke", "conductor", "rideapp"].includes(p.job?.id ?? "") ? 4 : 0), run: (p) => { p.flags.spawnCondition = chance(0.5) ? "fracture" : "sprain"; return T("A trailer hits your vehicle on the highway. You are injured.", "Trailer hit your vehicle for highway. You don injure."); } },
  { id: "rain", weight: (p) => (["akara", "corn", "suya", "purewater"].includes(p.job?.id ?? "") ? 3.5 : 0), run: (p) => { p.money -= I(p, 60_000); return T("Heavy rain washes away your sales for a week.", "Heavy rain wash away your sales for one week."); } },
  { id: "layoff", weight: (p) => (p.job && jobDef(p)?.group === "formal" && p.job.years > 1 ? 1.2 : 0), run: (p) => { p.job = null; bump(p, "stress", 12); return T("The company is downsizing. You are sacked. Welcome to the job market.", "Company dey downsize. Dem sack you. Welcome to the job market."); } },
  { id: "roadside", weight: (p) => (p.traveled ? 3 : 0), run: (p) => { bump(p, "stress", 4); return T("Your bus breaks down halfway. You eat suya by the roadside and make two new friends.", "Your bus break down halfway. You chop suya for roadside and make two new friends."); } },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const AUTO_BY_ID: Record<string, AutoDef> = Object.fromEntries(AUTOS.map((a) => [a.id, a]));