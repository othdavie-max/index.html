import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyTeam, wrapEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`contact:${ip}`, { limit: 5, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  const { name, email, phone, subject, message } = parsed.data;

  const supabase = createAdminClient();
  if (supabase) {
    await supabase.from("leads").insert({
      name,
      phone,
      email,
      source: "contact",
      payload: { subject, message },
    });
  }

  await notifyTeam(
    `New contact form message: ${subject}`,
    wrapEmail(
      "New contact form message",
      `<p><strong>Name:</strong> ${name}</p>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Phone:</strong> ${phone}</p>
       <p><strong>Subject:</strong> ${subject}</p>
       <p><strong>Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>`,
    ),
  );

  return NextResponse.json({ ok: true });
}
