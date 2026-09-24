"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Plus } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { openWhatsApp } from "@/lib/whatsapp";

/** Desktop-only floating action button: a single control that expands into
 * WhatsApp + AI Chat, replacing two separate floating buttons. */
export function StickyCTA({ onChatOpen }: { onChatOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-6 right-6 z-40 hidden flex-col items-end gap-3 sm:flex"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-end gap-2"
          >
            <button
              type="button"
              onClick={() => openWhatsApp("Hi Baseline, I'd like to speak with a counsellor about studying abroad.", "sticky-cta")}
              className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-2 text-sm font-medium text-ink-900 shadow-xl transition-colors hover:bg-offwhite"
            >
              WhatsApp
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
                <WhatsAppIcon size={16} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChatOpen();
                setExpanded(false);
              }}
              className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-2 text-sm font-medium text-ink-900 shadow-xl transition-colors hover:bg-offwhite"
            >
              Chat
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white">
                <MessageCircle size={16} />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Close contact options" : "Contact us"}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-white shadow-lg shadow-gold-500/30"
      >
        <motion.span animate={{ rotate: expanded ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={24} />
        </motion.span>
      </motion.button>
    </div>
  );
}
