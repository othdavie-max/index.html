"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const DELAY_MS = 20_000;
const SCROLL_FRACTION = 0.5;

/** Mobile-only AI chat entry point: stays out of the way until the visitor
 * has been on the page a while or scrolled halfway, per the "don't clutter
 * the mobile screen with floating buttons" brief. */
export function ChatLauncherMobile({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem("bes-ai-teaser-seen") === "1";
    } catch {
      seen = true;
    }
    if (seen) {
      setDismissed(true);
      return;
    }

    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_FRACTION) {
        setVisible(true);
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    try {
      localStorage.setItem("bes-ai-teaser-seen", "1");
    } catch {
      // ignore
    }
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.94 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[4.5rem] right-4 z-40 sm:hidden"
        >
          <div className="relative max-w-[210px] rounded-2xl border border-ink-900/8 bg-white pr-7 shadow-xl">
            <button
              type="button"
              onClick={() => {
                onOpen();
                dismiss();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-ink-900"
            >
              <Sparkles size={14} className="shrink-0 text-gold-500" />
              Ask our AI assistant a question
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-muted hover:bg-offwhite"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
