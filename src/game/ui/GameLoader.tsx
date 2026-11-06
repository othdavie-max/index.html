"use client";
import dynamic from "next/dynamic";

/** The game is client-only (IndexedDB, SVG interaction); it is never server-rendered. */
const GameApp = dynamic(() => import("./GameApp").then((m) => m.GameApp), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0b1f36", color: "#fff", fontFamily: "system-ui" }}>Loading Nigeria…</div>,
});
export function GameLoader() {
  return <GameApp />;
}
