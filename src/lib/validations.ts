import { z } from "zod";

export const nameSchema = z.string().trim().min(2, "Please enter your full name").max(120);
export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20)
  .regex(/^[+\d][\d\s-]{6,19}$/, "Enter a valid phone number");
export const emailSchema = z.email("Enter a valid email address");

export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  subject: z.string().trim().min(2).max(150),
  destination: z.string().trim().max(100).optional(),
  message: z.string().trim().min(10, "Tell us a little more (10 characters minimum)").max(2000),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const newsletterSchema = z.object({
  email: emailSchema,
});

export const guideDownloadSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  guideSlug: z.string().min(1),
});

export const matcherLeadSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  answers: z.record(z.string(), z.unknown()),
});

export const bookingSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  consultationType: z.enum(["video-call", "phone-call", "in-person"]),
  scheduledDate: z.string().min(1, "Choose a date"),
  scheduledTime: z.string().min(1, "Choose a time"),
  destination: z.string().optional(),
  level: z.string().optional(),
  message: z.string().max(1000).optional(),
});
export type BookingFormValues = z.infer<typeof bookingSchema>;

export const timelineLeadSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  country: z.string(),
  level: z.string(),
  intake: z.string(),
});

// ── Multi-step application form ─────────────────────────────────────────
export const applicationStep1Schema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: z.string().min(1, "Enter your date of birth"),
  nationality: z.string().min(2, "Enter your nationality"),
});

export const applicationStep2Schema = z.object({
  level: z.enum(["foundation", "undergraduate", "masters", "phd"]),
  destinationCountries: z.array(z.string()).min(1, "Choose at least one country"),
  courseOfInterest: z.string().min(2, "Tell us what you'd like to study"),
  intake: z.string().min(1, "Choose your target intake"),
});

export const applicationStep3Schema = z.object({
  highestQualification: z.string().min(2),
  institution: z.string().min(2),
  gradeOrGpa: z.string().min(1),
  graduationYear: z.string().min(4).max(4),
});

export const applicationStep4Schema = z.object({
  englishTest: z.enum(["ielts", "toefl", "pte", "duolingo", "none"]),
  englishScore: z.string().optional(),
  testDate: z.string().optional(),
});

export const applicationStep6Schema = z.object({
  consent: z.literal(true, { message: "You must accept the privacy policy to continue" }),
});

export const applicationFullSchema = applicationStep1Schema
  .extend(applicationStep2Schema.shape)
  .extend(applicationStep3Schema.shape)
  .extend(applicationStep4Schema.shape)
  .extend(applicationStep6Schema.shape);

export type ApplicationFormValues = z.infer<typeof applicationFullSchema>;
