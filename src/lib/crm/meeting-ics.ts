const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// RFC 5545: lines longer than 75 octets are folded with CRLF + space.
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > 74) { out.push(cur); cur = " " + ch; bytes = 1 + n; } else { cur += ch; bytes += n; }
  }
  out.push(cur);
  return out.join("\r\n");
}

export type IcsMeeting = { id: string; scheduled_at: string; duration_minutes: number; format: string; title: string; description?: string };

/** Read-only calendar feed for Google/Apple Calendar "subscribe by URL". No phone numbers in it. */
export function buildMeetingsIcs(meetings: IcsMeeting[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Parvez Dubai Properties//Lead Engine//EN", "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Lead Engine meetings",
    ...meetings.flatMap((m) => {
      const start = new Date(m.scheduled_at);
      return [
        "BEGIN:VEVENT", `UID:crm-meeting-${m.id}@leadengine`, `DTSTAMP:${fmt(now)}`,
        `DTSTART:${fmt(start)}`, `DTEND:${fmt(new Date(start.getTime() + m.duration_minutes * 60_000))}`,
        `SUMMARY:${esc(m.title)}`, ...(m.description ? [`DESCRIPTION:${esc(m.description)}`] : []),
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
