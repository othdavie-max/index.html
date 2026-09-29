"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CountryCode } from "libphonenumber-js";
import { requireCrmUser } from "./auth";
import { planImport } from "./csv-import";
import { DEFAULT_AVAILABILITY, generateSlots, parseAvailability } from "./slots";
import { normalizePhone } from "./phone";
import {
  CALL_OUTCOMES, INTERACTION_TYPES, LIST_ORIGINS, NO_FOLLOW_UP_STAGES, PAYMENT_PREFERENCES, PURCHASE_PURPOSES, STAGES,
  type Stage,
} from "./constants";
import type { ActionState } from "./types";

const opt = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const leadSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  country_code: z.string().length(2).default("NG"),
  source_id: z.uuid("Every lead must have a source"),
  email: z.union([z.email("Invalid email"), z.null()]),
});

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, profile } = await requireCrmUser();
  const parsed = leadSchema.safeParse({
    full_name: opt(formData.get("full_name")) ?? "",
    phone: opt(formData.get("phone")) ?? "",
    country_code: opt(formData.get("country_code")) ?? "NG",
    source_id: opt(formData.get("source_id")) ?? "",
    email: opt(formData.get("email")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const phone = normalizePhone(parsed.data.phone, parsed.data.country_code as CountryCode);
  if (!phone) return { error: "That doesn't look like a valid phone number" };

  const assigned = profile.role === "owner" ? (opt(formData.get("assigned_to")) ?? profile.id) : profile.id;
  const pref = opt(formData.get("payment_preference"));
  const purpose = opt(formData.get("purchase_purpose"));
  if (pref && !(PAYMENT_PREFERENCES as readonly string[]).includes(pref)) return { error: "Invalid payment preference" };
  if (purpose && !(PURCHASE_PURPOSES as readonly string[]).includes(purpose)) return { error: "Invalid purchase purpose" };

  const { data, error } = await db
    .from("crm_leads")
    .insert({
      full_name: parsed.data.full_name,
      phone,
      email: parsed.data.email,
      country: opt(formData.get("country")),
      city: opt(formData.get("city")),
      source_id: parsed.data.source_id,
      campaign: opt(formData.get("campaign")),
      project_interest: opt(formData.get("project_interest")),
      budget_range: opt(formData.get("budget_range")),
      payment_preference: pref,
      purchase_purpose: purpose,
      timeline: opt(formData.get("timeline")),
      notes: opt(formData.get("notes")),
      assigned_to: assigned,
      // New leads must show up on the Today list straight away.
      next_follow_up_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "A lead with this phone number already exists" };
    return { error: error.message };
  }
  revalidatePath("/crm/leads");
  return { ok: true, message: data.id };
}

export async function importLeads(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, profile } = await requireCrmUser();
  if (profile.role !== "owner") return { error: "Only the owner can import call lists" };

  const file = formData.get("file");
  const listName = opt(formData.get("list_name"));
  const origin = opt(formData.get("origin"));
  const sourceId = opt(formData.get("source_id"));
  const country = (opt(formData.get("country_code")) ?? "NG") as CountryCode;
  const assignedTo = opt(formData.get("assigned_to"));
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file" };
  if (file.size > 5_000_000) return { error: "File is too large (5 MB max)" };
  if (!listName) return { error: "List name is required" };
  if (!origin || !(LIST_ORIGINS as readonly string[]).includes(origin)) return { error: "Choose the list origin" };
  if (!sourceId) return { error: "Every lead must have a source" };

  // Existing phones, paged (PostgREST caps a response at 1000 rows).
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("crm_leads").select("phone").not("phone", "is", null).range(from, from + 999);
    if (error) return { error: error.message };
    data.forEach((r) => existing.add(r.phone as string));
    if (data.length < 1000) break;
  }

  const plan = planImport(await file.text(), existing, country);
  if (plan.toCreate.length === 0) {
    return {
      error: "No new leads to import",
      details: [`${plan.duplicates.length} duplicates, ${plan.invalid.length} invalid`, ...plan.invalid.slice(0, 5).map((i) => `Line ${i.line}: ${i.reason}`)],
    };
  }

  const { data: list, error: listErr } = await db
    .from("crm_call_lists")
    .insert({ name: listName, origin, total_numbers: plan.totalRows })
    .select("id")
    .single();
  if (listErr) return { error: listErr.code === "23505" ? "A list with that name already exists" : listErr.message };

  // Purchased/partner lists start without WhatsApp consent (the column default is false).
  const rows = plan.toCreate.map((r) => ({
    ...r, source_id: sourceId, call_list_id: list.id, assigned_to: assignedTo,
    next_follow_up_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("crm_leads").insert(rows.slice(i, i + 500));
    if (error) {
      // Roll the list back so a half-imported file can be re-run cleanly.
      await db.from("crm_leads").delete().eq("call_list_id", list.id);
      await db.from("crm_call_lists").delete().eq("id", list.id);
      return { error: `Import failed and was rolled back: ${error.message}` };
    }
  }
  revalidatePath("/crm/leads");
  return {
    ok: true,
    message: `Imported ${plan.toCreate.length} leads into "${listName}"`,
    details: [
      `${plan.duplicates.length} duplicate${plan.duplicates.length === 1 ? "" : "s"} skipped`,
      ...plan.duplicates.slice(0, 10).map((d) => `Line ${d.line}: ${d.phone} (${d.reason})`),
      ...(plan.invalid.length ? [`${plan.invalid.length} invalid row(s) skipped`] : []),
      ...plan.invalid.slice(0, 10).map((i) => `Line ${i.line}: ${i.reason}`),
    ],
  };
}

const interactionSchema = z.object({
  lead_id: z.uuid(),
  type: z.enum(INTERACTION_TYPES),
  direction: z.enum(["inbound", "outbound"]).nullable(),
  outcome: z.string().nullable(),
  summary: z.string().nullable(),
  new_stage: z.enum(STAGES).nullable(),
  next_follow_up_at: z.string().nullable(),
  consent: z.boolean(),
});

export async function logInteraction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db } = await requireCrmUser();
  const parsed = interactionSchema.safeParse({
    lead_id: opt(formData.get("lead_id")),
    type: opt(formData.get("type")),
    direction: opt(formData.get("direction")),
    outcome: opt(formData.get("outcome")),
    summary: opt(formData.get("summary")),
    new_stage: opt(formData.get("new_stage")),
    next_follow_up_at: opt(formData.get("next_follow_up_at")),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) return { error: "Check the form: " + parsed.error.issues[0].message };
  const d = parsed.data;

  // App-level guard mirrors the database rule so the user gets a clear message.
  const closing = d.new_stage && (NO_FOLLOW_UP_STAGES as readonly Stage[]).includes(d.new_stage);
  if (d.type !== "note" && !closing && !d.next_follow_up_at) {
    return { error: "Set a next follow-up date, or mark the lead Lost or Nurture." };
  }
  const nextIso = d.next_follow_up_at ? new Date(d.next_follow_up_at).toISOString() : null;

  const { error } = await db.rpc("crm_log_interaction", {
    p_lead_id: d.lead_id,
    p_type: d.type,
    p_direction: d.direction,
    p_outcome: d.outcome,
    p_summary: d.summary,
    p_next_follow_up_at: nextIso,
    p_new_stage: d.new_stage,
    p_consent_whatsapp: d.consent ? true : null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/crm/leads/${d.lead_id}`);
  revalidatePath("/crm/leads");
  return { ok: true, message: "Saved" };
}

export async function moveLead(leadId: string, stage: string): Promise<ActionState> {
  const { db } = await requireCrmUser();
  if (!z.uuid().safeParse(leadId).success || !(STAGES as readonly string[]).includes(stage)) return { error: "Invalid request" };

  const { data: lead, error: readErr } = await db.from("crm_leads").select("next_follow_up_at").eq("id", leadId).maybeSingle();
  if (readErr || !lead) return { error: "Lead not found" };

  // A lead reopened from Lost/Nurture must not be left without a next step.
  const patch: Record<string, unknown> = { stage };
  if (!(NO_FOLLOW_UP_STAGES as readonly string[]).includes(stage) && !lead.next_follow_up_at) {
    patch.next_follow_up_at = new Date().toISOString();
  }
  const { error } = await db.from("crm_leads").update(patch).eq("id", leadId);
  if (error) return { error: error.message };
  revalidatePath("/crm/leads/board");
  revalidatePath("/crm/today");
  return { ok: true };
}

// ─── Telemarketer cockpit ────────────────────────────────────────────────

const inOneDay = () => new Date(Date.now() + 86_400_000).toISOString();

/** One-tap call outcome. Every outcome leaves the lead with a next step (or Lost). */
export async function recordOutcome(leadId: string, outcome: string, opts: { callbackAt?: string; note?: string } = {}): Promise<ActionState> {
  const { db } = await requireCrmUser();
  if (!z.uuid().safeParse(leadId).success) return { error: "Invalid lead" };
  if (!(CALL_OUTCOMES as readonly string[]).includes(outcome) || outcome === "meeting booked") return { error: "Invalid outcome" };

  const { data: lead } = await db.from("crm_leads").select("stage").eq("id", leadId).maybeSingle();
  if (!lead) return { error: "Lead not found" };
  const wasNew = lead.stage === "New";

  let stage: string | null = null;
  let next: string | null = null;
  let consent: boolean | null = null;
  switch (outcome) {
    case "no answer": next = inOneDay(); break;
    case "wrong number":
    case "not interested": stage = "Lost"; break;
    case "interested + WhatsApp consent": stage = "Qualified"; next = inOneDay(); consent = true; break;
    case "callback requested": {
      const when = opts.callbackAt ? new Date(opts.callbackAt) : null;
      if (!when || Number.isNaN(+when) || +when < Date.now() - 60_000) return { error: "Pick a callback date and time in the future" };
      stage = wasNew ? "Contacted" : null; next = when.toISOString(); break;
    }
  }
  const { error } = await db.rpc("crm_log_interaction", {
    p_lead_id: leadId, p_type: "call", p_direction: "outbound", p_outcome: outcome,
    p_summary: opts.note?.trim() || null, p_next_follow_up_at: next, p_new_stage: stage, p_consent_whatsapp: consent,
  });
  if (error) return { error: error.message };
  revalidatePath("/crm/cockpit");
  revalidatePath("/crm/today");
  return { ok: true };
}

async function loadAvailability(db: Awaited<ReturnType<typeof requireCrmUser>>["db"]) {
  const { data } = await db.from("crm_settings").select("value").eq("key", "availability").maybeSingle();
  return data ? parseAvailability(data.value) : DEFAULT_AVAILABILITY;
}

export async function bookMeeting(leadId: string, scheduledAt: string, format: string, note?: string): Promise<ActionState> {
  const { db } = await requireCrmUser();
  if (!z.uuid().safeParse(leadId).success) return { error: "Invalid lead" };
  if (!["video", "in person", "phone"].includes(format)) return { error: "Choose a meeting format" };
  const when = new Date(scheduledAt);
  if (Number.isNaN(+when)) return { error: "Invalid time" };

  // The chosen time must be one of the owner's open slots, not an arbitrary instant.
  const from = new Date(), to = new Date(Date.now() + 9 * 86_400_000);
  const { data: booked } = await db.rpc("crm_booked_slots", { p_from: from.toISOString(), p_to: to.toISOString() });
  const slots = generateSlots(await loadAvailability(db), (booked ?? []) as string[]);
  if (!slots.includes(when.toISOString())) return { error: "That slot is no longer available. Pick another." };

  const { data: lead } = await db.from("crm_leads").select("full_name, phone, country, city, project_interest, budget_range, payment_preference, purchase_purpose, timeline, notes").eq("id", leadId).maybeSingle();
  if (!lead) return { error: "Lead not found" };
  const summary = [
    `${lead.full_name}${lead.phone ? ` (${lead.phone})` : ""}`,
    [lead.city, lead.country].filter(Boolean).join(", "),
    lead.project_interest && `Interested in: ${lead.project_interest}`,
    lead.budget_range && `Budget: ${lead.budget_range}`,
    lead.payment_preference && `Payment: ${lead.payment_preference}`,
    lead.purchase_purpose && `Purpose: ${lead.purchase_purpose}`,
    lead.timeline && `Timeline: ${lead.timeline}`,
    lead.notes && `Notes: ${lead.notes}`,
    note?.trim() && `Booking note: ${note.trim()}`,
  ].filter(Boolean).join("\n");

  const { data: meeting, error } = await db.from("crm_meetings")
    .insert({ lead_id: leadId, scheduled_at: when.toISOString(), format, lead_summary: summary }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That slot was just taken. Pick another." : error.message };

  const { error: logErr } = await db.rpc("crm_log_interaction", {
    p_lead_id: leadId, p_type: "call", p_direction: "outbound", p_outcome: "meeting booked",
    p_summary: `Meeting booked for ${when.toISOString()} (${format})`, p_next_follow_up_at: when.toISOString(),
    p_new_stage: "Meeting Booked", p_consent_whatsapp: null,
  });
  if (logErr) {
    await db.from("crm_meetings").delete().eq("id", meeting.id);
    return { error: logErr.message };
  }
  revalidatePath("/crm/cockpit");
  revalidatePath("/crm/today");
  return { ok: true, message: "Meeting booked" };
}

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, profile } = await requireCrmUser();
  if (profile.role !== "owner") return { error: "Owner only" };
  const script = String(formData.get("call_script") ?? "");
  const days = formData.getAll("days").map(Number).filter((d) => d >= 0 && d <= 6);
  const start = String(formData.get("start") ?? ""), end = String(formData.get("end") ?? "");
  const slot = Number(formData.get("slot_minutes"));
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) return { error: "Availability: start must be before end" };
  if (![15, 20, 30, 45, 60].includes(slot)) return { error: "Choose a slot length" };
  if (days.length === 0) return { error: "Pick at least one available day" };
  const { error } = await db.from("crm_settings").upsert([
    { key: "call_script", value: script, updated_at: new Date().toISOString() },
    { key: "availability", value: { days, start, end, slot_minutes: slot }, updated_at: new Date().toISOString() },
  ]);
  if (error) return { error: error.message };
  revalidatePath("/crm/settings");
  revalidatePath("/crm/cockpit");
  return { ok: true, message: "Saved" };
}
