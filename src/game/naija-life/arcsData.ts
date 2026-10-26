/** Story arcs: three-part stories told one year at a time, each ending on a cliffhanger. */
export type L = [string, string];
export interface Fx { m?: number; h?: number; s?: number; r?: number; c?: number; fam?: number; hp?: number; sm?: number }
export interface ArcChoice { label: L; text: L; fx?: Fx; cost?: number; score?: number }
export interface ArcStep { text: L; choices: ArcChoice[] }
export interface Arc { id: string; emoji: string; title: L; ages: [number, number]; rented?: boolean; steps: [ArcStep, ArcStep, ArcStep]; good: { text: L; fx: Fx }; bad: { text: L; fx: Fx } }

export const ARCS: Arc[] = [
  { id: "landlord", emoji: "🏚️", title: ["The landlord's plan", "Landlord plan"], ages: [20, 65], rented: true,
    steps: [
      { text: ["Your landlord gathers the tenants: 'I am selling this compound. The buyer will decide your fate.' A man in a white Prado is already measuring the walls.", "Your landlord gather all tenants: 'I wan sell this compound. The buyer go decide una fate.' One man for white Prado don dey measure the wall."],
        choices: [
          { label: ["Make friends with the buyer", "Make friend with the buyer"], text: ["You offer him a cold Malt and a warm smile.", "You give am cold Malt and warm smile."], score: 1 },
          { label: ["Organise the tenants", "Organise the tenants"], text: ["You start a WhatsApp group: 'Tenants Unite 💪🏾'.", "You open WhatsApp group: 'Tenants Unite 💪🏾'."], score: 1, fx: { c: 2 } },
          { label: ["Start looking for a new place", "Start to find new place"], text: ["You quietly visit three houses with an agent.", "You quietly check three houses with agent."], cost: 50_000, score: 0 },
        ] },
      { text: ["The new owner is here. He wants everyone to pay two years upfront, plus a 'development levy'. The tenants look at you.", "New owner don land. E want make everybody pay two years upfront plus 'development levy'. Tenants dey look you."],
        choices: [
          { label: ["Negotiate for everyone", "Negotiate for everybody"], text: ["You speak for the compound. He listens. Barely.", "You talk for the whole compound. E listen. Small."], score: 1, fx: { r: 2, s: 3 } },
          { label: ["Pay your part quietly", "Pay your own quietly"], text: ["You pay and keep your head down.", "You pay and bow your head."], cost: 300_000, score: 1 },
          { label: ["Refuse to pay", "Refuse to pay"], text: ["'Over my dead body.' He smiles like a man with lawyers.", "'Over my dead body.' E smile like person wey get lawyer."], score: -1, fx: { s: 4 } },
        ] },
      { text: ["Eviction day. A lorry and the new owner arrive at 6 a.m. Everyone is watching what you do.", "Eviction day. Lorry and the new owner land 6 a.m. Everybody dey watch wetin you go do."],
        choices: [
          { label: ["Show the receipts and the agreement", "Show the receipts and agreement"], text: ["You wave the paperwork like a flag.", "You wave the paper like flag."], score: 1 },
          { label: ["Call a lawyer friend", "Call lawyer friend"], text: ["Your friend arrives in a suit at 7 a.m. Legend.", "Your friend land with suit 7 a.m. Legend."], cost: 150_000, score: 1 },
          { label: ["Pack your things", "Pack your load"], text: ["You start loading the lorry yourself.", "You start to load lorry yourself."], score: -1 },
        ] },
    ],
    good: { text: ["The owner backs down. Your rent stays the same, and the tenants call you 'Chairman' now.", "Owner back down. Your rent no change, and tenants dey call you 'Chairman' now."], fx: { h: 8, r: 5 } },
    bad: { text: ["You move out with your mattress on your head. A new place, a new landlord, the same Lagos.", "You comot with mattress for head. New place, new landlord, same Lagos."], fx: { h: -6, s: 6, m: -200_000 } } },

  { id: "admirer", emoji: "💌", title: ["The secret admirer", "Secret admirer"], ages: [14, 30],
    steps: [
      { text: ["A folded note in your bag: 'I like the way you laugh. — S.' No name, just a drawn heart.", "Small note for your bag: 'I like how you dey laugh. — S.' No name, only heart wey dem draw."],
        choices: [
          { label: ["Write back and leave it in the same place", "Write back, leave am for the same place"], text: ["You write three drafts and choose the shortest.", "You write three drafts and pick the shortest."], score: 1, fx: { h: 3 } },
          { label: ["Show your friends", "Show your friends"], text: ["Your friends scream. Now everyone knows.", "Your friends scream. Now everybody know."], score: 0, fx: { c: 1 } },
          { label: ["Ignore it", "Ignore am"], text: ["You pretend you never saw it. You read it ten times.", "You pretend say you no see am. You read am ten times."], score: -1 },
        ] },
      { text: ["Another note: 'Meet me at the mai shayi spot on Friday. Wear blue.'", "Another note: 'Meet me for mai shayi spot Friday. Wear blue.'"],
        choices: [
          { label: ["Go, in your best blue", "Go, wear your best blue"], text: ["You iron your shirt twice.", "You iron your shirt two times."], score: 1, cost: 10_000 },
          { label: ["Send a friend to check first", "Send friend check first"], text: ["Your friend agrees to spy for the price of suya.", "Your friend gree to spy for suya."], score: 0 },
          { label: ["Do not go", "No go"], text: ["Friday passes. Something feels lost.", "Friday pass. Something be like say e lost."], score: -1 },
        ] },
      { text: ["Friday. Mai shayi, blue shirt, butterflies. Someone walks towards you, smiling nervously.", "Friday. Mai shayi, blue shirt, butterfly for belle. Person dey waka come your side, dey smile shy shy."],
        choices: [
          { label: ["Smile back and say hello", "Smile back, say hello"], text: ["'Hi... I'm the S.' You both laugh.", "'Hi... na me be the S.' Una both laugh."], score: 1 },
          { label: ["Play it cool", "Play am cool"], text: ["You nod like a Nollywood star.", "You nod like Nollywood star."], score: 0 },
        ] },
    ],
    good: { text: ["It is someone you always liked. You talk for hours over Indomie and tea. Something real begins.", "Na person wey you don like before. Una talk for hours over Indomie and tea. Something real start."], fx: { h: 12, c: 2 } },
    bad: { text: ["It was your classmates pranking you. They will never let you forget the blue shirt.", "Na your classmates dey prank you. Dem no go ever let you forget that blue shirt."], fx: { h: -5, r: -2 } } },

  { id: "village_land", emoji: "🌴", title: ["The village land", "Village land"], ages: [25, 75],
    steps: [
      { text: ["An uncle calls: 'Your father's plot in the village? Someone is building on it.' He sends a blurry photo of a foundation.", "Uncle call: 'Your papa plot for village? Person dey build for am.' E send blurry photo of foundation."],
        choices: [
          { label: ["Travel to the village", "Travel go village"], text: ["Twelve hours on the road, two checkpoints, one goat on the bus.", "Twelve hours for road, two checkpoint, one goat for bus."], cost: 80_000, score: 1 },
          { label: ["Ask the uncle to handle it", "Ask uncle to handle am"], text: ["He says he will need 'something for the elders'.", "E say e go need 'something for the elders'."], cost: 40_000, score: 0 },
          { label: ["Ignore it, it is just land", "Ignore am, na just land"], text: ["You tell yourself it does not matter.", "You tell yourself say e no matter."], score: -1 },
        ] },
      { text: ["The elders call a meeting under the big tree. The builder says your grandfather 'gave' it to his grandfather. His document is written in pencil.", "Elders call meeting under big tree. The builder say your grandpa 'give' am to him grandpa. Him document na pencil dem take write am."],
        choices: [
          { label: ["Bring kola, palm wine and respect", "Bring kola, palm wine and respect"], text: ["The elders like you already.", "Elders don like you already."], cost: 60_000, score: 1, fx: { fam: 3 } },
          { label: ["Bring a surveyor and a lawyer", "Bring surveyor and lawyer"], text: ["The elders frown at the lawyer's tie.", "Elders frown for the lawyer tie."], cost: 250_000, score: 1 },
          { label: ["Shout at the builder", "Shout for the builder"], text: ["Everyone gasps. You have embarrassed the family.", "Everybody shock. You don shame the family."], score: -1, fx: { fam: -4 } },
        ] },
      { text: ["Verdict day. The oldest elder clears his throat and looks at you for a long time.", "Verdict day. The oldest elder clear throat and look you for long time."],
        choices: [
          { label: ["Bow and wait", "Bow and wait"], text: ["You keep your eyes down.", "You keep your eye down."], score: 1 },
          { label: ["Offer to share part of the land", "Offer to share part of the land"], text: ["A murmur of approval.", "People dey murmur say e good."], score: 1, fx: { r: 2 } },
        ] },
    ],
    good: { text: ["The land is yours, confirmed before the whole village. Later, a developer offers you good money for half of it.", "The land na your own, everybody for village witness am. Later, developer offer you better money for half."], fx: { m: 3_000_000, fam: 6, r: 3 } },
    bad: { text: ["The elders rule for the builder. You drive home with a heavy heart and a bag of yams.", "Elders rule for the builder. You drive go house with heavy heart and bag of yam."], fx: { h: -8, fam: -3 } } },
];
