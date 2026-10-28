"use client";
import { useEffect } from "react";
import "./game.css";
import { GameProvider, useGame } from "./store";
import { Title } from "./screens/Title";
import { Create } from "./screens/Create";
import { Shell } from "./Shell";
import { Screens } from "./Screens";
import { Modal, Button } from "./kit";

function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="g-toast-wrap" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`g-toast ${t.bad ? "g-toast-bad" : ""}`}>{t.text}</div>)}
    </div>
  );
}

function Router() {
  const { screen, state, error, clearError, busy, version } = useGame();
  void version;
  return (
    <>
      {screen === "title" && <Title />}
      {screen === "create" && <Create />}
      {screen === "game" && state && <Shell><Screens /></Shell>}
      <Toasts />
      {error && <Modal title="Something went wrong" onClose={clearError} footer={<Button variant="primary" onClick={clearError}>OK</Button>}><p className="g-small">{error}</p></Modal>}
      {busy && screen !== "game" && <div style={{ position: "fixed", inset: 0, background: "rgba(8,20,36,.5)", display: "grid", placeItems: "center", color: "#fff", zIndex: 150 }}>Working…</div>}
    </>
  );
}

export function GameApp() {
  useEffect(() => {
    // offline support: cache the app shell and map data after first load (production builds only)
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/game-sw.js", { scope: "/game" }).then(() => navigator.serviceWorker.ready).then((reg) => {
        const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.startsWith(location.origin));
        reg.active?.postMessage({ type: "cache-urls", urls });
      }).catch(() => undefined);
    }
  }, []);
  return (
    <GameProvider>
      <div className="gm"><Router /></div>
    </GameProvider>
  );
}
