"use client";
import { useState } from "react";
import { AlertTriangle, Dices, Coins } from "lucide-react";
import { useGame, useS } from "./store";
import { Button, Callout, Modal, Badge } from "./kit";
import { EVENT_BY_ID } from "../data/events";

/** Shows the first pending decision. Choices with a cost or risk require a second, explicit confirmation. */
export function DecisionDialog() {
  const state = useS();
  const { dispatch } = useGame();
  const pd = state.pending[0];
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  if (!pd && !result) return null;
  const def = pd ? EVENT_BY_ID[pd.defId] : null;

  if (result) {
    return (
      <Modal title="Outcome" closable={false} footer={<Button variant="primary" onClick={() => setResult(null)}>Continue</Button>}>
        <div style={{ lineHeight: 1.55 }}>{result}</div>
      </Modal>
    );
  }
  const choice = pd.choices.find((c) => c.id === picked);
  const commit = (id: string) => {
    const r = dispatch({ t: "decide", occurrenceId: pd.occurrenceId, choiceId: id }, { silent: true });
    setPicked(null);
    setResult(r.message);
  };

  return (
    <Modal title={pd.title} closable={false}>
      {!choice ? (
        <>
          <div style={{ lineHeight: 1.55 }}>{pd.text}</div>
          {def && <div className="g-tiny g-muted">{def.provenance.kind === "historical-inspired" ? `Inspired by real events: ${def.provenance.note}` : def.provenance.kind === "recurring-reality" ? "A recurring kind of real-world development, fictionalised here." : "Invented for the game."}</div>}
          <div className="g-col">
            {pd.choices.map((c) => (
              <button key={c.id} className="g-card-flat" disabled={!!c.disabledReason} onClick={() => (c.costText || c.risk ? setPicked(c.id) : commit(c.id))} style={{ textAlign: "left", cursor: c.disabledReason ? "not-allowed" : "pointer", opacity: c.disabledReason ? 0.55 : 1 }}>
                <div className="g-row g-between g-wrap"><b>{c.label}</b><span className="g-row" style={{ gap: 6 }}>{c.costText && <Badge tone="amber"><Coins size={12} /> {c.costText}</Badge>}{c.risk && <Badge tone={c.risk.startsWith("Unlawful") ? "red" : "blue"}><Dices size={12} /> {c.risk.startsWith("Unlawful") ? "Unlawful" : "Uncertain"}</Badge>}</span></div>
                <div className="g-small g-muted">{c.desc}</div>
                {c.disabledReason && <div className="g-tiny" style={{ color: "#be123c", marginTop: 4 }}>{c.disabledReason}</div>}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div><b>{choice.label}</b></div>
          <div className="g-small" style={{ lineHeight: 1.55 }}>{choice.desc}</div>
          <div className="g-grid g-grid-2">
            <div className="g-card-flat"><div className="g-tiny g-muted">Cost</div><b>{choice.costText ?? "No direct cost"}</b></div>
            <div className="g-card-flat"><div className="g-tiny g-muted">Uncertainty</div><b>{choice.risk ? (choice.risk.startsWith("Unlawful") ? "High — evidence may surface" : "Depends on your skills and luck") : "Outcome is certain"}</b></div>
          </div>
          {choice.risk && <Callout tone={choice.risk.startsWith("Unlawful") ? "bad" : "info"}><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {choice.risk}</Callout>}
          <div className="g-row" style={{ justifyContent: "flex-end" }}>
            <Button onClick={() => setPicked(null)}>Back</Button>
            <Button variant={choice.risk?.startsWith("Unlawful") ? "danger" : "primary"} onClick={() => commit(choice.id)}>Confirm</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
