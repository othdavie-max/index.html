
export type CallRow = { outcome: string | null };
export type CallStats = { calls: number; connected: number; interested: number; meetings: number; connectRate: number; interestRate: number };

const NOT_CONNECTED = new Set<string>(["no answer", "wrong number"]);
const INTERESTED = new Set<string>(["interested + WhatsApp consent", "meeting booked", "callback requested"]);

/**
 * Connect rate = connected calls / calls. Interest rate = interested / connected
 * (callback requests and meetings count as interest; "not interested" does not).
 */
export function callStats(rows: CallRow[]): CallStats {
  const calls = rows.length;
  const connected = rows.filter((r) => !NOT_CONNECTED.has(r.outcome ?? "no answer")).length;
  const interested = rows.filter((r) => INTERESTED.has(r.outcome ?? "")).length;
  const meetings = rows.filter((r) => r.outcome === "meeting booked").length;
  return { calls, connected, interested, meetings, connectRate: calls ? connected / calls : 0, interestRate: connected ? interested / connected : 0 };
}
