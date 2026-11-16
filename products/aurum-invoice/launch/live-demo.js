/* The sales page phone is a working demo: tap it and the real Aurum app opens inside a phone, using sample business data. Nothing is saved or sent. */
(() => {
  "use strict";
  const css = `.demo-cta{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);z-index:5;border:0;border-radius:99px;padding:12px 20px;background:linear-gradient(135deg,#8a6a35,#e9d39e 40%,#b8935a 60%,#f2e1b2);color:#17120a;font:700 14px Manrope,system-ui,sans-serif;box-shadow:0 14px 30px rgba(0,0,0,.5);cursor:pointer;white-space:nowrap;animation:demoPulse 2.4s ease-in-out infinite}
@keyframes demoPulse{0%,100%{box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 0 0 rgba(233,211,158,.45)}50%{box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 0 12px rgba(233,211,158,0)}}
.hero-art .phone[data-demo]{cursor:pointer;pointer-events:auto}.hero-art{pointer-events:auto}
.dm{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);padding:12px}.dm[hidden]{display:none}
.dm-phone{position:relative;width:min(390px,100%);height:min(844px,100%);border-radius:38px;padding:8px;background:linear-gradient(160deg,#3a352e,#0b0a08);box-shadow:0 40px 90px rgba(0,0,0,.8),inset 0 0 0 1px rgba(255,255,255,.14)}
.dm-phone iframe{width:100%;height:100%;border:0;border-radius:30px;background:#f6f1e7;display:block}
.dm-x{position:absolute;right:-6px;top:-6px;z-index:3;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:#14110d;color:#f4ead2;font-size:24px;line-height:1;cursor:pointer}
.dm-tip{position:absolute;left:0;right:0;bottom:-30px;text-align:center;color:rgba(244,234,210,.75);font:600 12.5px Manrope,system-ui,sans-serif}
@media(max-width:480px){.dm{padding:0}.dm-phone{border-radius:0;padding:calc(50px + env(safe-area-inset-top,0px)) 0 0;width:100%;height:100%}.dm-phone iframe{border-radius:0}.dm-x{right:10px;top:calc(4px + env(safe-area-inset-top,0px));width:42px;height:42px}.dm-tip{display:block;top:calc(14px + env(safe-area-inset-top,0px));bottom:auto;text-align:left;left:16px;right:60px;font-size:12px}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const m = document.createElement("div"); m.className = "dm"; m.hidden = true; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Aurum live demo");
  m.innerHTML = '<div class="dm-phone"><button class="dm-x" type="button" aria-label="Close the demo">×</button><div id="dm-slot" style="height:100%"></div><div class="dm-tip">Sample business and sample prices. Nothing is saved or sent.</div></div>';
  document.body.appendChild(m);
  const slot = m.querySelector("#dm-slot");
  const open = () => {
    m.hidden = false; document.documentElement.style.overflow = "hidden";
    if (!slot.firstChild) { const f = document.createElement("iframe"); f.src = "/app/?embed=1&demo=1"; f.title = "Aurum demo"; f.setAttribute("allow", "clipboard-write"); slot.appendChild(f); }
    try { window.aurumTrack && window.aurumTrack("click_demo"); } catch (e) {}
  };
  const close = () => { m.hidden = true; document.documentElement.style.overflow = ""; slot.innerHTML = ""; };
  m.querySelector(".dm-x").addEventListener("click", close);
  m.addEventListener("click", (e) => { if (e.target === m) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !m.hidden) close(); if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".hero-art .phone[data-demo]")) { e.preventDefault(); open(); } });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-demo]")) { e.preventDefault(); open(); } });
})();
