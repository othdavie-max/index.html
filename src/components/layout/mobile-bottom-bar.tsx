"use client";

import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { openWhatsApp } from "@/lib/whatsapp";

/** The only persistent floating control on mobile, per the "no floating-button
 * clutter" brief — WhatsApp + Book, nothing else stacked above it. */
export function MobileBottomBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-900/10 bg-white/95 backdrop-blur-lg sm:hidden">
      <button
        type="button"
        onClick={() => openWhatsApp("Hi Baseline, I'd like to speak with a counsellor about studying abroad.", "mobile-bottom-bar")}
        className="flex min-h-[52px] flex-1 items-center justify-center gap-2 border-r border-ink-900/10 py-3.5 text-sm font-semibold text-[#128C4A]"
      >
        <WhatsAppIcon size={20} className="text-[#25D366]" />
        WhatsApp
      </button>
      <Link href="/book" className="flex min-h-[52px] flex-1 items-center justify-center gap-2 bg-gold-500 py-3.5 text-sm font-semibold text-white">
        <CalendarCheck size={18} />
        Book Free Consult
      </Link>
    </div>
  );
}
