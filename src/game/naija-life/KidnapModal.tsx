"use client";

import { useState } from "react";
import { STATE_BY_ID } from "./data";
import type { KidnapAction } from "./kidnap";
import { kidnapShareText } from "./kidnap";
import { shareCard } from "./share";
import type { KidnapState, Player } from "./types";
import { T, naira } from "./util";
import { Btn, Card, Sheet, cx } from "./ui";

export function KidnapModal({ p, k, onAction, onDone }: { p: Player; k: KidnapState; onAction: (a: KidnapAction) => void; onDone: () => void }) {
  const [shared, setShared] = useState("");

  const doShare = async () => {
    const res = await shareCard(
      {
        kicker: T("Naija Life · Kidnapped", "Naija Life · Dem kidnap you"),
        title: T(`${p.name} ${p.surname} was kidnapped`, `Dem kidnap ${p.name} ${p.surname}`),
        stats: [
          { label: T("Ransom demanded", "Ransom wey dem ask"), value: naira(k.demand) },
          { label: T("Outcome", "How e end"), value: k.outcome === "dead" ? T("Did not survive", "E no survive") : k.outcome === "freed" ? T("Freed after ransom", "Dem free am after ransom") : k.outcome === "rescued" ? T("Rescued by soldiers", "Soldiers rescue am") : T("Escaped", "E escape") },
          { label: T("Location", "Where"), value: STATE_BY_ID[p.state].name },
        ],
        lines: [k.summary ?? ""],
      },
      kidnapShareText(p, k),
    );
    setShared(res === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };

  if (k.stage === "over") {
    const dead = k.outcome === "dead";
    return (
      <Sheet title={dead ? T("You did not survive", "You no survive") : T("You are free", "You don free")}>
        <p className="text-sm leading-relaxed text-white/85">{k.summary}</p>
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-black/30 p-3 text-xs text-white/60">
          {k.history.map((h, i) => (
            <p key={i}>• {h}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Btn tone="gold" onClick={doShare}>{T("Share this story", "Share this story")}</Btn>
          {shared && <p className="text-center text-xs text-emerald-300">{shared}</p>}
          <Btn onClick={onDone}>{dead ? T("Continue", "Continue") : T("Go on with your life", "Continue your life")}</Btn>
        </div>
      </Sheet>
    );
  }

  const canOffer = (pct: number) => k.demand * pct <= k.pool;
  return (
    <Sheet title={T("KIDNAPPED!", "DEM KIDNAP YOU!")}>
      <Card className="border-red-500/30 bg-red-950/40">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">{T("They demand", "Wetin dem dey ask")}</span>
          <span className="font-bold text-red-300">{naira(k.demand)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-white/70">{T("Family has raised", "Wetin family don gather")}</span>
          <span className="font-bold text-emerald-300">{naira(k.pool)}</span>
        </div>
        {k.stage === "negotiate" && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-white/70">{T("Their patience", "Their patience")}</span>
            <span aria-label={T(`${k.patience} of 3`, `${k.patience} for 3`)}>{"🔥".repeat(Math.max(0, k.patience))}{"▫️".repeat(Math.max(0, 3 - k.patience))}</span>
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
          <p className="text-xs text-white/60">{T("Your family has to raise money before talks begin. Each source can be used once.", "Your family must gather money before talks start. Each way na once only.")}</p>
          <Btn tone="ghost" className="w-full text-left" disabled={k.usedSavings || p.money <= 0} onClick={() => onAction({ type: "savings" })}>
            {T("Use your savings", "Use your savings")} {p.money > 0 && !k.usedSavings ? `(${naira(p.money)})` : ""}
          </Btn>
          {p.houses.map((h) => (
            <Btn key={h.id} tone="ghost" className="w-full text-left" onClick={() => onAction({ type: "sell", houseId: h.id })}>
              {T(`Sell ${h.kind} in ${STATE_BY_ID[h.state].name} fast (${naira(h.value * 0.65)})`, `Sell ${h.kind} for ${STATE_BY_ID[h.state].name} quick (${naira(h.value * 0.65)})`)}
            </Btn>
          ))}
          <Btn tone="ghost" className="w-full text-left" disabled={k.borrowedOnce} onClick={() => onAction({ type: "borrow" })}>{T("Borrow from friends & loan apps (adds debt)", "Borrow from friends & loan apps (e add debt)")}</Btn>
          <Btn tone="ghost" className="w-full text-left" disabled={k.fundraised} onClick={() => onAction({ type: "fundraise" })}>{T("Church & community fundraiser", "Church & community fundraiser")}</Btn>
          <Btn tone="gold" className="w-full" onClick={() => onAction({ type: "start" })}>{T("Start negotiating →", "Start to negotiate →")}</Btn>
        </div>
      )}

      {k.stage === "negotiate" && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-white/60">{T("Make an offer as a share of what they are asking. Too low and they lose patience.", "Offer small part of wetin dem ask. If e too low, dem go lose patience.")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[0.3, 0.45, 0.6, 0.8].map((pct) => (
              <Btn key={pct} tone="ghost" disabled={!canOffer(pct)} onClick={() => onAction({ type: "offer", pct })}>
                {T("Offer", "Offer")} {Math.round(pct * 100)}%
                <span className={cx("block text-[11px] font-normal", canOffer(pct) ? "text-white/60" : "text-red-300")}>{naira(k.demand * pct)}</span>
              </Btn>
            ))}
          </div>
          <Btn tone="gold" className="w-full" disabled={k.pool < k.demand} onClick={() => onAction({ type: "payfull" })}>
            {T(`Pay full demand (${naira(k.demand)})`, `Pay everything (${naira(k.demand)})`)}
          </Btn>
          <Btn tone="red" className="w-full" onClick={() => onAction({ type: "police" })}>{T("Call the police / army (risky)", "Call police / army (e risky)")}</Btn>
        </div>
      )}
    </Sheet>
  );
}
