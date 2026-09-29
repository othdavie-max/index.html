import { redirect } from "next/navigation";
import { requireCrmUser } from "@/lib/crm/auth";

export const dynamic = "force-dynamic";

/** Owner lands on Today; telemarketers and team members on their call cockpit. */
export default async function CrmHome() {
  const { profile } = await requireCrmUser();
  redirect(profile.role === "owner" ? "/crm/today" : "/crm/cockpit");
}
