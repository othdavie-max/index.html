"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("bes-cookie-consent")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("bes-cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("bes-cookie-consent", "declined");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-20 z-[90] mx-auto max-w-xl rounded-2xl border border-ink-900/10 bg-white p-5 shadow-2xl sm:bottom-6"
        >
          <p className="text-sm text-ink-900">
            We use cookies to improve your experience and understand how visitors use this site, in line with our{" "}
            <Link href="/cookie-policy" className="underline">
              Cookie Notice
            </Link>
            . This site respects the Nigeria Data Protection Act.
          </p>
          <div className="mt-4 flex gap-3">
            <Button size="sm" onClick={accept}>
              Accept
            </Button>
            <Button size="sm" variant="secondary" onClick={decline}>
              Decline
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
