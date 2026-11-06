/**
 * News is generated ONLY from simulated state changes. Every item carries `source` — the id of the event
 * occurrence, election contest, case or log row that produced it — so headlines can always be traced back to
 * something that actually happened (and tests can verify that).
 */
import type { GameState, NewsItem, NewsTopic, Notification } from "./types";
import { newId } from "./ids";

export interface NewsInput {
  headline: string;
  body?: string;
  topic: NewsTopic;
  importance?: 1 | 2 | 3;
  stateId?: string | null;
  partyId?: string | null;
  source: string;
  personal?: boolean;
}

const NEWS_CAP = 800;

export function pushNews(state: GameState, n: NewsInput): NewsItem | null {
  // a given source+headline can only be reported once
  const key = `news:${n.source}:${n.headline}`;
  if (state.processed[key]) return null;
  state.processed[key] = true;
  const item: NewsItem = {
    id: newId(state, "n"),
    month: state.clock.monthIndex,
    headline: n.headline,
    body: n.body ?? "",
    topic: n.topic,
    importance: n.importance ?? 1,
    stateId: n.stateId ?? null,
    partyId: n.partyId ?? null,
    source: n.source,
    personal: n.personal ?? false,
  };
  state.news.push(item);
  if (state.news.length > NEWS_CAP) state.news.splice(0, state.news.length - NEWS_CAP);
  return item;
}

export function notify(state: GameState, text: string, level: Notification["level"] = "info", link?: string): void {
  const n: Notification = { id: newId(state, "t"), month: state.clock.monthIndex, text, level, read: false, link };
  state.notifications.push(n);
  if (state.notifications.length > 200) state.notifications.splice(0, state.notifications.length - 200);
}

/** Player-visible career log (personal timeline). */
export function careerLog(state: GameState, text: string): void {
  state.player.career.push({ m: state.clock.monthIndex, text });
  if (state.player.career.length > 400) state.player.career.shift();
}
