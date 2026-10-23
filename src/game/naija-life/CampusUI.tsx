"use client";

import { useState } from "react";
import type { Action } from "./engine";
import { CAMPUS_OPS, CLUBS, campusBlock, classOf, cutFor, enrolBlock, familyCanPay, jambBlock, meritAid, uniFee, type PayMode } from "./campus";
import { KIND_LABEL, MAJOR_BY_ID, UNIS, UNI_BY_ID, majorsOf, type Uni, type UniKind } from "./universities";
import { STATE_BY_ID } from "./data";
import type { Player } from "./types";
import { Badge, Btn, Card, H, Sheet, cx } from "./ui";
import { T, naira } from "./util";

type Run = (a: Action) => void;

const Chip = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className={cx("rounded-full border px-3 py-1 text-xs font-semibold", active ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")}>{children}</button>
);

/** Pick a university, a course and how you will pay. */
export function AdmissionCard({ p, run }: { p: Player; run: Run }) {
  const [kind, setKind] = useState<UniKind | "all">("all");
  const [uniId, setUniId] = useState<string | null>(null);
  const [majorId, setMajorId] = useState<string | null>(null);
  if (!p.flags.admOpen || p.school) return null;
  const score = Number(p.flags.admScore ?? 0);
  const list = UNIS.filter((u) => kind === "all" || u.kind === kind).sort((a, b) => b.prestige - a.prestige || a.fee - b.fee);
  const uni = uniId ? UNI_BY_ID[uniId] : null;
  const close = () => { setUniId(null); setMajorId(null); };
  const lowestFee = (u: Uni) => Math.min(...majorsOf(u).map((m) => uniFee(p, u, m)));
  const reachable = (u: Uni) => majorsOf(u).some((m) => score >= cutFor(p, u, m));
  return (
    <Card>
      <H sub={T(`JAMB score ${score}. Fees, cut-off marks and prestige all differ. Your family's wealth decides what you can afford.`, `JAMB score ${score}. Fees, cut-off and prestige all different. Your family money go decide wetin you fit afford.`)}>{T("Choose your university", "Choose your university")}</H>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(["all", "federal", "state", "private"] as const).map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{k === "all" ? T("All", "All") : KIND_LABEL[k]()}</Chip>)}
      </div>
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-0.5">
        {list.map((u) => (
          <button key={u.id} type="button" onClick={() => setUniId(u.id)} className={cx("w-full rounded-xl bg-slate-50 p-2.5 text-left", !reachable(u) && "opacity-55")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{u.short} <span className="font-normal text-slate-500">· {STATE_BY_ID[u.state]?.name}</span></div><div className="truncate text-[11px] text-slate-500">{u.name}</div></div>
              <div className="shrink-0 text-right text-[11px]"><div className="font-semibold text-blue-700">{T("from", "from")} {naira(lowestFee(u))}/{T("yr", "yr")}</div><div className="text-slate-500">{T("cut-off", "cut-off")} {u.cut}+</div></div>
            </div>
            <div className="mt-1 flex gap-1"><Badge tone={u.kind === "private" ? "gold" : "green"}>{KIND_LABEL[u.kind]()}</Badge><Badge>{T("Prestige", "Prestige")} {u.prestige}/10</Badge></div>
          </button>
        ))}
      </div>
      {uni && (
        <Sheet title={uni.name} onClose={close}>
          <p className="mb-2 text-xs text-slate-500">{uni.blurb}</p>
          {!majorId ? (
            <div className="space-y-1.5">
              {majorsOf(uni).map((m) => {
                const cut = cutFor(p, uni, m);
                const ok = score >= cut;
                return (
                  <button key={m.id} type="button" disabled={!ok} onClick={() => setMajorId(m.id)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm disabled:opacity-40">
                    <span><span className="font-semibold">{m.label}</span><span className="block text-[11px] text-slate-500">{m.years} {T("years", "years")} · {T("cut-off", "cut-off")} {cut}</span></span>
                    <span className="text-xs font-semibold text-blue-700">{naira(uniFee(p, uni, m))}/{T("yr", "yr")}</span>
                  </button>
                );
              })}
            </div>
          ) : (() => {
            const m = MAJOR_BY_ID[majorId];
            const fee = uniFee(p, uni, m);
            const aid = meritAid(p, uni, m);
            const modes: { id: PayMode; en: string; pcm: string; sub: string }[] = [
              { id: "family", en: "My family pays", pcm: "My family go pay", sub: familyCanPay(p, fee) ? T("They can manage it", "Dem fit manage am") : T("They cannot afford this", "Dem no fit afford am") },
              { id: "self", en: "I pay myself", pcm: "I go pay myself", sub: T(`First term needs about ${naira(fee / 3)}`, `First term need like ${naira(fee / 3)}`) },
              { id: "aid", en: "Scholarship", pcm: "Scholarship", sub: aid > 0 ? T(`${Math.round(aid * 100)}% off for your score`, `${Math.round(aid * 100)}% off for your score`) : T("Your score is not high enough", "Your score no high reach") },
            ];
            return (
              <div className="space-y-2">
                <div className="rounded-xl bg-blue-50 p-3 text-sm"><div className="font-semibold">{m.label}</div><div className="text-xs text-slate-600">{m.years} {T("years", "years")} · {naira(fee)}/{T("yr", "yr")}</div></div>
                {modes.map((x) => {
                  const b = enrolBlock(p, uni, m, x.id);
                  return (
                    <div key={x.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-sm"><div className="font-semibold">{T(x.en, x.pcm)}</div><div className="text-[11px] text-slate-500">{b ?? x.sub}</div></div>
                      <Btn small tone="gold" disabled={Boolean(b)} onClick={() => { run({ t: "enrol", uni: uni.id, major: m.id, pay: x.id }); close(); }}>{T("Enrol", "Enrol")}</Btn>
                    </div>
                  );
                })}
                <Btn small tone="ghost" onClick={() => setMajorId(null)}>{T("Back to courses", "Back to courses")}</Btn>
              </div>
            );
          })()}
        </Sheet>
      )}
    </Card>
  );
}

/** Student life: grades, offices and activities. */
export function CampusCard({ p, run }: { p: Player; run: Run }) {
  const [clubs, setClubs] = useState(false);
  const [sug, setSug] = useState(false);
  const c = p.campus;
  if (!c || c.graduated || p.school?.type !== "university") return null;
  const u = UNI_BY_ID[c.uni];
  const mj = MAJOR_BY_ID[c.major];
  const total = mj?.years ?? 4;
  const sugText = c.sug === "won" ? T("SUG president", "SUG president") : c.sug === "deptRep" ? T("Class rep", "Class rep") : c.sug === "lost" ? T("Lost SUG election", "Lost SUG election") : T("No office", "No office");
  return (
    <Card>
      <H sub={`${mj?.label ?? ""} · ${u?.name ?? ""}`}>{T("Campus life", "Campus life")} · {T("Year", "Year")} {Math.min(c.year, total)}/{total}</H>
      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
        {[
          [T("CGPA", "CGPA"), c.gpas.length ? c.cgpa.toFixed(2) : "–"],
          [T("Network", "Network"), String(Math.round(c.network))],
          [T("Leadership", "Leadership"), String(Math.round(c.lead))],
          [T("Record", "Record"), c.trouble >= 40 ? T("Poor", "Poor") : T("Clean", "Clean")],
        ].map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 py-1.5"><div className="text-sm font-bold text-slate-800">{v}</div><div className="text-slate-500">{k}</div></div>)}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
        <Badge tone={c.sug === "won" ? "green" : "gray"}>{sugText}</Badge>
        {c.gpas.length > 0 && <Badge tone="gold">{classOf(c.cgpa)}</Badge>}
        {c.clubs.map((id) => <Badge key={id}>{T(CLUBS.find((x) => x.id === id)?.en ?? id, CLUBS.find((x) => x.id === id)?.pcm ?? id)}</Badge>)}
        {c.siwes && <Badge tone="green">SIWES</Badge>}
        {c.offer && <Badge tone="green">{T("Job offer waiting", "Job offer dey wait")}</Badge>}
        {c.aid > 0 && <Badge tone="green">{T("Scholarship", "Scholarship")} {Math.round(c.aid * 100)}%</Badge>}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{T("Each activity can be done once a year. Grades are worked out when you grow up a year. Your results, network and offices help you after graduation.", "You fit do each activity once for one year. Dem go work out grade when you grow up. Your result, network and office go help you after school.")}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {CAMPUS_OPS.map((o) => {
          const b = o.id === "club" ? (c.used.includes("club") || c.clubs.length >= 3 ? campusBlock(p, "club", "x") ?? T("Already done this year", "You don do am this year") : null) : campusBlock(p, o.id, o.id === "sug" ? "low" : undefined);
          const hidden = (o.id === "siwes" && c.year < Math.max(2, total - 2)) || (o.id === "project" && c.year < total) || (o.id === "sug" && c.year < 2) || ((o.id === "sug" || o.id === "dept") && c.sug === "lost" && o.id === "sug");
          if (hidden && b) return null;
          return (
            <button key={o.id} type="button" disabled={Boolean(b) && o.id !== "sug"} onClick={() => (o.id === "club" ? setClubs(true) : o.id === "sug" ? setSug(true) : run({ t: "campus", op: o.id }))} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-left text-xs disabled:opacity-40">
              <span className="block font-semibold">{T(o.en, o.pcm)}</span>
              <span className="block text-[11px] text-slate-500">{b ?? T(o.descEn, o.descPcm)}</span>
            </button>
          );
        })}
      </div>
      {clubs && (
        <Sheet title={T("Join a club", "Join a club")} onClose={() => setClubs(false)}>
          <div className="space-y-1.5">
            {CLUBS.map((x) => {
              const b = campusBlock(p, "club", x.id);
              return (
                <div key={x.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-sm"><div className="font-semibold">{T(x.en, x.pcm)}</div><div className="text-[11px] text-slate-500">{b ?? x.blurb}</div></div>
                  <Btn small tone="gold" disabled={Boolean(b)} onClick={() => { run({ t: "campus", op: "club", arg: x.id }); setClubs(false); }}>{T("Join", "Join")}</Btn>
                </div>
              );
            })}
          </div>
        </Sheet>
      )}
      {sug && (
        <Sheet title={T("Run for SUG president", "Run for SUG president")} onClose={() => setSug(false)}>
          <p className="mb-2 text-xs text-slate-500">{T("Winning gives leadership, a huge network and a head start in politics. Chances depend on your network, leadership, reputation and your campaign money.", "If you win, you go get leadership, big network and head start for politics. Chance depend on your network, leadership, reputation and campaign money.")}</p>
          {(["low", "high"] as const).map((lv) => {
            const b = campusBlock(p, "sug", lv);
            return (
              <div key={lv} className="mb-1.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-sm"><div className="font-semibold">{lv === "low" ? T("Modest campaign", "Small campaign") : T("Big campaign", "Big campaign")}</div><div className="text-[11px] text-slate-500">{b ?? naira(lv === "low" ? 600_000 * p.index : 3_000_000 * p.index)}</div></div>
                <Btn small tone="gold" disabled={Boolean(b)} onClick={() => { run({ t: "campus", op: "sug", arg: lv }); setSug(false); }}>{T("Run", "Run")}</Btn>
              </div>
            );
          })}
        </Sheet>
      )}
    </Card>
  );
}

/** What is on your degree after graduation, plus the JAMB button. */
export function DegreeCard({ p, run }: { p: Player; run: Run }) {
  const c = p.campus;
  const b = jambBlock(p);
  return (
    <>
      {c?.graduated && (
        <p className="mt-1 text-xs text-slate-600">{UNI_BY_ID[c.uni]?.name}: {MAJOR_BY_ID[c.major]?.label} · {c.cls} (CGPA {c.cgpa.toFixed(2)}){c.sug === "won" ? ` · ${T("Former SUG president", "Former SUG president")}` : ""}</p>
      )}
      {p.edu === "secondary" && !p.school && !p.flags.admOpen && p.age >= 16 && p.age <= 40 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Btn small tone="gold" disabled={Boolean(b)} onClick={() => run({ t: "jamb" })}>{T("Write JAMB", "Write JAMB")}</Btn>
          <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "jamb", cheat: true })}>{T("Buy 'expo'", "Buy 'expo'")}</Btn>
          {b && <span className="self-center text-[11px] text-slate-500">{b}</span>}
        </div>
      )}
    </>
  );
}
