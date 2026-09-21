function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcsFile(
  events: { title: string; description: string; date: Date }[],
  calendarName = "Baseline Study Abroad Timeline",
) {
  const now = formatIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baseline Educational Services//Timeline Planner//EN",
    `X-WR-CALNAME:${calendarName}`,
    ...events.flatMap((e, i) => [
      "BEGIN:VEVENT",
      `UID:baseline-milestone-${i}-${Date.now()}@baselineeducationalservices.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${e.date.toISOString().slice(0, 10).replace(/-/g, "")}`,
      `SUMMARY:${e.title}`,
      `DESCRIPTION:${e.description.replace(/\n/g, "\\n")}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
