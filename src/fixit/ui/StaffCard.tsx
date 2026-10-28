"use client";
import { Card, Portrait } from "../../game/ui/kit";
import { Users } from "lucide-react";
import { useS } from "./store";
import { AIDE_KINDS } from "../engine/dayone";
import { BackerRow } from "./DayOne";

export function StaffCard() {
  const s = useS();
  const a = s.staff.cos;
  return (
    <>
      <Card title="Your advisers" icon={<Users size={16} />}>
        <div className="g-col" style={{ gap: 12 }}>
          {([["Chief of Staff", a], ["Vice President", s.staff.vp ?? null]] as const).map(([role, x]) => (
            x ? (
              <div key={role} className="g-row" style={{ gap: 12 }}>
                <Portrait p={x.portrait} size={48} name={x.name} />
                <div className="g-grow"><b>{x.name}</b> <span className="g-tiny g-muted">· {role}</span><div className="g-tiny g-muted">{AIDE_KINDS[x.kind].icon} {AIDE_KINDS[x.kind].tag}</div><div className="g-small">{AIDE_KINDS[x.kind].perk}</div></div>
              </div>
            ) : <div key={role} className="g-small g-muted">No {role}.</div>
          ))}
        </div>
      </Card>
      <Card title="Your backers" icon={<Users size={16} />}>
        <BackerRow gifts />
        <div className="g-tiny g-muted" style={{ marginTop: 8 }}>The people who paid for your campaign. Give them jobs and contracts and they steal and want more. Freeze them out and they will fight you: sponsored protests, bandits in their zone, a blocked Assembly.</div>
      </Card>
    </>
  );
}
