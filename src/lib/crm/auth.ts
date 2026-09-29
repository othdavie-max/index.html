import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CrmProfile } from "./types";

/**
 * The CRM tables are not in the hand-written BES `Database` type (see the warning in
 * lib/supabase/types.ts), so CRM code uses an untyped client and its own row types.
 */
export type CrmDb = SupabaseClient;

/** Signed-in CRM user, or a redirect to the CRM login. RLS enforces the real access rules. */
export async function requireCrmUser(): Promise<{ db: CrmDb; profile: CrmProfile }> {
  const supabase = await createClient();
  if (!supabase) redirect("/crm/login?error=not-configured");
  const db = supabase as unknown as CrmDb;
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/crm/login");
  const { data: profile } = await db.from("crm_users").select("id, name, email, role").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/crm/login?error=no-access");
  return { db, profile: profile as CrmProfile };
}
