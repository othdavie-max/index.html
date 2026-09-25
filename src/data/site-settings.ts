// Single source of truth for editable business info.
// Mirrors the `site_settings` table in Supabase — see supabase/schema.sql.
// In production, src/lib/content.ts reads the DB row first and falls back to this file.

export const siteSettings = {
  companyName: "Baseline Educational Services",
  shortName: "Baseline",
  tagline: "Your journey from Nigeria to the world's best universities starts here.",
  address: "House 3, Sigma Estate, Jabi, Abuja, Nigeria",
  // PLACEHOLDER: confirm exact map coordinates / Google Maps place link
  mapUrl: "https://maps.google.com/?q=Sigma+Estate+Jabi+Abuja",
  phones: ["+234 813 7821 173", "+234 901 7168 330", "+234 902 6221 132"],
  email: "info@baselineeducationalservices.com",
  hours: "Monday – Friday, 9:00 AM – 5:00 PM (WAT)",
  whatsappNumber: "2348137821173", // PLACEHOLDER: confirm primary WhatsApp line, digits only w/ country code
  socials: {
    // PLACEHOLDER: replace with real handles
    facebook: "https://facebook.com/baselineeducationalservices",
    twitter: "https://x.com/baselineedu",
    instagram: "https://instagram.com/baselineeducationalservices",
  },
  // Stats strip is OFF until verified real numbers are supplied. Never flip
  // this on with placeholder figures.
  showStats: false,
  // Team sections are OFF until real counsellor names, roles, bios and
  // photos are supplied. Never flip this on with placeholder data.
  showTeam: false,
  stats: {
    studentsPlaced: 0, // PLACEHOLDER
    partnerUniversities: 0, // PLACEHOLDER
    countries: 6,
    yearsOfExperience: 0, // PLACEHOLDER
  },
  bookingHours: {
    days: [1, 2, 3, 4, 5], // Mon–Fri
    startHour: 9,
    endHour: 17,
    slotMinutes: 45,
    timezone: "Africa/Lagos",
  },
} as const;

export type SiteSettings = typeof siteSettings;
