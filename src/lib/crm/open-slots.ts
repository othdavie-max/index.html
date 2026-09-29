import type { CrmDb } from "./auth";
import { DEFAULT_AVAILABILITY, generateSlots, parseAvailability, type Availability } from "./slots";

/** The owner's open meeting slots for the next 7 days, plus the availability config used. */
export async function getOpenSlots(db: CrmDb, now = new Date()): Promise<{ slots: string[]; availability: Availability }> {
  const [{ data: cfg }, { data: booked }] = await Promise.all([
    db.from("crm_settings").select("value").eq("key", "availability").maybeSingle(),
    db.rpc("crm_booked_slots", { p_from: now.toISOString(), p_to: new Date(now.getTime() + 9 * 86_400_000).toISOString() }),
  ]);
  const availability = cfg ? parseAvailability(cfg.value) : DEFAULT_AVAILABILITY;
  return { slots: generateSlots(availability, (booked ?? []) as string[], now), availability };
}
