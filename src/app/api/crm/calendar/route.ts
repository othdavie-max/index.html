import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { buildMeetingsIcs } from "@/lib/crm/meeting-ics";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Read-only ICS feed of booked/held meetings for "Add calendar > From URL" in Google Calendar.
 * Protected by CRM_ICS_TOKEN (?token=…). Contains names only: no phone numbers or notes.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRM_ICS_TOKEN;
  const given = request.nextUrl.searchParams.get("token") ?? "";
  const a = Buffer.from(given), b = Buffer.from(expected ?? "");
  if (!expected || expected.length < 24 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const db = createAdminClient() as unknown as SupabaseClient | null;
  if (!db) return new NextResponse("Not configured", { status: 503 });

  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data, error } = await db.from("crm_meetings").select("id, scheduled_at, duration_minutes, format, status, crm_leads(full_name)")
    .in("status", ["booked", "held"]).gte("scheduled_at", since).order("scheduled_at");
  if (error) return new NextResponse("Error", { status: 500 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const rows = (data ?? []) as unknown as { id: string; scheduled_at: string; duration_minutes: number; format: string; status: string; crm_leads: { full_name: string } | null }[];
  const ics = buildMeetingsIcs(rows.map((m) => ({
    id: m.id, scheduled_at: m.scheduled_at, duration_minutes: m.duration_minutes, format: m.format,
    title: `Meeting: ${m.crm_leads?.full_name ?? "Lead"} (${m.format})`, description: `Brief: ${site}/crm/meetings/${m.id}`,
  })));
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
