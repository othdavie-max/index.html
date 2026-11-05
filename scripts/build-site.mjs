// Builds the offline, installable version of the game into ./site (host that folder anywhere static).
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const out = "site"; rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const res = await build({ entryPoints: { app: "scripts/site/entry.tsx" }, bundle: true, minify: true, format: "esm", splitting: true, jsx: "automatic", loader: { ".json": "json" }, define: { "process.env.NODE_ENV": '"production"' }, outdir: out, entryNames: "[name]-[hash]", chunkNames: "chunk-[hash]", metafile: true, logLevel: "warning" });
const outs = Object.keys(res.metafile.outputs).map((f) => f.replace(/^site\//, ""));
const appJs = outs.find((f) => /^app-.*\.js$/.test(f)), appCss = outs.find((f) => /^app-.*\.css$/.test(f));
const css = readFileSync(`${out}/${appCss}`, "utf8");

const loader = `window.__bip=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__bip=e;});(function(){var c=window.FIX_GC;window.__gcq=window.__gcq||[];window.addEventListener("appinstalled",function(){window.__gcq.push({path:"installed",title:"installed",event:true});});
if(!c||navigator.doNotTrack==="1"||!navigator.onLine)return;var s=document.createElement("script");s.async=1;s.src="https://gc.zgo.at/count.js";s.setAttribute("data-goatcounter","https://"+c+".goatcounter.com/count");
s.onload=function(){var q=window.__gcq;window.__gcq=null;q.forEach(function(o){window.goatcounter.count(o);});};document.head.appendChild(s);})();`;
const version = createHash("sha1").update(outs.sort().join("|")).digest("hex").slice(0, 10);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Aso Rock: Can You Fix It?</title>
<meta name="description" content="A presidential strategy game. Fix Nigeria, then take it to the world. Free, works offline.">
<meta name="theme-color" content="#0b1f36"><link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Aso Rock"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" type="image/png" href="icon-192.png">
<meta property="og:title" content="Aso Rock: Can You Fix It?"><meta property="og:description" content="Fix Nigeria. Then take it to the world. A free presidential strategy game that works offline."><meta property="og:image" content="icon-512.png">
<style>:root{--font-inter:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color-scheme:light}html,body{margin:0;background:#F4F7FA;color:#0f172a;font-family:var(--font-inter)}body{padding-bottom:env(safe-area-inset-bottom)}
.boot{min-height:100dvh;display:grid;place-content:center;justify-items:center;gap:10px;background:linear-gradient(160deg,#0d1b3d,#1a1a5e 55%,#0f4c4a);color:#fff;text-align:center;font-family:var(--font-inter)}.boot b{font-size:34px;font-weight:900;letter-spacing:.04em}.boot span{color:#f5d57a;font-weight:700}.boot i{width:46px;height:4px;border-radius:2px;background:rgba(255,255,255,.25);overflow:hidden;position:relative}.boot i:after{content:"";position:absolute;inset:0;width:40%;background:#f5d57a;animation:bt 1s ease-in-out infinite}@keyframes bt{from{transform:translateX(-100%)}to{transform:translateX(260%)}}</style><link rel="stylesheet" href="${appCss}"><link rel="modulepreload" href="${appJs}"></head><body><div id="root"><div class="boot"><b>ASO ROCK</b><i></i><span>Loading…</span></div></div>
<script src="config.js"></script><script>${loader}</script>
<script type="module" src="${appJs}"></script>
<script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}</script>
</body></html>`;
writeFileSync(`${out}/index.html`, html);
mkdirSync(`${out}/game`, { recursive: true }); copyFileSync("public/game/geo.json", `${out}/game/geo.json`);
writeFileSync(`${out}/sw.js`, readFileSync("scripts/site/sw.js", "utf8").replace("__VERSION__", version).replace("__ASSETS__", JSON.stringify([...outs, "game/geo.json"])));
for (const f of ["manifest.webmanifest", "config.js", "privacy.html", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) copyFileSync(`scripts/site/${f}`, `${out}/${f}`);
writeFileSync(`${out}/.nojekyll`, "");
console.log(`site built: page ${(html.length / 1024).toFixed(0)} KB, app ${(readFileSync(`${out}/${appJs}`).length / 1024).toFixed(0)} KB, ${outs.length} files, version ${version}`);
