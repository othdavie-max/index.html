/* The three-line menu on every website page. */
(() => {
  "use strict";
  const bar = document.querySelector("header.nav .wrap") || document.querySelector("header.top .bar");
  if (!bar) return;
  const links = [
    ["/", "Home", ""], ["/#see", "How it feels", "What your client sees"], ["/#designs", "Designs", "Fifteen looks for every document"],
    ["/pricing/", "Pricing", "Free, Starter and Pro in detail"], ["/guides/", "Guides", "Invoice tips and free templates"], ["/tools/", "Free tools", "VAT, amount in words, reminders"], ["/free-invoice-generator/", "Free invoice generator", "Try it without signing up"],
    ["/reviews/", "Reviews", "What owners say"], ["/#faq", "Questions", "Quick answers"], ["/about/", "About", ""],
  ];
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "mn-btn"; btn.setAttribute("aria-label", "Menu"); btn.setAttribute("aria-expanded", "false"); btn.innerHTML = "<span></span><span></span><span></span>";
  bar.appendChild(btn);
  const m = document.createElement("div"); m.className = "mn"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Menu");
  m.innerHTML = '<div class="mn-scrim" data-mn></div><div class="mn-panel"><button class="mn-x" type="button" data-mn aria-label="Close menu">×</button>' +
    links.map(([h, t, s]) => '<a href="' + h + '">' + t + (s ? "<small>" + s + "</small>" : "") + "</a>").join("") +
    '<button class="mn-link" type="button" data-demo>Try the live demo<small>Use Aurum on a sample business</small></button>' +
    '<a class="mn-cta" href="/app/?startfree=1">Start free</a><a href="/app/" style="border:0;text-align:center;font-size:15px;opacity:.8">I already have an account · Sign in</a></div>';
  document.body.appendChild(m);
  const set = (open) => { m.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); document.documentElement.style.overflow = open ? "hidden" : ""; };
  btn.addEventListener("click", () => set(!m.classList.contains("open")));
  m.addEventListener("click", (e) => { if (e.target.closest("[data-mn]") || e.target.closest("a") || e.target.closest("[data-demo]")) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
})();
