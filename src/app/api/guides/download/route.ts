import { NextResponse } from "next/server";
import { guideDownloadSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyTeam, wrapEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getGuide } from "@/data/guides";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`guide-download:${ip}`, { limit: 8, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = guideDownloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  const { name, email, phone, guideSlug } = parsed.data;
  const guide = getGuide(guideSlug);
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const supabase = createAdminClient();
  if (supabase) {
    const { data: lead } = await supabase
      .from("leads")
      .insert({ name, phone, email, source: "guide-download", payload: { guideSlug } })
      .select("id")
      .maybeSingle();
    await supabase.from("guide_downloads").insert({ guide_slug: guideSlug, lead_id: lead?.id ?? null });
  }

  await notifyTeam(
    `Guide download: ${guide.title}`,
    wrapEmail("New guide download", `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Guide:</strong> ${guide.title}</p>`),
  );

  return NextResponse.json({ ok: true, fileUrl: guide.fileUrl });
}
