"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function LoadingScreen() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = sessionStorage.getItem("bes-intro-seen");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reducedMotion) return;

    setVisible(true);
    sessionStorage.setItem("bes-intro-seen", "1");
    const timer = setTimeout(() => setVisible(false), 1300);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          onClick={() => setVisible(false)}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          className="fixed inset-0 z-[300] flex cursor-pointer items-center justify-center bg-navy-950"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-display text-3xl font-bold text-white"
          >
            Baseline<span className="text-red-500">.</span>
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
