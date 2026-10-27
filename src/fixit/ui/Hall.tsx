"use client";
/** Hall of Presidents: every finished term you have played on this device, best first. */
import { useEffect, useState } from "react";
import { useFix } from "./store";
import { Badge, Button, EmptyState, Modal } from "../../game/ui/kit";
import type { HallEntry } from "../persistence";
import { issuesLabel, DIFFICULTY } from "../engine/setup";
import { ENDINGS } from "../engine/endings";

export function Hall({ onClose }: { onClose: () => void }) {
  const { saves } = useFix();
  const [list, setList] = useState<HallEntry[] | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  useEffect(() => { saves.hall().then(setList).catch(() => setList([])); saves.endings().then(setUnlocked).catch(() => undefined); }, [saves]);
  const d = new Date(); const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const dailyBest = (list ?? []).filter((h) => h.daily === today)[0];
  return (
    <Modal title="🏛️ Hall of Presidents" wide onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="g-section-title">Endings you have found ({unlocked.length}/{ENDINGS.length})</div>
      <div className="fx-gallery" style={{ marginBottom: 12 }}>
        {ENDINGS.map((e) => { const on = unlocked.includes(e.id); return <div key={e.id} className="fx-end" data-lock={on ? undefined : "1"}><div style={{ fontSize: 26 }} aria-hidden>{on ? e.icon : "❓"}</div><b className="g-small">{on ? e.name : "???"}</b><div className="g-tiny">{on ? e.blurb : "Not found yet"}</div></div>; })}
      </div>
      {dailyBest && <div className="g-card-flat" style={{ marginBottom: 10 }}>📅 <b>Today's daily challenge:</b> your best score on this device is <b>{dailyBest.score}</b> ({dailyBest.ending ?? dailyBest.title}).</div>}
      {!list ? <div className="g-small">Loading…</div> : list.length === 0 ? <EmptyState title="No terms finished yet" body="Finish a term and it will be recorded here, with your title and results. Records stay on this device." /> : (
        <div className="g-col" style={{ gap: 0 }}>
          {list.map((h, i) => (
            <div key={h.id} className="g-list-row" style={{ alignItems: "flex-start" }}>
              <b style={{ width: 28, fontSize: 18, color: i === 0 ? "#b45309" : "#64748b" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</b>
              <div className="g-grow">
                <div className="g-row g-wrap" style={{ gap: 6 }}><b>{h.president}</b><Badge tone="navy">{h.title}</Badge><Badge tone={h.result === "won" || h.result === "completed" ? "green" : "red"}>{h.result === "won" ? "Re-elected" : h.result === "completed" ? "Served two terms" : h.result === "removed" ? "Removed" : "Voted out"}</Badge></div>
                <div className="g-tiny g-muted">{issuesLabel(h.scenario)} · {DIFFICULTY[h.difficulty as keyof typeof DIFFICULTY]?.label ?? h.difficulty} · term {h.term} · {new Date(h.date).toLocaleDateString()}</div>
                <div className="g-small" style={{ marginTop: 2 }}>Inflation {h.inflation[0]}% → {h.inflation[1]}% · naira ₦{h.fx[0].toLocaleString()} → ₦{h.fx[1].toLocaleString()} · {h.projects} projects · approval {h.approval}%{h.vote !== null ? ` · ${h.vote}% of the vote` : ""}</div>
              </div>
              <b className="g-num">{h.score}</b>
            </div>
          ))}
          <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Score: final approval, plus lower inflation, a stronger naira, projects delivered and staying in office, minus bribes taken.</div>
        </div>
      )}
    </Modal>
  );
}
