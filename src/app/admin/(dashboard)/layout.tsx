import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminUser } from "@/lib/supabase/get-admin-user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getAdminUser();

  if (!user) redirect("/admin/login");

  return (
    <AdminShell email={user.email} role={role ?? "editor"}>
      {children}
    </AdminShell>
  );
}
