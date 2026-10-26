"use client";
import { useEffect } from "react";
import "../../game/ui/game.css";
import "./fix.css";
import { FixProvider, useFix } from "./store";
import { Title } from "./Title";
import { Shell } from "./Shell";
import { Presidency } from "./screens/Presidency";
import { MapScreen } from "./screens/MapScreen";
import { Policies } from "./screens/Policies";
import { Projects } from "./screens/Projects";
import { Nation } from "./screens/Nation";
import { News } from "./screens/News";
import { Button, Modal } from "../../game/ui/kit";

function Screens() {
  const { tab } = useFix();
  switch (tab) {
    case "map": return <MapScreen />;
    case "policies": return <Policies />;
    case "projects": return <Projects />;
    case "nation": return <Nation />;
    case "news": return <News />;
    default: return <Presidency />;
  }
}

function Router() {
  const { screen, state, toasts, error, clearError, version } = useFix();
  void version;
  return (
    <>
      {screen === "title" && <Title />}
      {screen === "play" && state && <Shell><Screens /></Shell>}
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
