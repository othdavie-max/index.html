import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/crm/settings-form";
import { requireCrmUser } from "@/lib/crm/auth";
import { DEFAULT_AVAILABILITY, parseAvailability } from "@/lib/crm/slots";

export default async function SettingsPage() {
  const { db, profile } = await requireCrmUser();
  if (profile.role !== "owner") redirect("/crm/today");
  const { data } = await db.from("crm_settings").select("key, value");
  const cfg = new Map((data ?? []).map((s) => [s.key as string, s.value]));
  const script = typeof cfg.get("call_script") === "string" ? (cfg.get("call_script") as string) : "";
  return (
    <div>
      <h1 className="font-display text-xl text-ink-900">Settings</h1>
      <SettingsForm script={script} av={cfg.has("availability") ? parseAvailability(cfg.get("availability")) : DEFAULT_AVAILABILITY} />
    </div>
  );
}
