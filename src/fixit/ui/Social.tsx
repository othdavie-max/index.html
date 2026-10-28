"use client";
/** Naija X: the feed, the trending list, your own posts, accounts that remember you, the bot army and the off switch. */
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import { Button, Card, Initials, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { BOT_LEVELS, POST_KINDS, X, acctActions, actOnAcct, banX, playerPost, postBlock, profileOf, realMood, reportBots, seedFeed, setBots, shownMood, threads, trending, unbanX, ME, type XPost } from "../engine/social";
import { monthLabel } from "../engine/util";
import { sfx } from "./sound";

const face = (m: number) => (m > 35 ? "😄" : m > 12 ? "🙂" : m > -12 ? "😐" : m > -35 ? "😠" : "🤬");
const colorOf = (k: string) => (k === "journalist" ? "#1d4ed8" : k === "activist" ? "#9f1239" : k === "loyalist" ? "#047857" : k === "troll" ? "#7c2d12" : k === "bot" ? "#64748b" : k === "official" ? "#0b1f36" : "#334155");
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

export function XPanel() {
  const s = useS();
  const { act, tx } = useFix();
  const [profile, setProfile] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const x = X(s);
  const empty = x.posts.length === 0;
  useEffect(() => { if (empty) act(seedFeed, { silent: true }); }, [empty, act]);
  const tags = trending(x);
  const list = threads(s);
  const shown = shownMood(s), real = realMood(s);
  const hidden = shown - real >= 8;
  const Post = ({ p, reply }: { p: XPost; reply?: boolean }) => {
    const a = profileOf(s, p.by);
    const blocked = !!x.accts.find((y) => y.id === p.by)?.blocked;
    return (
      <div className={reply ? "fx-post fx-reply" : "fx-post"} data-player={p.player ? "1" : undefined}>
        <button className="fx-avatar" aria-label={`Open ${a.name}`} onClick={() => p.by !== ME && setProfile(p.by)}><Initials name={a.name} size={reply ? 28 : 36} color={colorOf(a.kind)} /></button>
        <div className="g-grow">
          <div className="g-small"><b>{a.name}</b>{a.verified && <span title="Verified"> ✅</span>} <span className="g-muted">{a.handle}</span> <span className="g-tiny g-muted">· {monthLabel(p.month)}{p.vpn ? " · via VPN" : ""}</span></div>
          {blocked ? <div className="g-small g-muted">🚫 You blocked this account. Everyone else can still see this post.</div> : <div className="g-small">{tx(p.text)}</div>}
          {p.tag && !blocked && <span className="fx-tag">{p.tag}</span>}
          {p.bot && <span className="g-tiny g-muted"> · looks automated</span>}
          {!reply && <div className="g-tiny g-muted fx-stats"><span><MessageCircle size={11} /> {x.posts.filter((r) => r.parent === p.id).length}</span><span><Repeat2 size={11} /> {compact(p.reposts)}</span><span><Heart size={11} /> {compact(p.likes)}</span></div>}
        </div>
      </div>
    );
  };
  const prof = profile ? profileOf(s, profile) : null;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Card title="Naija X today" icon={<span aria-hidden>🐦</span>}>
        <div className="fx-xmood">
          <div><div className="g-tiny g-muted">What your feed says</div><div className="fx-xface" aria-label={`Feed mood ${shown}`}>{face(shown)} <b className="g-num">{shown > 0 ? "+" : ""}{shown}</b></div></div>
          <div><div className="g-tiny g-muted">What people really feel</div><div className="fx-xface" aria-label={`Real mood ${real}`}>{face(real)} <b className="g-num">{real > 0 ? "+" : ""}{real}</b></div></div>
        </div>
        {hidden && <div className="g-tiny" style={{ color: "#b45309", marginTop: 6 }}>Your bots and blocked accounts make the feed look kinder than the country feels. Protests follow the real number.</div>}
        {x.banned !== null && <div className="g-small" style={{ color: "#b91c1c", marginTop: 6 }}>🔌 Naija X has been switched off for {Math.max(1, s.month - x.banned)} month(s). What you see below is VPN traffic.</div>}
        {real < -40 && x.banned === null && <div className="g-tiny" style={{ color: "#b91c1c", marginTop: 6 }}>Online anger is high. A hashtag is one bad week from becoming a crowd.</div>}
      </Card>
      <Card title="Trending in Nigeria" icon={<span aria-hidden>📈</span>}>
        {tags.length === 0 ? <div className="g-small g-muted">Quiet. Nothing is trending.</div> : (
          <div className="g-col" style={{ gap: 6 }}>
            {tags.map((t, i) => (
              <div key={t.tag} className="fx-trend" data-tone={t.tone}>
                <span className="g-tiny g-muted">{i + 1}</span>
                <div className="g-grow"><b className="g-small">{t.tag}</b><div className="g-tiny g-muted">{tx(t.why)}</div></div>
                <span className="g-tiny g-muted">{compact(Math.round(t.heat * 1900))} posts</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Post as the President" icon={<span aria-hidden>✍️</span>}>
        <div className="g-small g-muted" style={{ marginBottom: 6 }}>One post every two months. People remember what you say here, and what you do afterwards.</div>
        <div className="fx-powers">
          {POST_KINDS.map((p) => {
            const block = postBlock(s, p);
            const sel = pick[p.id] ?? p.choices?.[0]?.id;
            return (
              <div key={p.id} className="fx-power" data-blocked={block ? "1" : undefined}>
                <div className="g-row" style={{ gap: 8 }}><span style={{ fontSize: 22 }} aria-hidden>{p.icon}</span><b>{p.title}</b></div>
                <div className="g-tiny g-muted">{p.blurb}</div>
                {p.choices && <select aria-label={p.title} value={sel} onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })} style={{ fontSize: 12 }}>{p.choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>}
                {block ? <div className="g-tiny" style={{ color: "#92400e" }}>{block}</div> : <Button size="sm" onClick={() => { sfx("tap"); act((g) => playerPost(g, p.id, sel)); }}>Post{p.pc ? ` ⚡${p.pc}` : ""}</Button>}
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="The feed" icon={<span aria-hidden>💬</span>}>
        <div className="g-col" style={{ gap: 0 }}>
          {list.length === 0 && <div className="g-small g-muted">Nothing yet. Take a decision, or end a month.</div>}
          {list.map((t) => (
            <div key={t.post.id} className="fx-thread">
              <Post p={t.post} />
              {t.replies.length > 0 && (open === t.post.id ? <div className="fx-replies">{t.replies.map((r) => <Post key={r.id} p={r} reply />)}<button className="fx-link" onClick={() => setOpen(null)}>Hide replies</button></div> : <button className="fx-link" onClick={() => setOpen(t.post.id)}>Show {t.replies.length} repl{t.replies.length === 1 ? "y" : "ies"}</button>)}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Bots" icon={<span aria-hidden>🤖</span>}>
        <div className="g-small g-muted">A paid army can fill the feed with praise and cool the streets a little. It costs money every month, the feed will look better than the country feels, and sooner or later a journalist follows the payments.</div>
        <div className="g-row g-wrap" style={{ gap: 6, marginTop: 8 }}>
          {BOT_LEVELS.map((b) => <Button key={b.lvl} size="sm" variant={x.bots === b.lvl ? "primary" : "default"} onClick={() => { sfx("tap"); act((g) => setBots(g, b.lvl as 0 | 1 | 2 | 3)); }}>{b.label}{b.cost ? ` · ₦${b.cost}bn/mo` : ""}</Button>)}
        </div>
        {x.exposed > 0 && <div className="g-tiny" style={{ color: "#b91c1c", marginTop: 6 }}>You have been caught running bots {x.exposed} time(s).</div>}
        {x.hostileUntil >= s.month && <div className="g-row" style={{ gap: 8, marginTop: 8 }}><span className="g-small">🚩 Hostile accounts are pushing a trend against you.</span><Button size="sm" onClick={() => { sfx("tap"); act(reportBots); }}>Report them ⚡1</Button></div>}
      </Card>
      <Card title="The off switch" icon={<span aria-hidden>🔌</span>}>
        <div className="g-small g-muted">You can switch Naija X off nationwide. The feed goes quiet and so does the street, for a while. Then investors, the young and foreign governments push back, and the anger arrives anyway.</div>
        <div style={{ marginTop: 8 }}>{x.banned === null ? <Button size="sm" onClick={() => { sfx("tap"); act(banX); }}>Switch it off ⚡8</Button> : <Button size="sm" variant="primary" onClick={() => { sfx("tap"); act(unbanX); }}>Switch it back on ⚡2</Button>}</div>
      </Card>
      {prof && (
        <Modal title={<>{prof.name} <span className="g-muted g-small">{prof.handle}</span></>} onClose={() => setProfile(null)}>
          <div className="g-col" style={{ gap: 10 }}>
            <div className="g-row" style={{ gap: 10 }}><Initials name={prof.name} size={48} color={colorOf(prof.kind)} /><div className="g-grow"><div className="g-small">{tx(prof.bio || "No bio. Probably a bot.")}</div><div className="g-tiny g-muted">{compact(prof.followers)} followers · {prof.kind}</div></div><div style={{ fontSize: 28 }} aria-label={`Mood ${prof.mood}`}>{face(prof.mood)}</div></div>
            <div><div className="g-section-title">What they remember about you</div>{prof.mem.length === 0 ? <div className="g-small g-muted">Nothing yet.</div> : <ul className="g-small" style={{ margin: 0, paddingLeft: 18 }}>{[...prof.mem].reverse().map((m, i) => <li key={i} style={{ color: m.good ? "#047857" : "#b91c1c" }}>{monthLabel(m.m)}: {tx(m.t)}</li>)}</ul>}</div>
            <div className="g-row g-wrap" style={{ gap: 6 }}>
              {acctActions(prof).map((a) => <Button key={a.id} size="sm" onClick={() => { sfx("tap"); act((g) => actOnAcct(g, prof.id, a.id)); setProfile(null); }}>{a.label}{a.pc ? ` ⚡${a.pc}` : ""}</Button>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
