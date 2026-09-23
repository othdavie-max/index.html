"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export function Counter({
  value,
  suffix = "",
  format,
  className,
}: {
  value: number;
  suffix?: string;
  /** Overrides the default `toLocaleString() + suffix` formatting, e.g. for abbreviated currency. */
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 1600, bounce: 0 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = format ? format(latest) : Math.round(latest).toLocaleString() + suffix;
    });
  }, [spring, suffix, format]);

  return <span ref={ref} className={className}>{format ? format(0) : `0${suffix}`}</span>;
}
