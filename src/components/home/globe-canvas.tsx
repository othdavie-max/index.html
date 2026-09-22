"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { destinations } from "@/data/destinations";

const ABUJA: [number, number] = [9.06, 7.49];
const GOLD: [number, number, number] = [0.769, 0.647, 0.482];

export function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const pointerRef = useRef({ down: false, x: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const markers = [
      { location: ABUJA, size: 0.1, color: [1, 1, 1] as [number, number, number] },
      ...destinations.map((d) => ({
        location: [d.mapCoords[1], d.mapCoords[0]] as [number, number],
        size: 0.06,
        color: GOLD,
      })),
    ];

    const arcs = destinations.map((d) => ({
      from: ABUJA,
      to: [d.mapCoords[1], d.mapCoords[0]] as [number, number],
      color: GOLD,
    }));

    let width = canvas.offsetWidth;
    const onResize = () => {
      width = canvas.offsetWidth;
      globe.update({ width: width * 2, height: width * 2 });
    };
    window.addEventListener("resize", onResize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio ?? 1, 2),
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 14000,
      mapBrightness: 6,
      baseColor: [0.165, 0.094, 0.063],
      markerColor: GOLD,
      glowColor: [0.32, 0.25, 0.18],
      markers,
      arcs,
      arcColor: GOLD,
      arcWidth: 2,
      arcHeight: 0.35,
    });

    let frame: number;
    const animate = () => {
      if (!pointerRef.current.down && !reduced) phiRef.current += 0.0022;
      globe.update({ phi: phiRef.current });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={(e) => {
        pointerRef.current.down = true;
        pointerRef.current.x = e.clientX;
        (e.target as HTMLElement).style.cursor = "grabbing";
      }}
      onPointerUp={(e) => {
        pointerRef.current.down = false;
        (e.target as HTMLElement).style.cursor = "grab";
      }}
      onPointerOut={(e) => {
        pointerRef.current.down = false;
        (e.target as HTMLElement).style.cursor = "grab";
      }}
      onPointerMove={(e) => {
        if (!pointerRef.current.down) return;
        const delta = e.clientX - pointerRef.current.x;
        phiRef.current += delta / 200;
        pointerRef.current.x = e.clientX;
      }}
      style={{ width: "100%", height: "100%", cursor: "grab", contain: "layout paint size" }}
      aria-label="Interactive globe showing Baseline's six study destinations connected to Abuja"
      role="img"
    />
  );
}
