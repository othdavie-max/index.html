import type { Scn } from "./scenarios";

/** School and growing up. */
export const SCN_SCHOOL: Scn[] = [
  { id: "common_entrance", title: ["Common Entrance", "Common Entrance"], ages: [10, 11], w: 1.2, when: (p) => p.school?.stage === "primary",
    text: ["Common Entrance is coming. Your mother has bought three past-question books and one anointing oil.", "Common Entrance dey come. Your mama don buy three past-question book and one anointing oil."],
    choices: [
      { label: ["Read until you dream the answers", "Read till you dey dream the answers"], fx: { sm: 3, s: 4 }, text: ["You read like your life depends on it. The questions look familiar on the day.", "You read like say na your life. The questions look familiar for the day."] },
      { label: ["Join the lesson class", "Join lesson class"], cost: 25_000, fx: { sm: 2 }, text: ["Mr. Emeka teaches you tricks no textbook has.", "Mr. Emeka teach you tricks wey no dey for textbook."] },
      { label: ["Trust the oil", "Trust the oil"], fx: { h: 2 }, bad: { p: 0.5, fx: { sm: -1, s: 3 }, text: ["The oil does not do maths.", "Oil no sabi maths."] }, text: ["You pray and play football.", "You pray and play football."] },
    ] },
  { id: "lesson_teacher", title: ["Lesson teacher wahala", "Lesson teacher wahala"], ages: [11, 18], w: 0.8, when: (p) => p.school?.stage === "secondary",
    text: ["Your teacher barely teaches in class. 'Come for lesson after school, it is only ₦3,000 a week.'", "Your teacher no dey teach for class. 'Come lesson after school, na only ₦3,000 every week.'"],
    choices: [
      { label: ["Pay for the lesson", "Pay for the lesson"], cost: 12_000, fx: { sm: 2 }, text: ["Suddenly the same teacher explains everything very well.", "Suddenly the same teacher dey explain everything well."] },
      { label: ["Study on your own", "Read by yourself"], fx: { sm: 1, s: 3 }, text: ["You borrow a senior's notes and manage.", "You borrow senior notes and manage."], bad: { p: 0.4, fx: { sm: -1 }, text: ["The teacher remembers you at test time.", "The teacher remember you for test time."] } },
      { label: ["Report to the principal", "Report am to principal"], fx: { r: 1, s: 2 }, text: ["Nothing changes, but people know you are bold.", "Nothing change, but people know say you bold."] },
    ] },
  { id: "school_fees_hike", title: ["School fees increase", "School fees increase"], ages: [6, 21], w: 0.8, needs: ["school"],
    text: ["The school announces a fees increase. 'No fees, no exam.'", "School announce fees increase. 'No fees, no exam.'"],
    choices: [
      { label: ["Family finds the money", "Family find the money"], fx: { fam: -3, s: 2 }, text: ["Your parents manage it, but dinner is small this month.", "Your people manage am, but food small this month."] },
      { label: ["Hawk after school to help", "Hawk after school to help"], fx: { m: 15_000, f: 1, s: 3 }, text: ["You sell sachet water for weekends and cover part of it.", "You sell pure water for weekend and cover small part."] },
      { label: ["Hide at home till it is sorted", "Hide for house till dem sort am"], fx: { sm: -1, h: -2 }, text: ["You miss a week of lessons.", "You miss one week lesson."] },
    ] },
  { id: "prefect_trouble", title: ["Prefect and punishment", "Prefect and punishment"], ages: [10, 17], w: 0.7, needs: ["school"],
    text: ["A prefect writes your name for 'noise-making'. Punishment: cut the whole school field with cutlass.", "Prefect write your name for 'noise-making'. Punishment: cut the whole school field with cutlass."],
    choices: [
      { label: ["Do the punishment", "Do the punishment"], fx: { f: 2, r: 1 }, text: ["Blisters, but nobody can say you shirk.", "Blister, but nobody fit talk say you dey run."] },
      { label: ["Negotiate with the prefect", "Negotiate with the prefect"], cost: 1_000, fx: { c: 1 }, text: ["A biscuit and a promise are enough.", "One biscuit and promise do the work."] },
      { label: ["Run home early", "Run go house early"], fx: { r: -2 }, bad: { p: 0.5, fx: { s: 3 }, text: ["Your mother meets you at the gate with a belt.", "Your mama meet you for gate with belt."] }, text: ["You escape the cutlass for now.", "You escape the cutlass for now."] },
    ] },
  { id: "village_holiday", title: ["Holiday in the village", "Holiday for village"], ages: [6, 15], w: 0.9,
    text: ["Your parents send you to the village for the holiday. Fetching water, goat chasing, and cousins everywhere.", "Your people send you go village for holiday. Fetch water, chase goat, and cousin everywhere."],
    choices: [
      { label: ["Enjoy it", "Enjoy am"], fx: { h: 5, f: 2 }, text: ["You climb mango trees and hear stories by moonlight.", "You climb mango tree and hear story for moonlight."] },
      { label: ["Sulk for the whole trip", "Sulk the whole trip"], fx: { h: -3 }, text: ["Grandma says 'this one has city eyes'.", "Grandma talk say 'this one don get city eye'."] },
      { label: ["Learn from the elders", "Learn from the elders"], fx: { sm: 1, r: 1, h: 2 }, text: ["You come back with proverbs you do not fully understand.", "You come back with proverb wey you no fully understand."] },
    ] },
  { id: "hand_me_down", title: ["Hand-me-down clothes", "Hand-me-down cloth"], ages: [6, 16], w: 0.7, when: (p) => p.classAtBirth === "struggling",
    text: ["Your elder sibling's old school uniform is now yours. It is two sizes too big and has someone else's name on the pocket.", "Your elder sibling old uniform don turn your own. E big two size and another person name dey pocket."],
    choices: [
      { label: ["Wear it with pride", "Wear am with pride"], fx: { r: 1, h: 1 }, text: ["Your mother says 'a good cloth does not know who sewed it'.", "Your mama talk say 'good cloth no sabi who sew am'."] },
      { label: ["Beg for a new one", "Beg for new one"], fx: { fam: -2, s: 2 }, text: ["Silence at dinner. You wear the old one.", "Silence for dinner. You wear the old one."] },
      { label: ["Have it taken in by a tailor", "Take am go tailor"], cost: 1_500, fx: { h: 2 }, text: ["Neat now. Nobody sees the old name.", "E neat now. Nobody see the old name."] },
    ] },
  { id: "expo_raid", title: ["Exam 'expo' centre", "Exam 'expo' centre"], ages: [15, 19], w: 0.6, needs: ["school"],
    text: ["A friend whispers: 'there's an expo centre. ₦10,000 and you get the questions before the exam.'", "Your padi whisper: 'one expo centre dey. ₦10,000 and you go see question before exam.'"],
    choices: [
      { label: ["Pay and join", "Pay and join"], cost: 10_000, text: ["The questions are real. Mostly.", "The questions real. Mostly."], fx: { sm: -1 }, bad: { p: 0.35, fx: { r: -6, s: 5 }, text: ["Security raid the centre and your name is on a list.", "Security raid the centre and your name dey list."] } },
      { label: ["Refuse and read", "Refuse and read"], fx: { sm: 2, s: 3 }, text: ["Your conscience is clean and your eyes are red.", "Your conscience clean and your eye red."] },
      { label: ["Tell the principal", "Tell the principal"], fx: { r: 2, c: -1 }, text: ["You are called a snitch, but the centre closes.", "Dem call you snitch, but the centre close."] },
    ] },
  { id: "admission_list", title: ["Admission list wahala", "Admission list wahala"], ages: [17, 24], w: 0.7, when: (p) => Boolean(p.flags.admScore) && !p.school,
    text: ["The admission list is out. Your name is not on it. A man says he can 'help' for a fee.", "Admission list don out. Your name no dey. One man talk say e fit 'help' you for fee."],
    choices: [
      { label: ["Pay the man", "Pay the man"], cost: 150_000, fx: { c: 1 }, text: ["Your name appears on the list. Do not ask how.", "Your name show for list. No ask how."], bad: { p: 0.4, fx: { s: 6, r: -2 }, text: ["Your name disappears again before resumption.", "Your name vanish again before resumption."] } },
      { label: ["Appeal to the registrar", "Appeal to the registrar"], fx: { s: 3 }, text: ["Four visits and a long queue. They say 'we will call'.", "Four visit and long queue. Dem talk say 'we go call'."] },
      { label: ["Wait for next session", "Wait for next session"], fx: { h: -2 }, text: ["A year of waiting, selling recharge cards.", "One year of waiting, you dey sell recharge card."] },
    ] },
  { id: "hostel_fire", title: ["Hostel problem", "Hostel problem"], ages: [17, 26], w: 0.5, when: (p) => p.school?.stage === "tertiary",
    text: ["A gas cooker catches fire in your hostel block. Everyone runs out in towels.", "Gas cooker catch fire for your hostel block. Everybody run comot for towel."],
    choices: [
      { label: ["Help carry the fire extinguisher", "Help carry extinguisher"], fx: { r: 3, hp: -1 }, text: ["You become the 'hostel hero' for a week.", "You turn 'hostel hero' for one week."] },
      { label: ["Save your laptop and phone", "Save your laptop and phone"], fx: { s: 2 }, text: ["Smart. Your textbooks, not so much.", "Smart. Your textbook no too."] , bad: { p: 0.4, fx: { m: -40_000 }, text: ["Your books burn.", "Your book burn."] } },
      { label: ["Record it for social media", "Record am for social media"], fx: { h: 1, r: -2 }, text: ["Views but also insults.", "You get view but you get insult."] },
    ] },
  { id: "carryover_stress", title: ["Carryover fear", "Carryover fear"], ages: [18, 30], w: 0.8, when: (p) => p.school?.stage === "tertiary" && (p.campus?.gpas.length ?? 0) > 0 && (p.campus?.cgpa ?? 5) < 2.4,
    text: ["Your CGPA is shaky. A lecturer hints that two courses might become carryovers.", "Your CGPA dey shake. Lecturer hint say two course fit turn carryover."],
    choices: [
      { label: ["Read all night", "Read all night"], fx: { sm: 2, s: 5, hp: -1 }, text: ["Coffee, noodles and prayers.", "Coffee, noodles and prayers."] },
      { label: ["Beg the lecturer", "Beg the lecturer"], fx: { r: -1 }, text: ["He says 'come to my office'. It is an awkward visit but you pass.", "E talk say 'come my office'. E awkward but you pass."] },
      { label: ["Hope for the best", "Hope for the best"], fx: { s: -1 }, bad: { p: 0.5, fx: { h: -4 }, text: ["Result day: two carryovers.", "Result day: two carryover."] }, text: ["You go to a party.", "You go party."] },
    ] },
  { id: "asuu_idle", title: ["During the strike", "During the strike"], ages: [17, 27], w: 0.6, when: (p) => Boolean(p.campus && p.campus.strikes > 0 && !p.campus.graduated),
    text: ["Your school is shut by a strike again. Everybody is at home asking 'when are you graduating?'", "Your school close for strike again. Everybody for house dey ask 'when you go graduate?'"],
    choices: [
      { label: ["Learn a skill meanwhile", "Learn skill meanwhile"], cost: 30_000, fx: { sm: 2, h: 1 }, text: ["You finish a short course while others wait.", "You finish short course while others dey wait."] },
      { label: ["Hustle in the market", "Hustle for market"], fx: { m: 120_000, s: 3 }, text: ["You make money selling phone accessories.", "You make money dey sell phone accessories."] },
      { label: ["Sleep and scroll", "Sleep and scroll"], fx: { h: -2, sm: -1 }, text: ["Two months disappear.", "Two months vanish."] },
    ] },
  { id: "sorting_lecturer", title: ["'Sorting' a course", "'Sorting' a course"], ages: [18, 28], w: 0.6, when: (p) => p.school?.stage === "tertiary",
    text: ["A course you keep failing. A classmate says the lecturer 'accepts handouts' for pass marks.", "Course wey you dey fail. Classmate say lecturer dey 'accept handout' for pass mark."],
    choices: [
      { label: ["Buy the handout", "Buy the handout"], cost: 20_000, fx: { sm: 1 }, text: ["Everyone buys it. You pass.", "Everybody dey buy am. You pass."], bad: { p: 0.25, fx: { r: -4, s: 4 }, text: ["Someone reports the lecturer and the 'handout' list leaks.", "Somebody report lecturer and the 'handout' list leak."] } },
      { label: ["Study it properly", "Study am well"], fx: { sm: 3, s: 4 }, text: ["Hard work. You earn the pass.", "Hard work. You earn the pass."] },
      { label: ["Drop the course", "Drop the course"], fx: { s: -2 }, text: ["Another carryover waiting for you.", "Another carryover dey wait for you."] },
    ] },
];
