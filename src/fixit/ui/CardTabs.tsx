import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { CategoryBar } from "./CategoryBar";

const SHORT: Record<string, string> = {
  "Nigeria and the world": "World", "The trade balance": "Balance", "What we import, and what we could make": "Imports & factories", "Where Nigeria stands": "Standing", "The world": "Map", "The league": "League", "Invitations": "Invites",
  "Naija X today": "Today", "Trending in Nigeria": "Trending", "Post as the President": "Post", "The feed": "Feed", "Bots": "Bots", "The off switch": "Off switch",
  "The armed forces": "Forces", "Programmes": "Programmes", "Your neighbours (fictional)": "Neighbours", "Operations in the field": "Operations",
};
type CardEl = ReactElement<{ title?: ReactNode; icon?: ReactNode }>;

/** Turns a stack of Cards into tabs: one tap on a heading shows just that card, so long screens stop being endless. */
export function CardTabs({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const all = Children.toArray(children).filter(isValidElement) as CardEl[];
  const cards = all.filter((c) => c.props.title !== undefined);
  const rest = all.filter((c) => c.props.title === undefined); // modals, notes: always shown
  const [i, setI] = useState(0);
  if (cards.length <= 1) return <div className="g-col" style={{ gap }}>{all}</div>;
  const cur = Math.min(i, cards.length - 1);
  const cats = cards.map((c, k) => {
    const raw = typeof c.props.title === "string" ? c.props.title : `Part ${k + 1}`;
    const em = raw.match(/^(\p{Extended_Pictographic}️?)\s*/u);
    const text = raw.replace(/^(\p{Extended_Pictographic}️?)\s*/u, "").replace(/ \(.*\)$/, "");
    return { id: String(k), label: SHORT[raw] ?? SHORT[text] ?? text, icon: c.props.icon ?? em?.[1] ?? "•" };
  });
  return (
    <div className="g-col" style={{ gap }}>
      <CategoryBar label="Part of this screen" value={String(cur)} onChange={(v) => setI(Number(v))} cats={cats} />
      {cards[cur]}
      {rest}
    </div>
  );
}
