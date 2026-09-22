"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { siteSettings as defaultSettings } from "@/data/site-settings";
import type { Json } from "@/lib/supabase/types";

const fieldClass = "w-full rounded-xl border border-ink-900/12 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-gold-500";

// A mutable, widened shape for the form — `siteSettings` itself is `as
// const`, which would otherwise narrow every field to a literal type and
// reject any new value the user types in.
interface SettingsShape {
  companyName: string;
  shortName: string;
  tagline: string;
  address: string;
  mapUrl: string;
  phones: string[];
  email: string;
  hours: string;
  whatsappNumber: string;
  socials: { facebook: string; twitter: string; instagram: string };
  showStats: boolean;
  stats: { studentsPlaced: number; partnerUniversities: number; countries: number; yearsOfExperience: number };
  bookingHours: { days: number[]; startHour: number; endHour: number; slotMinutes: number; timezone: string };
}

const mutableDefaults: SettingsShape = JSON.parse(JSON.stringify(defaultSettings));

export default function SiteSettingsAdminPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<SettingsShape>(mutableDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
      if (data?.data && Object.keys(data.data as object).length > 0) {
        setSettings({ ...mutableDefaults, ...(data.data as Partial<SettingsShape>) });
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
    if (!supabase) return;
    setSaving(true);
    await supabase.from("site_settings").update({ data: settings as unknown as Json, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  }

  function update<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-xl text-ink-900">Site Settings</h1>
      <p className="mt-1 text-sm text-muted">Contact details, socials, and homepage stats configuration.</p>

      {!supabase && (
        <p className="mt-6 rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-sm text-muted">
          Supabase isn&apos;t configured — this page shows the code defaults from <code>src/data/site-settings.ts</code> but changes here won&apos;t
          persist until it is.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-ink-900/8 bg-white p-6">
        <Field label="Company Name">
          <input value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Address">
          <input value={settings.address} onChange={(e) => update("address", e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Email">
          <input value={settings.email} onChange={(e) => update("email", e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Phone Numbers (comma-separated)">
          <input
            value={settings.phones.join(", ")}
            onChange={(e) => update("phones", e.target.value.split(",").map((s) => s.trim()) as unknown as SettingsShape["phones"])}
            className={fieldClass}
          />
        </Field>
        <Field label="WhatsApp Number (digits only, with country code)">
          <input value={settings.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Hours">
          <input value={settings.hours} onChange={(e) => update("hours", e.target.value)} className={fieldClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Facebook URL">
            <input value={settings.socials.facebook} onChange={(e) => update("socials", { ...settings.socials, facebook: e.target.value })} className={fieldClass} />
          </Field>
          <Field label="X / Twitter URL">
            <input value={settings.socials.twitter} onChange={(e) => update("socials", { ...settings.socials, twitter: e.target.value })} className={fieldClass} />
          </Field>
          <Field label="Instagram URL">
            <input value={settings.socials.instagram} onChange={(e) => update("socials", { ...settings.socials, instagram: e.target.value })} className={fieldClass} />
          </Field>
        </div>

        <div className="border-t border-ink-900/8 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-900">
            <input type="checkbox" checked={settings.showStats} onChange={(e) => update("showStats", e.target.checked)} className="h-4 w-4 accent-gold-500" />
            Show stats strip on homepage
          </label>
          <p className="mt-1 text-xs text-muted">Only enable this once the figures below are real and verified — never ship placeholder numbers live.</p>

          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Students Placed">
              <input type="number" value={settings.stats.studentsPlaced} onChange={(e) => update("stats", { ...settings.stats, studentsPlaced: Number(e.target.value) })} className={fieldClass} />
            </Field>
            <Field label="Partner Universities">
              <input type="number" value={settings.stats.partnerUniversities} onChange={(e) => update("stats", { ...settings.stats, partnerUniversities: Number(e.target.value) })} className={fieldClass} />
            </Field>
            <Field label="Countries">
              <input type="number" value={settings.stats.countries} onChange={(e) => update("stats", { ...settings.stats, countries: Number(e.target.value) })} className={fieldClass} />
            </Field>
            <Field label="Years of Experience">
              <input type="number" value={settings.stats.yearsOfExperience} onChange={(e) => update("stats", { ...settings.stats, yearsOfExperience: Number(e.target.value) })} className={fieldClass} />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-ink-900/8 pt-4">
          <button
            onClick={save}
            disabled={!supabase || saving}
            className="flex items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-medium text-ink-900 hover:bg-gold-600 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {savedAt && <span className="text-xs text-muted">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  );
}
