import { redirect } from "next/navigation";
import { ImportForm } from "@/components/crm/import-form";
import { requireCrmUser } from "@/lib/crm/auth";

export default async function ImportPage() {
  const { db, profile } = await requireCrmUser();
  if (profile.role !== "owner") redirect("/crm/leads");
  const [{ data: sources }, { data: users }] = await Promise.all([
    db.from("crm_sources").select("id, name").order("name"),
    db.from("crm_users").select("id, name").order("name"),
  ]);
  return (
    <div>
      <h1 className="font-display text-xl text-ink-900">Import call list</h1>
      <ImportForm sources={sources ?? []} users={users ?? []} />
    </div>
  );
}
