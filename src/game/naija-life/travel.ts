import { STATE_BY_ID, travelCost } from "./data";
import { I } from "./helpers";
import { netWorth } from "./kidnap";
import { kidnapMultiplier } from "./news";
import { VEHICLE_MODELS, modelOf, needsLicense } from "./vehicles";
import type { Player, StateInfo } from "./types";
import { T, clamp } from "./util";

export type TransportMode = "bus" | "ride" | "car" | "flight" | "jet" | "heli";

export interface TransportOption {
  id: TransportMode;
  label: string;
  blurb: string;
  cost: number;
  /** Chance of being kidnapped on this trip. */
  risk: number;
  block: string | null;
  road: boolean;
}

const ownsCat = (p: Player, cats: string[]) => p.vehicles.some((v) => cats.includes(modelOf(v.modelId)?.cat ?? "") && v.condition > 10);

/** Chance of being snatched on the way, by how you travel and where you go. */
export function tripRisk(p: Player, from: StateInfo, to: StateInfo, mode: TransportMode): number {
  if (from.abroad || to.abroad) return mode === "jet" ? 0 : 0.004;
  const roadBase = 0.008 + 0.0042 * ((from.risk + to.risk * 1.5) / 2.5);
  const factor: Record<TransportMode, number> = { bus: 1, ride: 0.7, car: 0.55, flight: 0.03, jet: 0.006, heli: 0.015 };
  const worth = Math.max(0, netWorth(p) / p.index);
  const visible = 1 + clamp(Math.log10(Math.max(worth, 1e6) / 1e6) / 5, 0, 1.2);
  let r = roadBase * factor[mode] * (["bus", "ride", "car"].includes(mode) ? visible : 1);
  if (["bus", "ride", "car"].includes(mode)) {
    if (p.flags.own_bodyguards) r *= 0.55;
    if (p.flags.own_convoy) r *= 0.6;
  }
  return clamp(r * kidnapMultiplier(p), 0, 0.2);
}

export const riskLabel = (r: number) => (r < 0.004 ? T("Very low risk", "Risk no plenty at all") : r < 0.012 ? T("Low risk", "Small risk") : r < 0.03 ? T("Medium risk", "Medium risk") : T("High risk", "Risk plenty"));

export function transportOptions(p: Player, to: StateInfo): TransportOption[] {
  const from = STATE_BY_ID[p.state];
  const abroad = Boolean(from.abroad || to.abroad);
  const base = Math.round(travelCost(from, to) * p.index * (from.abroad ? 6 : 1));
  const abroadCost = Math.round(travelCost(from, to) * p.index * (from.abroad ? 6 : to.abroad ? 6 : 1));
  const out: TransportOption[] = [];
  const opt = (id: TransportMode, label: string, blurb: string, cost: number, block: string | null, road: boolean) => out.push({ id, label, blurb, cost: Math.round(cost), risk: tripRisk(p, from, to, id), block, road });
  const hasCar = p.vehicles.some((v) => v.role === "personal" && v.condition > 10 && needsLicense(modelOf(v.modelId) ?? VEHICLE_MODELS[3]));
  const noRoad = abroad ? T("Not possible for this trip", "E no fit for this trip") : null;
  opt("bus", T("Public transport", "Public transport"), T("Cheap, slow, crowded. Roads are where most kidnappings happen.", "E cheap, slow, and people plenty. Na road dem dey kidnap most."), base * 0.7, noRoad, true);
  opt("ride", T("Hire a private car", "Hire private car"), T("A driver takes you door to door. Safer than a bus.", "Driver go carry you reach door. E safer pass bus."), base * 1.6, noRoad, true);
  opt("car", T("Drive your own car", "Drive your own car"), T("Needs a licence and a car. You only pay fuel.", "You need licence and car. Na only fuel you go pay."), base * 0.5, noRoad ?? (!p.possessions.license ? T("Needs a driver's licence", "Need driver's licence") : !hasCar ? T("You do not own a car", "You no get car") : null), true);
  opt("flight", T("Commercial flight", "Commercial flight"), T("Quick and fairly safe. Delays happen.", "E quick and e safe small. Delay dey happen."), abroad ? abroadCost : base * 2.4, null, false);
  opt("heli", T("Your helicopter", "Your helicopter"), T("Fly yourself over the traffic. Domestic only.", "Fly pass traffic. For inside Naija only."), I(p, 900_000), abroad ? T("Not possible for this trip", "E no fit for this trip") : !ownsCat(p, ["helicopter"]) ? T("You do not own a helicopter", "You no get helicopter") : null, false);
  opt("jet", T("Your private jet", "Your private jet"), T("Fly anywhere, on your own time. Crew and fuel are costly.", "Fly anywhere, any time. Crew and fuel cost well."), abroad ? I(p, 9_000_000) : I(p, 2_500_000), !ownsCat(p, ["jet"]) ? T("You do not own a jet", "You no get jet") : null, false);
  return out;
}

export const optionOf = (p: Player, to: StateInfo, mode: TransportMode) => transportOptions(p, to).find((o) => o.id === mode);
