"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GlobeFallback } from "@/components/home/globe-fallback";

const GlobeCanvas = dynamic(() => import("@/components/home/globe-canvas").then((m) => m.GlobeCanvas), {
  ssr: false,
  loading: () => <GlobeFallback />,
});

export function Globe() {
  const [showInteractive, setShowInteractive] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmallScreen = window.innerWidth < 640;
    const isLowEndDevice = (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4
      : false;

    if (!reducedMotion && !isSmallScreen && !isLowEndDevice) setShowInteractive(true);
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {showInteractive ? <GlobeCanvas /> : <GlobeFallback />}
    </div>
  );
}
