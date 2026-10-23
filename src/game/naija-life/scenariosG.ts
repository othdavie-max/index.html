import type { Scn } from "./scenarios";
import { petsOf } from "./bitlife";

/** Festive seasons and holidays, plus pet moments. */
export const SCN_SEASON: Scn[] = [
  { id: "christmas_village", title: ["Christmas in the village", "Christmas for village"], ages: [12, 80], w: 1.8,
    text: ["It is December and the whole family is travelling 'home'. The bus fare has doubled, the roads are jammed, and your aunties want to know when you are getting married.", "December reach and the whole family dey travel 'go home'. Bus fare don double, road jam, and your aunties wan know when you go marry."],
    choices: [
      { label: ["Go home with gifts", "Go home with gifts"], cost: 180_000, fx: { h: 6, fam: 8, r: 2, s: 3 }, text: ["Jollof, goat meat and endless questions. You are exhausted and glad.", "Jollof, goat meat and endless question. You tire and you glad."] },
      { label: ["Go home with only your bag", "Go home with only your bag"], cost: 60_000, fx: { h: 3, fam: 3, s: 4 }, text: ["Nobody says anything, but everybody notices.", "Nobody talk anything, but everybody notice."] },
      { label: ["Stay in town and send money", "Stay town send money"], cost: 40_000, fx: { h: -3, fam: -6 }, text: ["The family group chat is cold for a week.", "Family group chat cold for one week."] },
    ] },
  { id: "detty_december", title: ["Detty December", "Detty December"], ages: [18, 40], w: 1.4,
    text: ["Lagos is packed: concerts, beach parties and people flying in from everywhere. Your friends are going all out.", "Lagos pack: concerts, beach parties and people dey fly in from everywhere. Your friends dey go all out."],
    choices: [
      { label: ["Go to the big concert", "Go the big concert"], cost: 250_000, fx: { h: 9, c: 3, s: -3 }, text: ["Best night of the year. Your voice is gone for three days.", "Best night of the year. Your voice don go for three days."] },
      { label: ["Do one party, keep your money", "Do one party, keep money"], cost: 60_000, fx: { h: 4, c: 1 }, text: ["Good music, good company, and a quiet bank account intact.", "Good music, good people, and your account no scatter."] },
      { label: ["Stay home and rest", "Stay house rest"], fx: { h: 1, s: -4 }, text: ["Peace and quiet while the city burns.", "Peace and quiet while the city dey burn."] },
    ] },
  { id: "eid_sallah", title: ["Sallah celebration", "Sallah celebration"], ages: [18, 80], w: 1.6, when: (p) => p.religion === "Muslim",
    text: ["Eid-el-Kabir is near. The family is buying a ram, and the price has jumped again.", "Eid-el-Kabir near. Family dey buy ram, and price don jump again."],
    choices: [
      { label: ["Buy a big ram", "Buy big ram"], cost: 300_000, fx: { h: 7, fam: 7, r: 3 }, text: ["The neighbourhood smells of suya and joy. You share generously.", "The area smell suya and joy. You share well well."] },
      { label: ["Join the family in a shared ram", "Join family for shared ram"], cost: 90_000, fx: { h: 4, fam: 4 }, text: ["Everyone gets their share, and nobody argues. Almost.", "Everybody get him share, and nobody argue. Almost."] },
      { label: ["Visit and bring gifts only", "Visit and bring gifts only"], cost: 30_000, fx: { h: 2, fam: 1 }, text: ["A quiet, kind day.", "Quiet, kind day."] },
    ] },
  { id: "ramadan_fast", title: ["Ramadan", "Ramadan"], ages: [12, 80], w: 1.6, when: (p) => p.religion === "Muslim",
    text: ["Ramadan has started. Fasting from dawn to dusk, and everyone at work is a little short-tempered.", "Ramadan don start. Fasting from dawn to dusk, and everybody for work dey vex small."],
    choices: [
      { label: ["Fast fully", "Fast fully"], fx: { h: 4, hp: -1, s: 2, r: 2 }, text: ["Hard in the heat, but you feel clear and close to your faith.", "E hard for heat, but you feel clear and close to your faith."] },
      { label: ["Fast, but ease your workload", "Fast, reduce work"], fx: { h: 3, s: -1 }, text: ["A good balance. Iftar with the family is the best part.", "Good balance. Iftar with family na best part."] },
      { label: ["Skip it this year", "Skip am this year"], fx: { h: -2, r: -2 }, text: ["You feel a little guilty at the mosque on Friday.", "You feel small guilt for mosque Friday."] },
    ] },
  { id: "new_yam", title: ["New Yam festival", "New Yam festival"], ages: [10, 80], w: 1.2,
    text: ["The new yam festival is here in your family's town. Drums, masquerades, and an elder's long speech.", "New yam festival reach your family town. Drum, masquerade, and elder long speech."],
    choices: [
      { label: ["Travel for the festival", "Travel for festival"], cost: 120_000, fx: { h: 7, fam: 6, c: 2 }, text: ["Roasted yam, palm oil and stories from the old ones.", "Roast yam, palm oil and stories from the old ones."] },
      { label: ["Send a contribution", "Send contribution"], cost: 30_000, fx: { h: 1, fam: 2 }, text: ["Your name is read out among those who contributed.", "Dem read your name among those wey contribute."] },
      { label: ["Skip it", "Skip am"], fx: { fam: -3 }, text: ["An elder remarks, 'Your people remember'.", "Elder talk, 'Your people dey remember'."] },
    ] },
  { id: "independence_day", title: ["Independence Day", "Independence Day"], ages: [6, 80], w: 1.2,
    text: ["It is October 1st. There is a parade, patriotic songs on every radio, and a general mood of hope and sarcasm.", "October 1st reach. Parade, patriotic songs for every radio, and mood of hope and sarcasm."],
    choices: [
      { label: ["Watch the parade", "Watch parade"], fx: { h: 3, r: 1 }, text: ["You wave a flag and mean it, for a moment.", "You wave flag and you mean am, for small time."] },
      { label: ["Host friends and food", "Host friends and food"], cost: 70_000, fx: { h: 5, c: 3 }, text: ["Jollof, small chops and endless political debate.", "Jollof, small chops and endless political debate."] },
      { label: ["Use the holiday to rest", "Use holiday rest"], fx: { s: -4 }, text: ["Sleep. Glorious sleep.", "Sleep. Sweet sleep."] },
    ] },
  { id: "fuel_scarcity", title: ["Fuel scarcity", "Fuel scarcity"], ages: [18, 70], w: 1.5,
    text: ["Fuel stations are empty and the black market sells at triple the price. The queue at the one working station stretches for kilometres.", "Fuel station empty and black market dey sell triple price. Queue for the one working station long for kilometres."],
    choices: [
      { label: ["Buy from the black market", "Buy for black market"], cost: 90_000, fx: { s: 2 }, text: ["Expensive, but you move.", "E cost, but you dey move."] },
      { label: ["Join the queue", "Join queue"], fx: { s: 7, h: -3 }, text: ["Eight hours in the sun. You get three litres and a headache.", "Eight hours for sun. You get three litres and headache."], bad: { p: 0.3, fx: { s: 4, h: -3 }, text: ["The station runs out just before your turn.", "Station finish just before your turn."] } },
      { label: ["Use public transport this month", "Use public transport this month"], cost: 25_000, fx: { s: 4 }, text: ["Danfo, keke and a lot of sweat. You save money.", "Danfo, keke and plenty sweat. You save money."] },
    ] },
  { id: "harmattan", title: ["Harmattan", "Harmattan"], ages: [6, 80], w: 1.2,
    text: ["The harmattan has come: dust in the air, cracked lips, dry skin and everyone coughing.", "Harmattan don come: dust for air, cracked lip, dry skin and everybody dey cough."],
    choices: [
      { label: ["Buy cream, lip balm and a humidifier", "Buy cream, lip balm and humidifier"], cost: 25_000, fx: { hp: 1, h: 2 }, text: ["You come through smooth and smiling.", "You pass am smooth and smiling."] },
      { label: ["Drink water and endure", "Drink water endure"], fx: { hp: -2 }, text: ["You cough for two weeks.", "You cough for two weeks."], bad: { p: 0.25, fx: { hp: -5, s: 3 }, text: ["It turns into a chest infection.", "E turn chest infection."] } },
    ] },
  { id: "vote_buying", title: ["Vote buying", "Vote buying"], ages: [18, 70], w: 1.1,
    text: ["A party agent offers ₦5,000 and a bag of rice for your PVC. \"Everybody is collecting, don't be stubborn.\"", "Party agent offer ₦5,000 and bag of rice for your PVC. \"Everybody dey collect, no dey stubborn.\""],
    choices: [
      { label: ["Take it and vote as you like", "Take am, vote as you like"], fx: { m: 5_000, r: -1 }, text: ["Rice for the house, a clear conscience, and a secret ballot.", "Rice for house, clear conscience, and secret ballot."] },
      { label: ["Refuse and tell others to refuse", "Refuse and tell others"], fx: { r: 3, c: 1, s: 2 }, text: ["Some people listen. Some laugh.", "Some people listen. Some laugh."] },
      { label: ["Report it to observers", "Report to observers"], fx: { r: 2, s: 4 }, text: ["They write it down. You hope something comes of it.", "Dem write am down. You hope something go happen."] },
    ] },
  { id: "pet_stray", title: ["A stray", "Stray"], ages: [10, 80], w: 1.6, when: (p) => petsOf(p).length < 3,
    text: ["A thin stray dog follows you home and refuses to leave the gate. The gateman says, 'Oga, na your own now.'", "Thin stray dog follow you come house and no gree leave gate. Gateman talk, 'Oga, na your own be that.'"],
    choices: [
      { label: ["Adopt it", "Adopt am"], cost: 20_000, fx: { h: 6 }, text: ["Vet, food and a new best friend. Check your pets.", "Vet, food and new best friend. Check your pets."] },
      { label: ["Give it food and let it go", "Give am food and let am go"], cost: 3_000, fx: { h: 2 }, text: ["It eats and trots off. It will come back.", "E chop and waka go. E go come back."] },
      { label: ["Shoo it away", "Shoo am"], fx: { h: -1 }, text: ["It looks back once.", "E look back one time."] },
    ] },
  { id: "pet_thief", title: ["The dog barks", "Dog bark"], ages: [14, 80], w: 1.3, when: (p) => petsOf(p).some((x) => x.kind === "dog"),
    text: ["At 2 a.m. your dog goes mad. Someone is trying the gate.", "For 2 a.m. your dog go mad. Person dey try the gate."],
    choices: [
      { label: ["Wake the neighbours", "Wake neighbours"], fx: { r: 2, s: 3 }, text: ["The thief runs. The whole street is awake and proud of your dog.", "Thief run. Whole street wake and proud of your dog."] },
      { label: ["Check it yourself", "Check am yourself"], fx: { s: 4 }, text: ["Just a thief with bad timing. Your dog sits on him until help arrives.", "Na thief with bad timing. Your dog sit on am till help come."], bad: { p: 0.15, fx: { hp: -6 }, text: ["He had a stick. You are hurt.", "E get stick. You injure."] } },
    ] },
  { id: "pet_sick", title: ["Your pet is unwell", "Your pet dey sick"], ages: [12, 80], w: 1.6, when: (p) => petsOf(p).length > 0,
    text: ["Your pet will not eat and keeps lying down. The vet says it might be serious.", "Your pet no wan chop and e dey lie down. Vet talk say e fit serious."],
    choices: [
      { label: ["Pay for treatment", "Pay for treatment"], cost: 80_000, fx: { h: 3 }, text: ["Two weeks later it is wagging, or purring, again.", "Two weeks later e dey wag, or purr, again."] },
      { label: ["Try home remedies", "Try home remedy"], fx: { s: 4 }, text: ["Herbs, prayers and hope.", "Herbs, prayers and hope."], bad: { p: 0.4, fx: { h: -8 }, text: ["It does not make it.", "E no survive."] } },
    ] },
];
