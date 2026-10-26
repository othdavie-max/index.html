import { MILESTONES } from "./quests";
import { rivalNpc } from "./rival";
import type { Player } from "./types";
import { T, pick, randInt } from "./util";

/** NaijaGram: a feed of posts from your rival, old friends, gist pages and you. */
export interface Post { a: number; who: string; e: string; t: string; likes: number; you?: boolean }
export const feedOf = (p: Player): Post[] => { try { return JSON.parse(String(p.flags.feed ?? "[]")) as Post[]; } catch { return []; } };
export function postFeed(p: Player, post: Omit<Post, "a" | "likes"> & { likes?: number }) {
  const f = feedOf(p);
  f.push({ a: p.age, likes: post.likes ?? randInt(3, 900), ...post });
  p.flags.feed = JSON.stringify(f.slice(-30));
}

const PAGES: [string, string, [string, string][]][] = [
  ["@LagosTraffic", "🚦", [["Third Mainland Bridge is a car park this morning. Plan your life accordingly.", "Third Mainland Bridge don turn car park this morning. Plan your life well."], ["Danfo driver just reversed on the expressway. Normal day.", "Danfo driver just reverse for expressway. Normal day."]]],
  ["@NaijaFoodie", "🍲", [["Rate this jollof from 1 to 10. Ghanaians, stay calm.", "Rate this jollof from 1 to 10. Ghana people, calm down."], ["Suya spot of the week: the one with the smoke you can see from the road.", "Suya spot of the week: the one wey smoke dey show from road."]]],
  ["@AsoRockGist", "🗳️", [["Senators approve new cars for themselves. Again.", "Senators approve new motor for themselves. Again."], ["Minister promises 24 hours of light by next year. Same as last year.", "Minister promise 24 hours light by next year. Same as last year."]]],
  ["@NollyFlix", "🎬", [["New Nollywood blockbuster drops Friday. Already 3 sequels announced.", "New Nollywood film drop Friday. Dem don announce 3 sequel already."], ["Behind the scenes: the village scene was shot in a Lekki estate.", "Behind the scenes: dem shoot the village scene for Lekki estate."]]],
  ["@SuperEaglesFan", "⚽", [["We go win the next AFCON. I said what I said.", "We go win the next AFCON. I don talk my own."], ["Penalty miss again. My blood pressure.", "Penalty miss again. My BP."]]],
  ["@MamaPutQueen", "🍛", [["Rice and stew with two pieces of meat: now a luxury item.", "Rice and stew with two meat: e don turn luxury."], ["Customer asked for 'small' meat. Sir, this is Lagos.", "Customer ask for 'small' meat. Oga, this na Lagos."]]],
];

/** A few posts a year, and a post (with a rival comment) when you hit a milestone. */
export function feedYear(p: Player, lines: string[]) {
  if (p.age < 12) return;
  for (let i = 0; i < randInt(1, 2); i++) { const [who, e, texts] = pick(PAGES); const t = pick(texts); postFeed(p, { who, e, t: T(t[0], t[1]) }); }
  const rv = rivalNpc(p);
  for (const m of MILESTONES) {
    if (p.flags[`mile_${m.id}`] !== p.age || p.age < 14) continue;
    postFeed(p, { who: T("You", "You"), e: m.emoji, t: T(`${m.en}! God did it. 🙏🏾`, `${m.pcm}! God don do am. 🙏🏾`), you: true, likes: randInt(40, 3000) });
    if (rv) {
      const c = pick([T("Congrats o... I go soon pass you 😏", "Congrats o... I go soon pass you 😏"), T("Big moves! Remember us small people 🙌🏾", "Big moves! Remember us small people 🙌🏾"), T("Finally! Took you long enough 😂", "Finally! E take you long 😂")]);
      postFeed(p, { who: rv.name.split(" ")[0], e: "🥊", t: c });
      lines.push(T(`${rv.name.split(" ")[0]} commented on your post: "${c}"`, `${rv.name.split(" ")[0]} comment for your post: "${c}"`));
    }
  }
}

/** Headlines about you when you do something the whole country would talk about. */
export function newsAboutYou(p: Player) {
  p.world ??= { until: {}, news: [] };
  const name = `${p.name} ${p.surname}`;
  const add = (en: string, pcm: string) => { p.world!.news.push({ age: p.age, en, pcm }); };
  if (p.flags.mile_b1 === p.age) add(`${name} joins Nigeria's billionaire club.`, `${name} don join Naija billionaire club.`);
  if (p.flags.mile_b10 === p.age) add(`Forbes Africa features ${name}.`, `Forbes Africa feature ${name}.`);
  if (p.flags.bigBreak && p.flags.bigBreakAge === undefined) { p.flags.bigBreakAge = p.age; add(`Rising star ${name} is the talk of the town.`, `New star ${name} dey trend for town.`); }
  const office = p.politics?.office ?? -1;
  if (office >= 3 && p.flags.newsOffice !== office) { p.flags.newsOffice = office; add(`${name} sworn into high office.`, `${name} don swear in for big office.`); }
}
