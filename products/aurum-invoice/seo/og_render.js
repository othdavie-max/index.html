// Renders a branded 1200x630 preview picture for every SEO page (used when a link is shared on WhatsApp, Facebook, X, LinkedIn).
// Run:  node og_render.js   (after build_seo.py has written og_list.json)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'og_list.json'), 'utf8'));
const out = path.join(__dirname, 'og'); fs.mkdirSync(out, { recursive: true });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const html = (kind, title) => `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700&family=Manrope:wght@600;800&display=swap" rel="stylesheet">
<body style="margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(60% 80% at 85% 10%,rgba(217,190,132,.30),transparent 70%),#0E0C0A;color:#F3ECDD;font-family:Manrope,sans-serif;position:relative">
<div style="position:absolute;left:70px;top:58px;display:flex;align-items:center;gap:16px"><div style="width:56px;height:56px;border-radius:50%;border:2px solid #D9BE84;display:grid;place-items:center;font:italic 700 24px Georgia,serif;color:#E9D39E">Au</div><div style="font-family:'Playfair Display',serif;letter-spacing:.34em;font-size:26px;color:#E9D39E">AURUM</div></div>
<div style="position:absolute;right:70px;top:66px;font-weight:800;letter-spacing:.2em;font-size:17px;color:#D9BE84;text-transform:uppercase;border:1.5px solid rgba(217,190,132,.5);border-radius:99px;padding:9px 20px">${esc(kind)}</div>
<div style="position:absolute;left:70px;right:90px;top:170px;font-family:'Playfair Display',serif;font-weight:700;font-size:${title.length > 62 ? 56 : title.length > 44 ? 64 : 74}px;line-height:1.12;letter-spacing:-.01em;color:#FFF8EA">${esc(title)}</div>
<div style="position:absolute;left:70px;bottom:52px;right:70px;display:flex;justify-content:space-between;align-items:center;font-size:23px;font-weight:600;color:#cfc6b3"><span>Invoices, receipts &amp; quotations for Nigerian businesses</span><span style="color:#D9BE84">auruminvoicestudio.netlify.app</span></div>
<div style="position:absolute;left:70px;bottom:104px;width:260px;height:3px;background:linear-gradient(90deg,#D9BE84,transparent)"></div></body>`;
(async () => {
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  for (const it of list) {
    await p.setContent(html(it.kind, it.title), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(120);
    await p.screenshot({ path: path.join(out, it.slug + '.jpg'), type: 'jpeg', quality: 82 });
  }
  await b.close(); console.log('og images:', list.length);
})();
