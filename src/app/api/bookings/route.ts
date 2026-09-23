import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, notifyTeam, wrapEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { consultationTypeLabels } from "@/lib/booking";
import { siteSettings } from "@/data/site-settings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ bookedTimes: [] });

  const { data, error } = await supabase.from("bookings").select("scheduled_time").eq("scheduled_date", date);
  if (error) return NextResponse.json({ bookedTimes: [] });

  return NextResponse.json({ bookedTimes: (data ?? []).map((b) => (b as { scheduled_time: string }).scheduled_time) });
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`bookings:${ip}`, { limit: 5, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  const { name, email, phone, consultationType, scheduledDate, scheduledTime, destination, level, message } = parsed.data;

  const supabase = createAdminClient();
  if (supabase) {
    const { error } = await supabase.from("bookings").insert({
      name,
      email,
      phone,
      consultation_type: consultationType,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      destination: destination ?? null,
      level: level ?? null,
      message: message ?? null,
    });
    if (error) {
      // unique_violation on (scheduled_date, scheduled_time)
      if (error.code === "23505") {
        return NextResponse.json({ error: "That slot was just booked. Please pick another time." }, { status: 409 });
      }
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  }

  const prettyDate = new Date(`${scheduledDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const summaryHtml = `
    <p><strong>Type:</strong> ${consultationTypeLabels[consultationType]}</p>
    <p><strong>Date:</strong> ${prettyDate}</p>
    <p><strong>Time:</strong> ${scheduledTime} (${siteSettings.bookingHours.timezone})</p>
    ${destination ? `<p><strong>Destination:</strong> ${destination}</p>` : ""}
    ${level ? `<p><strong>Level:</strong> ${level}</p>` : ""}
    ${message ? `<p><strong>Message:</strong><br/>${message}</p>` : ""}
  `;

  await sendEmail({
    to: email,
    subject: "Your consultation is booked - Baseline Educational Services",
    html: wrapEmail(
      `You're booked in, ${name.split(" ")[0]}`,
      `<p>Thanks for booking a free consultation. Here are your details:</p>${summaryHtml}<p>We'll be in touch beforehand with any next steps. If you need to reschedule, just reply to this email or reach us on WhatsApp.</p>`,
    ),
  });

  await notifyTeam(
    `New booking: ${name}, ${prettyDate} ${scheduledTime}`,
    wrapEmail(
      "New consultation booking",
      `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p>${summaryHtml}`,
    ),
  );

  return NextResponse.json({ ok: true });
}
