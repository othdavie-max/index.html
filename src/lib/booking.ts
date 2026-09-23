import { siteSettings } from "@/data/site-settings";

export function isBookableDay(date: Date) {
  const day = date.getDay(); // 0 = Sunday
  return (siteSettings.bookingHours.days as readonly number[]).includes(day);
}

/** All slot start times ("HH:MM") for a single bookable day. */
export function generateDaySlots(): string[] {
  const { startHour, endHour, slotMinutes } = siteSettings.bookingHours;
  const slots: string[] = [];
  let minutes = startHour * 60;
  const endMinutes = endHour * 60;
  while (minutes + slotMinutes <= endMinutes) {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");
    const m = (minutes % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    minutes += slotMinutes;
  }
  return slots;
}

export function nextBookableDates(count: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1); // earliest is tomorrow
  while (dates.length < count) {
    if (isBookableDay(cursor)) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export const consultationTypeLabels = {
  "video-call": "Video Call (Zoom / Google Meet)",
  "phone-call": "Phone Call",
  "in-person": "In-Person (Abuja Office)",
} as const;
