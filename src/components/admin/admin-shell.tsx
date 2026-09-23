"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarClock,
  Star,
  Building2,
  UserSquare2,
  HelpCircle,
  BookOpen,
  Download,
  Globe2,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Leads & Activity",
    items: [
      { href: "/admin/leads", label: "Leads", icon: Users },
      { href: "/admin/applications", label: "Applications", icon: FileText },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/content/testimonials", label: "Testimonials", icon: Star },
      { href: "/admin/content/partners", label: "Partners", icon: Building2 },
      { href: "/admin/content/team", label: "Team", icon: UserSquare2 },
      { href: "/admin/content/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/admin/content/blog", label: "Blog Posts", icon: BookOpen },
      { href: "/admin/content/guides", label: "Guides", icon: Download },
      { href: "/admin/content/destinations", label: "Destinations", icon: Globe2 },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/admin/data", label: "Tools Data", icon: Settings },
      { href: "/admin/settings", label: "Site Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children, email, role }: { children: React.ReactNode; email: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">{group.label}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-gold-500 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-offwhite">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-950 lg:flex">
        <div className="px-5 py-6">
          <Logo dark />
        </div>
        {nav}
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-white/60">{email}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/30">{role}</p>
          <button onClick={logout} className="mt-2 flex items-center gap-1.5 text-xs text-white/60 hover:text-danger-500">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-64 flex-col bg-ink-950">
            <div className="flex items-center justify-between px-5 py-6">
              <Logo dark />
              <button onClick={() => setMobileOpen(false)} className="text-white/60">
                <X size={20} />
              </button>
            </div>
            {nav}
            <div className="border-t border-white/10 p-4">
              <button onClick={logout} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-danger-500">
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-ink-900/8 bg-white px-4 py-3 lg:hidden">
          <Logo />
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-ink-900">
            <Menu size={22} />
          </button>
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
