"use client";
/** Hall of Presidents: every finished term you have played on this device, best first. */
import { useEffect, useState } from "react";
import { useFix } from "./store";
import { Badge, Button, EmptyState, Modal } from "../../game/ui/kit";
import type { HallEntry } from "../persistence";
import { SCENARIO_BY_ID, DIFFICULTY } from "../engine/setup";

export function Hall({ onClose }: { onClose: () => void }) {
  const { saves } = useFix();
  const [list, setList] = useState<HallEntry[] | null>(null);
  useEffect(() => { saves.hall().then(setList).catch(() => setList([])); }, [saves]);
  return (
    <Modal title="🏛️ Hall of Presidents" wide onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      {!list ? <div className="g-small">Loading…</div> : list.length === 0 ? <EmptyState title="No terms finished yet" body="Finish a term and it will be recorded here, with your title and results. Records stay on this device." /> : (
        <div className="g-col" style={{ gap: 0 }}>
          {list.map((h, i) => (
            <div key={h.id} className="g-list-row" style={{ alignItems: "flex-start" }}>
              <b style={{ width: 28, fontSize: 18, color: i === 0 ? "#b45309" : "#64748b" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</b>
              <div className="g-grow">
                <div className="g-row g-wrap" style={{ gap: 6 }}><b>{h.president}</b><Badge tone="navy">{h.title}</Badge><Badge tone={h.result === "won" || h.result === "completed" ? "green" : "red"}>{h.result === "won" ? "Re-elected" : h.result === "completed" ? "Served two terms" : h.result === "removed" ? "Removed" : "Voted out"}</Badge></div>
                <div className="g-tiny g-muted">{SCENARIO_BY_ID[h.scenario]?.name ?? h.scenario} · {DIFFICULTY[h.difficulty as keyof typeof DIFFICULTY]?.label ?? h.difficulty} · term {h.term} · {new Date(h.date).toLocaleDateString()}</div>
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
