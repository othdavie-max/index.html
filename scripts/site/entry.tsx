import { createRoot } from "react-dom/client";
import geo from "../../public/game/geo.json";
import { FixApp } from "../../src/fixit/ui/FixApp";

// The offline build embeds the boundary data instead of fetching it.
const realFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/game/geo.json")) return Promise.resolve(new Response(JSON.stringify(geo), { headers: { "content-type": "application/json" } }));
  return realFetch(input, init);
}) as typeof fetch;

createRoot(document.getElementById("root")!).render(<FixApp />);
