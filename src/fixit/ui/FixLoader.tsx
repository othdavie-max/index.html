"use client";
import dynamic from "next/dynamic";

/** Client-only (IndexedDB, SVG interaction); never server-rendered. */
const FixApp = dynamic(() => import("./FixApp").then((m) => m.FixApp), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0b1f36", color: "#fff", fontFamily: "system-ui" }}>Loading Nigeria…</div>,
});
export function FixLoader() { return <FixApp />; }
