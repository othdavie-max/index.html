/**
 * Google Calendar push sync for the owner's calendar, using the REST API directly.
 * Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (and optionally
 * GOOGLE_CALENDAR_ID, default "primary"). When unset, every call is a no-op so the CRM
 * works without it; the ICS feed (/api/crm/calendar) is the zero-setup alternative.
 */
export type CalendarEvent = { id: string; title: string; description: string; start: Date; durationMinutes: number };

export const isGoogleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);

const calUrl = (suffix = "") =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID ?? "primary")}/events${suffix}`;

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status})`);
  return (await res.json()).access_token as string;
}

const body = (e: CalendarEvent) => ({
  summary: e.title, description: e.description,
  start: { dateTime: e.start.toISOString() },
  end: { dateTime: new Date(e.start.getTime() + e.durationMinutes * 60_000).toISOString() },
});

async function call(method: string, url: string, payload?: unknown) {
  const res = await fetch(url, {
    method, headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok && !(method === "DELETE" && (res.status === 404 || res.status === 410))) throw new Error(`Google Calendar ${method} failed (${res.status})`);
  return method === "DELETE" ? null : res.json();
}

/** Returns the Google event id, or null when sync is not configured. Throws on API failure. */
export async function createGoogleEvent(e: CalendarEvent): Promise<string | null> {
  if (!isGoogleConfigured()) return null;
  return (await call("POST", calUrl(), body(e))).id as string;
}
export async function deleteGoogleEvent(eventId: string | null): Promise<void> {
  if (!eventId || !isGoogleConfigured()) return;
  await call("DELETE", calUrl(`/${encodeURIComponent(eventId)}`));
}
