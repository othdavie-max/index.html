"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { getDestination } from "@/data/destinations";
import type { Testimonial } from "@/types";

export function TestimonialLightbox({ testimonial, onClose }: { testimonial: Testimonial | null; onClose: () => void }) {
  const destination = testimonial ? getDestination(testimonial.country) : undefined;

  return (
    <AnimatePresence>
      {testimonial && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white"
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50">
              <X size={16} />
            </button>

            {testimonial.videoUrl ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={testimonial.videoUrl}
                  title={`${testimonial.name}'s story`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-950">
                <span className="font-display text-5xl text-white/20">{testimonial.photoPlaceholder}</span>
              </div>
            )}

            <div className="p-6">
              {testimonial.visaApproved && (
                <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-gold-500/10 px-2.5 py-1 text-[11px] font-semibold text-gold-600">
                  <ShieldCheck size={12} /> Visa Approved
                </span>
              )}
              <p className="text-sm italic leading-relaxed text-ink-900">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-4 font-display text-sm text-ink-900">{testimonial.name}</p>
              <p className="text-xs text-muted">
                {testimonial.course} · {testimonial.university} · {destination?.flag} {destination?.name}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
