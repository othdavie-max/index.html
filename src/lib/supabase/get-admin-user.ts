import { createClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = await createClient();
  if (!supabase) return { configured: false as const, user: null, role: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured: true as const, user: null, role: null };

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();

  return {
    configured: true as const,
    user: { id: user.id, email: user.email ?? "" },
    role: (profile?.role as "admin" | "editor" | undefined) ?? "editor",
    fullName: profile?.full_name ?? null,
  };
}
