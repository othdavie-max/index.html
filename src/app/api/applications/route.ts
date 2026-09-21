import { NextResponse } from "next/server";
import { z } from "zod";
import { applicationFullSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, notifyTeam, wrapEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { generateReferenceId } from "@/lib/reference-id";
import type { Json } from "@/lib/supabase/types";

const requestSchema = applicationFullSchema.extend({
  documents: z.record(z.string(), z.object({ fileName: z.string(), path: z.string() })),
});

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`applications:${ip}`, { limit: 3, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" }, { status: 400 });
  }

  const data = parsed.data;
  const referenceId = generateReferenceId();

  const supabase = createAdminClient();
  if (supabase) {
    const { error } = await supabase.from("applications").insert({
      reference_id: referenceId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      level: data.level,
      destination_countries: data.destinationCountries,
      course_of_interest: data.courseOfInterest,
      intake: data.intake,
      academic_background: {
        highestQualification: data.highestQualification,
        institution: data.institution,
        gradeOrGpa: data.gradeOrGpa,
        graduationYear: data.graduationYear,
      } as Json,
      english_test: { test: data.englishTest, score: data.englishScore ?? null, testDate: data.testDate ?? null } as Json,
      documents: data.documents as Json,
      consent: data.consent,
    });
    if (error) {
      return NextResponse.json({ error: "Something went wrong saving your application. Please try again." }, { status: 500 });
    }
  }

  const summaryHtml = `
    <p><strong>Reference ID:</strong> ${referenceId}</p>
    <p><strong>Level:</strong> ${data.level}</p>
    <p><strong>Destination(s):</strong> ${data.destinationCountries.join(", ")}</p>
    <p><strong>Course:</strong> ${data.courseOfInterest}</p>
    <p><strong>Intake:</strong> ${data.intake}</p>
  `;

  await sendEmail({
    to: data.email,
    subject: `Application received — Reference ${referenceId}`,
    html: wrapEmail(
      `Thanks, ${data.fullName.split(" ")[0]} — we've received your application`,
      `<p>Your reference ID is <strong>${referenceId}</strong>. Keep this for your records.</p>${summaryHtml}<p>Our team will review your documents and be in touch with next steps.</p>`,
    ),
  });

  await notifyTeam(
    `New application: ${data.fullName} (${referenceId})`,
    wrapEmail("New application submitted", `<p><strong>Name:</strong> ${data.fullName}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Phone:</strong> ${data.phone}</p>${summaryHtml}`),
  );

  return NextResponse.json({ ok: true, referenceId });
}
