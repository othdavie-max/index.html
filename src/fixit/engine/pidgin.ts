/**
 * A light Naija Pidgin pass for flavour text (street voices, X feed, advisers, news, the inner circle).
 * Rule-based and deterministic: phrases first, then single words, then a few tags like "o" and "abeg" at sentence ends.
 */
const PHRASES: [string, string][] = [
  ["what is", "wetin be"], ["what are", "wetin be"], ["what", "wetin"], ["there is", "e get"], ["there are", "dem get"],
  ["has not", "never"], ["have not", "never"], ["did not", "no"], ["do not", "no dey"], ["does not", "no dey"], ["don't", "no dey"], ["doesn't", "no dey"], ["didn't", "no"],
  ["cannot", "no fit"], ["can't", "no fit"], ["can not", "no fit"], ["will not", "no go"], ["won't", "no go"], ["is not", "no be"], ["isn't", "no be"], ["are not", "no be"], ["aren't", "no be"],
  ["this is", "dis na"], ["that is", "dat na"], ["it is", "e dey"], ["we are", "we dey"], ["you are", "you dey"], ["they are", "dem dey"], ["i am", "I dey"], ["he is", "e dey"], ["she is", "she dey"],
  ["is going to", "go"], ["are going to", "go"], ["going to", "go"], ["a lot of", "plenty"], ["a lot", "plenty"], ["too much", "too much"],
  ["last month", "last month"], ["every month", "every month"], ["in a few months", "for few months"], ["at least", "at least"],
];
const WORDS: Record<string, string> = {
  people: "pipul", government: "goment", children: "pikin", child: "pikin", money: "moni", very: "too much", many: "plenty", the: "di", this: "dis", that: "dat",
  with: "wit", their: "dem", them: "dem", they: "dem", is: "dey", are: "dey", was: "been", were: "been", want: "wan", wants: "dey want", know: "sabi", knows: "sabi", understand: "sabi",
  food: "chop", eat: "chop", expensive: "dear", please: "abeg", sir: "Oga", because: "because", have: "get", has: "get", had: "get", not: "no", talk: "tok", say: "talk", says: "dey talk", said: "talk",
  little: "small", small: "small", now: "now now", today: "today", market: "market", angry: "vex", anger: "vex", worried: "dey worry", fear: "fear", afraid: "dey fear", happy: "dey happy", better: "better",
  nothing: "notin", something: "sometin", everything: "everyting", anything: "anyting", thing: "ting", things: "tins", think: "tink", thank: "tank", thanks: "tanks", about: "about", to: "to", you: "you", your: "your",
};
const TAGS = [" o!", " sha.", " abeg.", " wallahi.", " jare.", " na so."];
const cap = (src: string, out: string) => (src[0] && src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out);

export function pidgin(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [a, b] of PHRASES) out = out.replace(new RegExp(`\\b${a.replace(/'/g, "['’]")}\\b`, "gi"), (m) => cap(m, b));
  out = out.replace(/[A-Za-z']+/g, (w) => { const r = WORDS[w.toLowerCase()]; return r ? cap(w, r) : w; });
  let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  let n = Math.abs(h);
  out = out.replace(/([a-z\d])\.(\s|$)/g, (m, c: string, sp: string) => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n % 3 === 0 ? `${c}${TAGS[n % TAGS.length]}${sp}` : m; });
  return out;
}
