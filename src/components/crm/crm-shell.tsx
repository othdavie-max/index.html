import Link from "next/link";
import type { CrmProfile } from "@/lib/crm/types";

export function CrmShell({ profile, children }: { profile: CrmProfile; children: React.ReactNode }) {
  const owner = profile.role === "owner";
  return (
    <div className="min-h-screen bg-offwhite">
      <header className="sticky top-0 z-20 border-b border-ink-900/10 bg-ink-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-3 text-sm">
          <Link href="/crm/leads" className="whitespace-nowrap font-display text-base">Lead Engine</Link>
          <nav className="flex flex-1 items-center gap-4 whitespace-nowrap">
            <Link href="/crm/leads" className="hover:text-gold-500">Leads</Link>
            <Link href="/crm/leads/new" className="hover:text-gold-500">+ New lead</Link>
            {owner && <Link href="/crm/leads/import" className="hover:text-gold-500">Import CSV</Link>}
          </nav>
          <span className="whitespace-nowrap text-xs text-white/60">{profile.name} · {profile.role}</span>
          <form action="/crm/logout" method="post">
            <button className="whitespace-nowrap text-xs underline text-white/70 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
