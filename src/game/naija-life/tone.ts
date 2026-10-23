export type Tone = "good" | "bad" | "neutral";

const BAD = /\b(died|dies|death|dead|passed away|arrest|jail|prison|robb|kidnap|stolen|stole|scam|fraud|lost|lose|loses|fired|sacked|broke|debt|owe|sick|ill|disease|injur|accident|fail|failed|crash|flood|fine[ds]?|evict|divorce|broke up|cheat|raid|bribe|hospital|stress|angry|vex|wahala|trouble|suspend|expel|collapse|damage|spoil|break ?down|rejected|denied|ghost|abandon|tragic|sad|cry|cried|bad)\b|die|don die|no go|lose am|don spoil/i;
const GOOD = /\b(promot|raise|win|won|wins|graduat|passed|pass(es)?|married|wedding|born|birth|baby|gift|received|earn|earned|profit|bonus|scholarship|admit|admitted|offer|new job|hired|saved|healed|recovered|cured|friend|love|loves|yes|great|happy|proud|celebrat|success|blessed|thrive|rich|award|prize|inherit|congrat|jackpot|lucky)\b/i;

/** A quick read of whether a line of the story is good news or bad news. */
export function toneOf(line: string): Tone {
  const bad = BAD.test(line);
  const good = GOOD.test(line);
  if (bad && !good) return "bad";
  if (good && !bad) return "good";
  if (bad && good) return /died|dies|death|arrest|prison|kidnap|robb/i.test(line) ? "bad" : "neutral";
  return "neutral";
}

export const TONE_STYLE: Record<Tone, { bar: string; text: string; bg: string; icon: string }> = {
  good: { bar: "bg-emerald-400", text: "text-emerald-900", bg: "bg-emerald-50", icon: "▲" },
  bad: { bar: "bg-rose-400", text: "text-rose-900", bg: "bg-rose-50", icon: "▼" },
  neutral: { bar: "bg-slate-300", text: "text-slate-600", bg: "", icon: "•" },
};

/** A big emoji for an event pop-up, picked from its id and title. */
export function eventEmoji(id: string, title: string): string {
  const s = `${id} ${title}`.toLowerCase();
  const table: [RegExp, string][] = [
    [/arrest|police|efcc|raid|checkpoint|court|trial|bail/, "🚔"], [/prison|jail|kuje|cell|warder/, "⛓️"], [/kidnap/, "😨"], [/wedding|marry|proposal|bride|engage/, "💍"],
    [/baby|pregnan|birth|born|newborn/, "🍼"], [/funeral|died|death|burial|obit|grave/, "🕯️"], [/sick|hospital|doctor|illness|malaria|health|clinic|treat/, "🏥"],
    [/exam|school|class|teacher|report|jamb|waec|neco|campus|lecturer|graduat|admission|result/, "🎓"], [/nysc|corps|camp|ppa/, "🇳🇬"], [/job|interview|boss|salary|promotion|work|office|hire|fired|sack/, "💼"],
    [/business|shop|customer|stock|market|supplier|staff|profit/, "🏪"], [/bank|loan|debt|money|cash|pay|fee|rent|bill|owe|inherit|estate|will\b/, "💰"], [/love|date|dating|crush|toast|romance|partner|girlfriend|boyfriend|hook/, "💘"],
    [/church|mosque|pastor|prophet|imam|prayer|vigil|worship|sallah|eid|ramadan/, "🙏"], [/christmas|detty|new yam|festival|owambe|party|celebrat/, "🎉"], [/election|vote|politic|senator|governor|campaign|party chair/, "🗳️"],
    [/flood|storm|fire|nepa|light|generator|fuel|petrol|harmattan/, "⛽"], [/dog|cat|pet|parrot|goat|rooster/, "🐕"], [/lotter|scratch|jackpot|bet|gamble/, "🎰"], [/yahoo|scam|fraud|mugu/, "💻"],
    [/afrobeat|music|singer|record|studio|stage|talent|nollywood|audition|football|comed/, "🎤"], [/travel|trip|flight|visa|road|journey|bus|park/, "🚌"], [/friend|gist|classmate|neighbour|gossip/, "🧑🏾‍🤝‍🧑🏾"],
    [/car|motor|vehicle|accident|crash|mechanic/, "🚗"], [/house|landlord|land|build|estate agent|property/, "🏠"], [/dna|ancestry|tribe|village|elder/, "🧬"], [/cult|gang|area boy|thug/, "🕶️"],
  ];
  for (const [re, e] of table) if (re.test(s)) return e;
  return "📣";
}
