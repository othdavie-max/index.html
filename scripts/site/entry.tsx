import { createRoot } from "react-dom/client";
import { FixApp } from "../../src/fixit/ui/FixApp";

// The offline build ships the boundary data as its own cached file (game/geo.json) instead of inside the app code,
// so the title screen appears before it is needed. The path is relative so it works from any folder.
(window as unknown as { __FIX_SITE?: boolean }).__FIX_SITE = true; // the offline site registers its own service worker (sw.js) from the page
const realFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/game/geo.json")) return realFetch(new URL("game/geo.json", document.baseURI).href, init);
  return realFetch(input, init);
}) as typeof fetch;

createRoot(document.getElementById("root")!).render(<FixApp />);
