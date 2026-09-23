import { NextResponse } from "next/server";
import { z } from "zod";
import { nameSchema, emailSchema, phoneSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { notifyTeam, wrapEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { LeadSource } from "@/types";

const leadSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  source: z.enum(["course-matcher", "ai-chat", "guide-download", "contact", "booking", "newsletter", "timeline-planner", "application"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const sourceLabels: Record<LeadSource, string> = {
  "course-matcher": "Course Matcher quiz",
  "ai-chat": "AI chat assistant",
  "guide-download": "guide download",
  contact: "contact form",
  booking: "consultation booking",
  newsletter: "newsletter signup",
  "timeline-planner": "Timeline Planner",
  application: "application form",
};

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`leads:${ip}`, { limit: 10, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  const { name, email, phone, source, payload } = parsed.data;

  const supabase = createAdminClient();
  if (supabase) {
    await supabase.from("leads").insert({ name, phone, email, source, payload: (payload ?? {}) as Json });
  }

  await notifyTeam(
    `New lead from ${sourceLabels[source]}`,
    wrapEmail(
      `New lead: ${sourceLabels[source]}`,
      `<p><strong>Name:</strong> ${name}</p>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Phone:</strong> ${phone}</p>
       ${payload ? `<pre style="white-space:pre-wrap;font-size:12px;background:#F7F8FB;padding:12px;border-radius:8px;">${JSON.stringify(payload, null, 2)}</pre>` : ""}`,
    ),
  );

  return NextResponse.json({ ok: true });
}
