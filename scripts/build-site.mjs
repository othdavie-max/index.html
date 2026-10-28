// Builds the offline, installable version of the game into ./site (host that folder anywhere static).
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const out = "site"; rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const tmp = ".site-tmp";
await build({ entryPoints: ["scripts/site/entry.tsx"], bundle: true, minify: true, format: "iife", jsx: "automatic", loader: { ".json": "json" }, define: { "process.env.NODE_ENV": '"production"' }, outdir: tmp, logLevel: "warning" });
const js = readFileSync(`${tmp}/entry.js`, "utf8").replace(/<\/script/g, "<\\/script");
const css = readFileSync(`${tmp}/entry.css`, "utf8");
rmSync(tmp, { recursive: true, force: true });

const loader = `(function(){var c=window.FIX_GC;window.__gcq=window.__gcq||[];window.addEventListener("appinstalled",function(){window.__gcq.push({path:"installed",title:"installed",event:true});});
if(!c||navigator.doNotTrack==="1"||!navigator.onLine)return;var s=document.createElement("script");s.async=1;s.src="https://gc.zgo.at/count.js";s.setAttribute("data-goatcounter","https://"+c+".goatcounter.com/count");
s.onload=function(){var q=window.__gcq;window.__gcq=null;q.forEach(function(o){window.goatcounter.count(o);});};document.head.appendChild(s);})();`;
const version = createHash("sha1").update(js).update(css).digest("hex").slice(0, 10);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Nigeria: Can You Fix It?</title>
<meta name="description" content="A presidential strategy game. Fix Nigeria, then take it to the world. Free, works offline.">
<meta name="theme-color" content="#0b1f36"><link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Fix Nigeria"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" type="image/png" href="icon-192.png">
<meta property="og:title" content="Nigeria: Can You Fix It?"><meta property="og:description" content="Fix Nigeria. Then take it to the world. A free presidential strategy game that works offline."><meta property="og:image" content="icon-512.png">
<style>:root{--font-inter:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color-scheme:light}html,body{margin:0;background:#F4F7FA;color:#0f172a;font-family:var(--font-inter)}body{padding-bottom:env(safe-area-inset-bottom)}
${css}</style></head><body><div id="root"></div>
<script src="config.js"></script><script>${loader}</script>
<script>${js}</script>
<script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}</script>
</body></html>`;
writeFileSync(`${out}/index.html`, html);
writeFileSync(`${out}/sw.js`, readFileSync("scripts/site/sw.js", "utf8").replace("__VERSION__", version));
for (const f of ["manifest.webmanifest", "config.js", "privacy.html", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) copyFileSync(`scripts/site/${f}`, `${out}/${f}`);
writeFileSync(`${out}/.nojekyll`, "");
console.log(`site built: ${(html.length / 1024).toFixed(0)} KB, version ${version}`);
