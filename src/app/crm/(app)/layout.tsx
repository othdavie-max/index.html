import type { Metadata } from "next";
import { CrmShell } from "@/components/crm/crm-shell";
import { requireCrmUser } from "@/lib/crm/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lead Engine", robots: { index: false, follow: false } };

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireCrmUser();
  return <CrmShell profile={profile}>{children}</CrmShell>;
}
