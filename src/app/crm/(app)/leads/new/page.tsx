import { LeadForm } from "@/components/crm/lead-form";
import { requireCrmUser } from "@/lib/crm/auth";

export default async function NewLeadPage() {
  const { db, profile } = await requireCrmUser();
  const [{ data: sources }, { data: users }] = await Promise.all([
    db.from("crm_sources").select("id, name").order("name"),
    profile.role === "owner" ? db.from("crm_users").select("id, name").order("name") : Promise.resolve({ data: null }),
  ]);
  return (
    <div>
      <h1 className="font-display text-xl text-ink-900">New lead</h1>
      <LeadForm sources={sources ?? []} users={users} />
    </div>
  );
}
