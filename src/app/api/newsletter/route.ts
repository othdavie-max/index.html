import { NextResponse } from "next/server";
import { newsletterSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`newsletter:${ip}`, { limit: 5, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (supabase) {
    await supabase.from("leads").insert({
      name: "Newsletter subscriber",
      phone: "N/A",
      email: parsed.data.email,
      source: "newsletter",
      payload: {},
    });
  }

  return NextResponse.json({ ok: true });
}
