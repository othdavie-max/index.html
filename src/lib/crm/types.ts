import type { Stage } from "./constants";

export type CrmRole = "owner" | "telemarketer" | "member";
export type CrmProfile = { id: string; name: string; email: string; role: CrmRole };

export type CrmLead = {
  id: string;
  full_name: string;
  phone: string | null;
  phone_is_whatsapp: boolean;
  email: string | null;
  country: string | null;
  city: string | null;
  source_id: string;
  call_list_id: string | null;
  campaign: string | null;
  project_interest: string | null;
  budget_range: string | null;
  payment_preference: string | null;
  purchase_purpose: string | null;
  timeline: string | null;
  stage: Stage;
  assigned_to: string | null;
  consent_whatsapp: boolean;
  consent_whatsapp_at: string | null;
  consent_source: string | null;
  notes: string | null;
  created_at: string;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
};

export type CrmInteraction = {
  id: string;
  type: string;
  direction: string | null;
  outcome: string | null;
  summary: string | null;
  created_by: string | null;
  created_at: string;
};

export type ActionState = { ok?: boolean; error?: string; message?: string; details?: string[] };
