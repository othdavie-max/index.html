"use client";

import { useState } from "react";
import { STATE_BY_ID } from "./data";
import type { KidnapAction } from "./kidnap";
import { kidnapShareText } from "./kidnap";
import { shareCard } from "./share";
import type { KidnapState, Player } from "./types";
import { naira } from "./util";
import { Btn, Card, Sheet, cx } from "./ui";

export function KidnapModal({ p, k, onAction, onDone }: { p: Player; k: KidnapState; onAction: (a: KidnapAction) => void; onDone: () => void }) {
  const [shared, setShared] = useState("");

  const doShare = async () => {
    const res = await shareCard(
      {
        kicker: "Naija Life · Kidnapped",
        title: `${p.name} ${p.surname} was kidnapped`,
        stats: [
          { label: "Ransom demanded", value: naira(k.demand) },
          { label: "Outcome", value: k.outcome === "dead" ? "Did not survive" : k.outcome === "freed" ? "Freed after ransom" : k.outcome === "rescued" ? "Rescued by soldiers" : "Escaped" },
          { label: "Location", value: STATE_BY_ID[p.state].name },
        ],
        lines: [k.summary ?? ""],
      },
      kidnapShareText(p, k),
    );
    setShared(res === "shared" ? "Shared!" : "Card ready. Save it or screenshot it!");
  };

  if (k.stage === "over") {
    const dead = k.outcome === "dead";
    return (
      <Sheet title={dead ? "You did not survive" : "You are free"}>
        <p className="text-sm leading-relaxed text-white/85">{k.summary}</p>
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-black/30 p-3 text-xs text-white/60">
          {k.history.map((h, i) => (
            <p key={i}>• {h}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Btn tone="gold" onClick={doShare}>Share this story</Btn>
          {shared && <p className="text-center text-xs text-emerald-300">{shared}</p>}
          <Btn onClick={onDone}>{dead ? "Continue" : "Go on with your life"}</Btn>
        </div>
      </Sheet>
    );
  }

  const canOffer = (pct: number) => k.demand * pct <= k.pool;
  return (
    <Sheet title="KIDNAPPED!">
      <Card className="border-red-500/30 bg-red-950/40">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">They demand</span>
          <span className="font-bold text-red-300">{naira(k.demand)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-white/70">Family has raised</span>
          <span className="font-bold text-emerald-300">{naira(k.pool)}</span>
        </div>
        {k.stage === "negotiate" && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-white/70">Their patience</span>
            <span aria-label={`${k.patience} of 3`}>{"🔥".repeat(Math.max(0, k.patience))}{"▫️".repeat(Math.max(0, 3 - k.patience))}</span>
          </div>
        )}
      </Card>

      <div className="mt-3 max-h-36 space-y-1.5 overflow-y-auto rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-white/75">
        {k.history.map((h, i) => (
          <p key={i}>• {h}</p>
        ))}
      </div>

      {k.stage === "raise" && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-white/60">Your family has to raise money before talks begin. Each source can be used once.</p>
          <Btn tone="ghost" className="w-full text-left" disabled={k.usedSavings || p.money <= 0} onClick={() => onAction({ type: "savings" })}>
            Use your savings {p.money > 0 && !k.usedSavings ? `(${naira(p.money)})` : ""}
          </Btn>
          {p.houses.map((h) => (
            <Btn key={h.id} tone="ghost" className="w-full text-left" onClick={() => onAction({ type: "sell", houseId: h.id })}>
              Sell {h.kind} in {STATE_BY_ID[h.state].name} fast ({naira(h.value * 0.65)})
            </Btn>
          ))}
          <Btn tone="ghost" className="w-full text-left" disabled={k.borrowedOnce} onClick={() => onAction({ type: "borrow" })}>Borrow from friends & loan apps (adds debt)</Btn>
          <Btn tone="ghost" className="w-full text-left" disabled={k.fundraised} onClick={() => onAction({ type: "fundraise" })}>Church & community fundraiser</Btn>
          <Btn tone="gold" className="w-full" onClick={() => onAction({ type: "start" })}>Start negotiating →</Btn>
        </div>
      )}

      {k.stage === "negotiate" && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-white/60">Make an offer as a share of what they are asking. Too low and they lose patience.</p>
          <div className="grid grid-cols-2 gap-2">
            {[0.3, 0.45, 0.6, 0.8].map((pct) => (
              <Btn key={pct} tone="ghost" disabled={!canOffer(pct)} onClick={() => onAction({ type: "offer", pct })}>
                Offer {Math.round(pct * 100)}%
                <span className={cx("block text-[11px] font-normal", canOffer(pct) ? "text-white/60" : "text-red-300")}>{naira(k.demand * pct)}</span>
              </Btn>
            ))}
          </div>
          <Btn tone="gold" className="w-full" disabled={k.pool < k.demand} onClick={() => onAction({ type: "payfull" })}>
            Pay full demand ({naira(k.demand)})
          </Btn>
          <Btn tone="red" className="w-full" onClick={() => onAction({ type: "police" })}>Call the police / army (risky)</Btn>
        </div>
      )}
    </Sheet>
  );
}
