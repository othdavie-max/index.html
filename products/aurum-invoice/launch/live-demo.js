/* The sales page phone is a working demo: tap it and the real Aurum app opens inside a Pro Max-sized iPhone, using sample business data. Nothing is saved or sent. */
(() => {
  "use strict";
  const W = 440, H = 956, B = 9;   // Pro Max screen size in CSS pixels, and the bezel
  const css = `.demo-cta{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);z-index:5;border:0;border-radius:99px;padding:12px 20px;background:linear-gradient(135deg,#8a6a35,#e9d39e 40%,#b8935a 60%,#f2e1b2);color:#17120a;font:700 14px Manrope,system-ui,sans-serif;box-shadow:0 14px 30px rgba(0,0,0,.5);cursor:pointer;white-space:nowrap;animation:demoPulse 2.4s ease-in-out infinite}
@keyframes demoPulse{0%,100%{box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 0 0 rgba(233,211,158,.45)}50%{box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 0 12px rgba(233,211,158,0)}}
.hero-art .phone[data-demo]{cursor:pointer;pointer-events:auto}.hero-art{pointer-events:auto}
.dm{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);overflow:hidden}.dm[hidden]{display:none}
.dm-fit{width:${W + B * 2}px;height:${H + B * 2}px;flex:none;transform-origin:50% 50%;position:relative}
.dm-phone{position:absolute;inset:0;border-radius:68px;padding:${B}px;background:linear-gradient(155deg,#a29d94 0%,#34312e 30%,#77726a 55%,#2a2825 80%,#8d887f 100%);box-shadow:0 50px 110px rgba(0,0,0,.85),inset 0 0 0 1.5px rgba(255,255,255,.22),inset 0 0 0 5px #0b0a09}
.dm-phone::before,.dm-phone::after{content:"";position:absolute;width:4px;border-radius:3px;background:linear-gradient(90deg,#4c4843,#9b958c)}
.dm-phone::before{left:-3px;top:178px;height:62px;box-shadow:0 84px 0 #6b665e,0 0 0 0 #000}
.dm-phone::after{right:-3px;top:232px;height:104px}
.dm-screen{position:relative;width:100%;height:100%;border-radius:58px;overflow:hidden;background:#f6f1e7;padding-top:52px;box-sizing:border-box}
.dm-screen iframe{width:100%;height:100%;border:0;display:block;background:#f6f1e7}
.dm-island{position:absolute;z-index:4;top:12px;left:50%;width:124px;height:36px;margin-left:-62px;border-radius:99px;background:#000;pointer-events:none}
.dm-home{position:absolute;z-index:4;bottom:8px;left:50%;width:140px;height:5px;margin-left:-70px;border-radius:99px;background:rgba(20,17,12,.55);pointer-events:none}
.dm-x{position:absolute;z-index:6;right:-14px;top:-14px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:#14110d;color:#f4ead2;font-size:24px;line-height:1;cursor:pointer}
.dm-tip{position:absolute;left:0;right:0;bottom:-30px;text-align:center;color:rgba(244,234,210,.75);font:600 12.5px Manrope,system-ui,sans-serif}
/* small phones: the demo simply fills the screen */
.dm.full .dm-fit{width:100%;height:100%;transform:none!important}
.dm.full .dm-phone{border-radius:0;padding:calc(50px + env(safe-area-inset-top,0px)) 0 0;box-shadow:none;background:#14110d}
.dm.full .dm-phone::before,.dm.full .dm-phone::after,.dm.full .dm-island,.dm.full .dm-home{display:none}
.dm.full .dm-screen{border-radius:0;padding-top:0}
.dm.full .dm-x{right:10px;top:calc(4px + env(safe-area-inset-top,0px))}
.dm.full .dm-tip{display:block;top:calc(14px + env(safe-area-inset-top,0px));bottom:auto;text-align:left;left:16px;right:60px;font-size:12px}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const m = document.createElement("div"); m.className = "dm"; m.hidden = true; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Aurum live demo");
  m.innerHTML = '<div class="dm-fit" id="dm-fit"><div class="dm-phone"><button class="dm-x" type="button" aria-label="Close the demo">×</button><div class="dm-screen"><div class="dm-island"></div><div id="dm-slot" style="height:100%"></div><div class="dm-home"></div></div><div class="dm-tip">Sample business and sample prices. Nothing is saved or sent.</div></div></div>';
  document.body.appendChild(m);
  const slot = m.querySelector("#dm-slot"), fit = m.querySelector("#dm-fit");
  const layout = () => {
    const vw = innerWidth, vh = innerHeight, full = vw < 560;
    m.classList.toggle("full", full);
    if (!full) fit.style.transform = "scale(" + Math.min(1, (vh - 56) / (H + B * 2), (vw - 40) / (W + B * 2)).toFixed(3) + ")";
  };
  addEventListener("resize", layout);
  const open = () => {
    m.hidden = false; layout(); document.documentElement.style.overflow = "hidden";
    if (!slot.firstChild) { const f = document.createElement("iframe"); f.src = "/app/?embed=1&demo=1"; f.title = "Aurum demo"; f.setAttribute("allow", "clipboard-write"); slot.appendChild(f); }
    try { window.aurumTrack && window.aurumTrack("click_demo"); } catch (e) {}
  };
  const close = () => { m.hidden = true; document.documentElement.style.overflow = ""; slot.innerHTML = ""; };
  m.querySelector(".dm-x").addEventListener("click", close);
  m.addEventListener("click", (e) => { if (e.target === m) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !m.hidden) close(); if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".hero-art .phone[data-demo]")) { e.preventDefault(); open(); } });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-demo]")) { e.preventDefault(); open(); } });
})();
