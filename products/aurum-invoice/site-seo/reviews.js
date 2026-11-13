/* Aurum customer reviews widget. Drop <div data-reviews data-limit="6" data-form="1"></div> anywhere.
   Visitors can only SEND a review. It shows on the site after the owner approves it in the dashboard. */
(function () {
  var API = "https://ymmxhjfcfaawrebxoxbu.supabase.co";
  var AK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbXhoamZjZmFhd3JlYnhveGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMDE3NjcsImV4cCI6MjEwOTc3Nzc2N30.03NhALj3puOulUJTDiKBhnctwM9iLzMoiH_flKwHDyM";
  var MSG = { name: "Please enter your name.", rating: "Please choose a star rating.", text: "Please write at least 15 characters.", links: "Please leave out web links.", limit: "You have sent a few reviews today. Please try again tomorrow.", busy: "We are getting many reviews right now. Please try again later.", session: "Please reload the page and try again.", net: "Could not send. Check your connection and try again." };

  function css() {
    if (document.getElementById("rv-css")) return;
    var s = document.createElement("style"); s.id = "rv-css";
    s.textContent = [
      ".rv-w{display:grid;gap:14px;font-family:inherit;color:var(--ink,#1C1813)}",
      ".rv-sum{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-weight:700}.rv-sum .rv-st{font-size:22px}.rv-sum small{font-weight:500;color:var(--muted,#675E4E);font-size:14px}",
      ".rv-st{color:var(--gold,#9C7637);letter-spacing:2px;white-space:nowrap}",
      ".rv-grid{display:grid;gap:12px;grid-template-columns:1fr}@media(min-width:720px){.rv-grid{grid-template-columns:1fr 1fr}}",
      ".rv-card{background:var(--paper,#fff);border:1px solid var(--line,rgba(70,52,22,.14));border-radius:16px;padding:16px 18px;display:grid;gap:8px}",
      ".rv-card p{margin:0;font-size:15.5px;line-height:1.6}.rv-by{font-size:13.5px;color:var(--muted,#675E4E)}.rv-by b{color:var(--ink,#1C1813)}",
      ".rv-ok{display:inline-block;margin-left:6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#23804F;border:1px solid rgba(35,128,79,.4);border-radius:99px;padding:1px 8px}",
      ".rv-empty{margin:0;color:var(--muted,#675E4E)}",
      ".rv-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border-radius:99px;border:1.5px solid var(--line-2,rgba(70,52,22,.24));background:var(--paper,#fff);color:var(--ink,#1C1813);font:700 15px inherit;cursor:pointer;justify-self:start}",
      ".rv-btn.p{background:linear-gradient(115deg,#A9864F,#E8D19B 38%,#C29E62 62%,#EBD6A4);color:#17120A;border-color:transparent}",
      ".rv-form{display:grid;gap:12px;background:var(--paper,#fff);border:1px solid var(--line-2,rgba(70,52,22,.24));border-radius:18px;padding:18px}",
      ".rv-form[hidden]{display:none}.rv-form h3{margin:0;font-size:20px}",
      ".rv-form label{display:grid;gap:5px;font-size:14px;font-weight:700}.rv-form label span{font-weight:500;color:var(--muted,#675E4E)}",
      ".rv-form input[type=text],.rv-form textarea{font:500 16px inherit;padding:12px 14px;border:1px solid var(--line-2,rgba(70,52,22,.24));border-radius:12px;background:#fff;color:#1C1813;width:100%;box-sizing:border-box}",
      ".rv-form textarea{min-height:110px;resize:vertical}",
      ".rv-pick{display:flex;gap:4px;border:0;padding:0;margin:0}.rv-pick legend{font-size:14px;font-weight:700;margin-bottom:6px;padding:0}",
      ".rv-pick input{position:absolute;opacity:0;pointer-events:none}.rv-pick label{font-size:34px;line-height:1;cursor:pointer;color:#cdbf9f;padding:2px}.rv-pick input:checked ~ label,.rv-pick label.on{color:var(--gold,#9C7637)}",
      ".rv-pick input:focus-visible + label{outline:2px solid var(--gold,#9C7637);border-radius:6px}",
      ".rv-chk{display:flex!important;grid-template-columns:none!important;gap:10px!important;align-items:flex-start;font-weight:500!important;font-size:14px!important}.rv-chk input{margin-top:3px;width:18px;height:18px}",
      ".rv-err{color:#B93C2C;font-size:14px;font-weight:600;min-height:1.2em}.rv-thanks{background:#EAF5EE;border:1px solid rgba(35,128,79,.35);border-radius:14px;padding:14px 16px;font-weight:600;color:#1d5c3a}",
      ".rv-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}"
    ].join("\n");
    document.head.appendChild(s);
  }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function stars(n) { n = Math.max(0, Math.min(5, Math.round(n))); return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function sid() { var k = "aurumSid", v = null; try { v = sessionStorage.getItem(k); } catch (e) {} if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); try { sessionStorage.setItem(k, v); } catch (e) {} } return v; }
  function rpc(fn, body) { return fetch(API + "/rest/v1/rpc/" + fn, { method: "POST", headers: { "Content-Type": "application/json", apikey: AK, Authorization: "Bearer " + AK }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function when(iso) { try { return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }); } catch (e) { return ""; } }

  function mount(root) {
    css();
    var limit = Number(root.getAttribute("data-limit")) || 6, withForm = root.getAttribute("data-form") === "1", openForm = root.getAttribute("data-open") === "1";
    root.textContent = ""; root.classList.add("rv-w");
    var sum = h("div", "rv-sum"), list = h("div", "rv-grid"), empty = h("p", "rv-empty", "Loading reviews…");
    root.appendChild(sum); root.appendChild(empty); root.appendChild(list);
    rpc("public_reviews", { p_limit: limit }).then(function (d) {
      var items = (d && d.items) || [];
      if (!items.length) { empty.textContent = "No reviews yet. Used Aurum? Be the first to share how it went."; return; }
      empty.remove();
      var s1 = h("span", "rv-st", stars(d.avg || 5)); s1.style.fontSize = "22px";
      sum.appendChild(s1); sum.appendChild(h("span", "", String(d.avg))); sum.appendChild(h("small", "", "from " + d.count + (d.count === 1 ? " review" : " reviews")));
      items.forEach(function (r) {
        var c = h("article", "rv-card"); c.appendChild(h("div", "rv-st", stars(r.rating))); c.appendChild(h("p", "", "“" + r.body + "”"));
        var by = h("div", "rv-by"); by.appendChild(h("b", "", r.name)); if (r.business) by.appendChild(document.createTextNode(" · " + r.business));
        if (r.verified) by.appendChild(h("span", "rv-ok", "Verified buyer")); by.appendChild(document.createTextNode(" · " + when(r.created_at)));
        c.appendChild(by); list.appendChild(c);
      });
    }).catch(function () { empty.textContent = "Reviews could not load right now."; });
    if (!withForm) return;

    var btn = h("button", "rv-btn p", "Write a review"); btn.type = "button";
    var f = h("form", "rv-form"); f.hidden = !openForm; f.noValidate = true;
    f.appendChild(h("h3", "", "Share your experience"));
    var l1 = h("label", "", "Your name "); l1.appendChild(h("span", "", "(first name is fine)")); var n = h("input"); n.type = "text"; n.maxLength = 60; n.autocomplete = "given-name"; l1.appendChild(n); f.appendChild(l1);
    var l2 = h("label", "", "Your business "); l2.appendChild(h("span", "", "(optional)")); var b = h("input"); b.type = "text"; b.maxLength = 80; l2.appendChild(b); f.appendChild(l2);
    var fs = h("fieldset", "rv-pick"); fs.appendChild(h("legend", "", "Your rating"));
    var rid = "rv" + Math.random().toString(36).slice(2, 7), val = 0, labs = [];
    for (var i = 1; i <= 5; i++) { (function (i) { var inp = h("input"); inp.type = "radio"; inp.name = rid; inp.id = rid + i; inp.value = i; var lb = h("label", "", "★"); lb.htmlFor = rid + i; lb.title = i + (i === 1 ? " star" : " stars");
      inp.addEventListener("change", function () { val = i; labs.forEach(function (x, j) { x.classList.toggle("on", j < i); }); }); fs.appendChild(inp); fs.appendChild(lb); labs.push(lb); })(i); }
    f.appendChild(fs);
    var l3 = h("label", "", "Your review"); var t = h("textarea"); t.maxLength = 800; t.placeholder = "What did you use Aurum for, and how did it help?"; l3.appendChild(t); f.appendChild(l3);
    var hp = h("input", "rv-hp"); hp.type = "text"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true"); f.appendChild(hp);
    var ck = h("label", "rv-chk"); var cb = h("input"); cb.type = "checkbox"; ck.appendChild(cb); ck.appendChild(document.createTextNode("I agree that my name, business and review may be shown on this website.")); f.appendChild(ck);
    var err = h("div", "rv-err"); err.setAttribute("role", "alert"); f.appendChild(err);
    var go = h("button", "rv-btn p", "Send my review"); go.type = "submit"; f.appendChild(go);
    f.appendChild(h("small", "", "We read every review before it appears. Please be honest: reviews that look fake are removed."));
    btn.addEventListener("click", function () { f.hidden = !f.hidden; if (!f.hidden) n.focus(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); err.textContent = "";
      if (n.value.trim().length < 2) return void (err.textContent = MSG.name);
      if (!val) return void (err.textContent = MSG.rating);
      if (t.value.trim().length < 15) return void (err.textContent = MSG.text);
      if (!cb.checked) return void (err.textContent = "Please tick the box to agree.");
      go.disabled = true; go.textContent = "Sending…";
      rpc("submit_review", { p_session: sid(), p_name: n.value, p_business: b.value, p_rating: val, p_body: t.value, p_trap: hp.value }).then(function (r) {
        if (r && r.ok) { var th = h("div", "rv-thanks", "Thank you! Your review has been received and will appear on this page after we check it."); f.replaceWith(th); btn.hidden = true; try { if (window.fbq) fbq("track", "Lead"); } catch (x) {} }
        else { err.textContent = MSG[r && r.reason] || MSG.net; go.disabled = false; go.textContent = "Send my review"; }
      }).catch(function () { err.textContent = MSG.net; go.disabled = false; go.textContent = "Send my review"; });
    });
    if (!openForm) root.appendChild(btn); root.appendChild(f);
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll("[data-reviews]"), mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
