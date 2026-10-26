import type { Arc } from "./arcsData";

export const ARCS2: Arc[] = [
  { id: "partner", emoji: "🤝", title: ["The business partner", "Business partner"], ages: [22, 60],
    steps: [
      { text: ["Your old friend Tayo has a 'once in a lifetime' plan: buying phone accessories in Onitsha and selling them on Instagram. He needs a partner with capital.", "Your old friend Tayo get 'once in a lifetime' plan: buy phone accessories for Onitsha, sell for Instagram. E need partner wey get capital."],
        choices: [
          { label: ["Invest with him", "Invest with am"], text: ["You shake hands. He hugs you twice.", "Una shake hand. E hug you two times."], cost: 500_000, score: 1 },
          { label: ["Invest a little, with a written agreement", "Invest small, with written agreement"], text: ["He signs, a bit offended.", "E sign, small vex."], cost: 200_000, score: 2 },
          { label: ["Say no", "Say no"], text: ["He says 'You will regret it.'", "E say 'You go regret am.'"], score: 0 },
        ] },
      { text: ["Six months in, sales look great on Instagram but the account balance looks strange. Tayo has a new car.", "Six months after, sales dey look well for Instagram but account balance strange. Tayo don get new motor."],
        choices: [
          { label: ["Ask to see the books", "Ask to see the books"], text: ["He sends a spreadsheet with many empty cells.", "E send spreadsheet with plenty empty boxes."], score: 1 },
          { label: ["Trust him, he is your guy", "Trust am, na your guy"], text: ["You decide not to spoil the friendship.", "You decide make una friendship no spoil."], score: -1 },
          { label: ["Talk to the supplier directly", "Talk to supplier direct"], text: ["The supplier has interesting things to say.", "Supplier get interesting gist."], score: 1, fx: { c: 1 } },
        ] },
      { text: ["The talk, at a buka over amala. Tayo puts down his spoon. 'Let me explain...'", "The talk, for buka over amala. Tayo drop him spoon. 'Make I explain...'"],
        choices: [
          { label: ["Listen, then ask for your share", "Listen, then ask for your share"], text: ["You let him talk. Then you talk.", "You let am talk. Then you talk."], score: 1 },
          { label: ["Walk away from it all", "Waka comot from everything"], text: ["You leave the money and the friendship on the table.", "You leave the money and the friendship for table."], score: -1 },
        ] },
    ],
    good: { text: ["Tayo pays you back with interest, embarrassed. The business survives with you in charge of the books.", "Tayo pay you back with interest, shame catch am. Business survive and na you dey control the books."], fx: { m: 900_000, r: 3 } },
    bad: { text: ["Tayo blocks you on WhatsApp. The car is gone, and so is your money.", "Tayo block you for WhatsApp. Motor don go, your money too."], fx: { h: -8, s: 8 } } },

  { id: "viral", emoji: "📱", title: ["The viral video", "The video wey blow"], ages: [15, 45],
    steps: [
      { text: ["Someone filmed you dancing at a wedding. By morning it has 200,000 views and a remix.", "Person film you dey dance for wedding. Before morning e don get 200,000 views and remix."],
        choices: [
          { label: ["Lean into it and post more", "Enter am, post more"], text: ["You film a sequel in your kitchen.", "You film part two for your kitchen."], score: 1, fx: { h: 4 } },
          { label: ["Laugh and share it", "Laugh and share am"], text: ["Your aunties forward it to every group chat.", "Your aunties forward am to every group chat."], score: 1 },
          { label: ["Ask for it to be taken down", "Ask make dem remove am"], text: ["The internet never forgets, but it moves on.", "Internet no dey forget, but e dey move on."], score: -1 },
        ] },
      { text: ["A drinks brand slides into your DMs: 'We love your energy. Let's talk.' Also, a blog is digging into your past.", "One drinks brand enter your DM: 'We love your energy. Make we talk.' Also, one blog dey dig your past."],
        choices: [
          { label: ["Meet the brand", "Meet the brand"], text: ["You show up in your best outfit.", "You show with your best cloth."], score: 1, cost: 40_000 },
          { label: ["Get a manager first", "Get manager first"], text: ["Your cousin agrees to be your 'manager' for 10%.", "Your cousin gree to be your 'manager' for 10%."], score: 1 },
          { label: ["Fight the blog in the comments", "Fight the blog for comment"], text: ["It becomes a whole thing.", "E turn big wahala."], score: -1, fx: { s: 4 } },
        ] },
      { text: ["The brand sends a contract. The blog posts an old photo of you. Everyone is waiting to see what you do.", "Brand send contract. Blog post your old photo. Everybody dey wait see wetin you go do."],
        choices: [
          { label: ["Sign, and laugh at the old photo", "Sign, and laugh the old photo"], text: ["You post the photo yourself: 'Glow up 😅'.", "You post the photo yourself: 'Glow up 😅'."], score: 1 },
          { label: ["Go quiet for a while", "Quiet for some time"], text: ["You log off for a month.", "You log off for one month."], score: 0 },
        ] },
    ],
    good: { text: ["The campaign is a hit. You are 'that person from the ad' now, with money to show for it.", "The campaign blow. Now you be 'that person from the advert', with money to show."], fx: { m: 1_500_000, r: 6, h: 8 } },
    bad: { text: ["The moment passes. A new viral video takes your place by Tuesday.", "The moment pass. New viral video don take your place before Tuesday."], fx: { h: -3 } } },

  { id: "sibling", emoji: "🧬", title: ["The long-lost relative", "Relative wey lost"], ages: [20, 70],
    steps: [
      { text: ["A stranger messages you: 'I think we are related. My mother always spoke of your family.' The photo looks a bit like your father.", "One stranger message you: 'I think say we be family. My mama dey talk about your family.' The photo resemble your papa small."],
        choices: [
          { label: ["Reply and ask questions", "Reply and ask questions"], text: ["You exchange long voice notes.", "Una exchange long voice notes."], score: 1 },
          { label: ["Ask your mother first", "Ask your mama first"], text: ["Your mother goes very quiet.", "Your mama quiet well well."], score: 1, fx: { fam: -2 } },
          { label: ["Block them", "Block dem"], text: ["Probably a scam. Probably.", "Na scam maybe. Maybe."], score: -1 },
        ] },
      { text: ["They suggest a DNA test. They will pay half. Your family elders say 'leave it alone'.", "Dem suggest DNA test. Dem go pay half. Your family elders say 'leave am'."],
        choices: [
          { label: ["Do the test", "Do the test"], text: ["Two cheek swabs and a long wait.", "Two cheek swab and long wait."], cost: 45_000, score: 1 },
          { label: ["Meet in person first", "Meet face to face first"], text: ["You meet at a quiet restaurant.", "Una meet for quiet restaurant."], score: 1, cost: 15_000 },
          { label: ["Listen to the elders", "Listen to the elders"], text: ["You let it rest, for now.", "You leave am, for now."], score: 0, fx: { fam: 2 } },
        ] },
      { text: ["The results are in. Your hands shake a little as you open the email.", "Result don land. Your hand dey shake small as you open the email."],
        choices: [
          { label: ["Open it together", "Open am together"], text: ["You call them on video.", "You video call dem."], score: 1 },
          { label: ["Open it alone", "Open am alone"], text: ["You sit in your car to read it.", "You siddon for your motor read am."], score: 0 },
        ] },
    ],
    good: { text: ["It is true: a cousin from a branch of the family that drifted apart decades ago. The whole family meets. Tears, jollof and old stories.", "E true: cousin from one side of the family wey scatter many years ago. Whole family meet. Tears, jollof and old stories."], fx: { h: 10, fam: 8, c: 3 } },
    bad: { text: ["No match. They apologise. You both wanted it to be true.", "No match. Dem say sorry. Una both wan make e be true."], fx: { h: -4 } } },
];
