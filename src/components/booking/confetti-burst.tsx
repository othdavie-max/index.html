"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const COLORS = ["var(--color-gold-500)", "#F4C95D", "var(--color-ink-900)", "#7DD3A8"];
const PIECES = 14;

type Piece = { x: number; y: number; rotate: number; color: string };

function buildPieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const angle = (i / PIECES) * Math.PI * 2;
    const distance = 70 + Math.random() * 50;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: (Math.random() - 0.5) * 220,
      color: COLORS[i % COLORS.length],
    };
  });
}

/** A small, one-shot confetti burst behind the success checkmark. Pure CSS/
 * framer-motion, no canvas-confetti dependency, and skipped entirely under
 * prefers-reduced-motion. Randomised piece positions are computed once in an
 * effect (not during render) to stay a pure render function. */
export function ConfettiBurst() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(rm);
    if (!rm) setPieces(buildPieces());
  }, []);

  if (reducedMotion || pieces.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate, scale: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="absolute h-2 w-2 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}
