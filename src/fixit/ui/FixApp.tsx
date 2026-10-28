"use client";
import { useEffect } from "react";
import "../../game/ui/game.css";
import "./fix.css";
import { FixProvider, useFix } from "./store";
import { Title } from "./Title";
import { World } from "./World";
import { Button, Modal } from "../../game/ui/kit";

function Router() {
  const { screen, state, toasts, error, clearError, version } = useFix();
  void version;
  return (
    <>
      {screen === "title" && <Title />}
      {screen === "play" && state && <World />}
      <div className="g-toast-wrap" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`g-toast ${t.bad ? "g-toast-bad" : ""}`}>{t.text}</div>)}</div>
      {error && <Modal title="Something went wrong" onClose={clearError} footer={<Button variant="primary" onClick={clearError}>OK</Button>}><p className="g-small">{error}</p></Modal>}
    </>
  );
}

export function FixApp() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/game-sw.js", { scope: "/fix" }).then(() => navigator.serviceWorker.ready).then((reg) => {
        const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.startsWith(location.origin));
        reg.active?.postMessage({ type: "cache-urls", urls });
      }).catch(() => undefined);
    }
  }, []);
  return <FixProvider><div className="gm"><Router /></div></FixProvider>;
}
