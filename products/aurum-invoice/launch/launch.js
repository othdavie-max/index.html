// Builds the LAUNCH version of the site: the pages as they should read the day subscriptions go live (plan/02, 03, 04, 05).
// It reads a built site folder (the output of package.sh) and writes a new folder. Nothing live changes until you deploy that folder.
//   node launch/launch.js <built-site-folder> <output-folder>
const fs = require("fs"), path = require("path");
const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT || !/launch/i.test(path.basename(OUT))) { console.error("Usage: node launch.js <built site folder> <output folder whose name contains 'launch'>"); process.exit(1); }
const BASE = "https://auruminvoice.com.ng", TODAY = "2026-11-16";
const NL = String.fromCharCode(10), CR = String.fromCharCode(13);
const lf = (s) => s.split(CR + NL).join(NL);
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
const rd = (p) => lf(fs.readFileSync(path.join(OUT, p), "utf8")), wr = (p, s) => { fs.mkdirSync(path.dirname(path.join(OUT, p)), { recursive: true }); fs.writeFileSync(path.join(OUT, p), s); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
let problems = [];
const must = (cond, what) => { if (!cond) { problems.push(what); console.error("PROBLEM: " + what); } };
function swap(t, a, b, what) { if (t.split(a).length < 2) { must(false, "not found: " + what); return t; } return t.split(a).join(b); }
function swapRe(t, re, b, what) { if (!re.test(t)) { must(false, "not found: " + what); return t; } return t.replace(re, () => b); }

/* ---------------------------------------------------------------- the words (plan/02 section 1 and plan/03) */
const PHRASES = [
  ["There is a free demo with sample data so you can see how it works. Using it for your own business needs a licence, which is a one-time payment with no monthly fees.", "Yes. You can make 5 documents a month at no cost, with your own business details. Paid plans start at ₦3,000 a month."],
  ["Pay once, use it on your phone, no monthly fees.", "Start free, use it on your phone."],
  ["Pay once, no monthly fees.", "Free for 5 documents a month. Paid plans start at ₦3,000 a month."],
  ["<b>Pay once:</b> no monthly fees.", "<b>Start free:</b> 5 documents a month at no cost."],
  ["You pay once and there are no monthly fees.", "You can start free, and paid plans start at ₦3,000 a month."],
  ["You pay once.", "You can start free, and paid plans start at ₦3,000 a month."],
  ["It installs on your phone, works without data, and is a one-time payment with no monthly fees.", "It installs on your phone and works without data. It is free for 5 documents a month."],
  ["Using it for your own business needs a licence, which is a one-time payment with no monthly fees.", "Using it for your own business needs a free account. You can make 5 documents a month at no cost."],
  ["Both are one-time payments.", "Both paid plans can be paid monthly or yearly."],
  ["There is a free demo that uses sample businesses and sample prices, so you can see exactly what your clients will see.", "There is a free plan: 5 documents a month with your own business details."],
  ["A <b>Verified buyer</b> mark means we have confirmed the reviewer paid for a licence.", "A <b>Verified buyer</b> mark means we have confirmed the reviewer is a paying customer."],
  ["You can try the free demo and review that, but only buyers get the Verified buyer mark.", "You can review the free plan too, but only paying customers get the Verified buyer mark."],
  ["Please try the demo first.", "Please try the free plan first."],
  ["Open a sample wax-sealed invoice in the free demo. Sample data, nothing to pay.", "Make your first invoice free. 5 documents a month, no card needed."],
  ["<b>See it before you pay.</b>", "<b>Try it before you decide.</b>"],
  ['Pay once.">', 'Free to start.">'],
  ["Pay once.", "Free to start."],
  ["how paying and getting your licence works", "how the plans and payment work"],
  ["See exactly what your clients will see in the <a href=\"/app/\">free demo</a>", "Make your first document in the <a href=\"/app/\">free plan</a>"],
  ["how buying works", "how the plans and payment work"],
  ["pricing section", "pricing page"],
  ["Open the free demo", "Start free"], ["Try the free demo", "Start free"], ["Try free demo", "Start free"], ["Get Aurum", "Start free"],
];
const SITE_DESC = { // plan/02 section 2
  "invoice-app-nigeria": "Make invoices, receipts and quotations on your phone, with your logo and bank details. Works without data. Free for 5 documents a month.",
  "receipt-maker-nigeria": "Make professional payment receipts on your phone in one tap, with your logo and a Paid stamp. Turn any paid invoice into a receipt. Free to start.",
  "quotation-maker-nigeria": "Make professional price quotations on your phone with a valid-until date and deposit. When accepted, turn it into an invoice in one tap. Free to start.",
  "whatsapp-invoice": "Stop typing prices in WhatsApp chats. Send a private, wax-sealed invoice link, see when it is opened and remind clients in one tap. Free to start.",
  "about": "Who is behind Aurum Invoice Studio, how the plans and payment work, how to reach us on WhatsApp, and our refund policy.",
};
const ONE_LINE = "Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses. Clients receive each document as a private, wax-sealed link, and the owner sees when it is opened.";
const FAQ_SALES = [ // plan/03 section 1 with part K of plan/07
  ["What is Aurum Invoice Studio?", "Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses. Clients receive each document as a private, wax-sealed link, and the owner sees when it is opened. It also makes delivery notes, credit notes and purchase orders."],
  ["How much does Aurum cost?", "Aurum is free for up to 5 documents a month. Starter is ₦3,000 a month or ₦30,000 a year. Pro is ₦6,000 a month or ₦60,000 a year. A Business plan is coming soon."],
  ["Is there a free plan?", "Yes. You can make 5 documents a month at no cost, for as long as you like. It includes your logo and bank details, the sealed private link, and seeing when your client opens it."],
  ["Does it work without data?", "Yes. Aurum installs on your phone and you can create documents with no connection. You need data only to send a link, back up, or sign in on a new phone."],
  ["Do my clients need to download anything?", "No. They open your link in their phone's browser, like any website. No app and no account."],
  ["How do my clients pay me?", "By transfer to your own bank account, which they copy in one tap, or by card, transfer or USSD through your own Paystack. The money goes straight to you. Aurum never touches it."],
  ["Which phones does it work on?", "Any modern Android phone or iPhone, and computers too. Install it from Chrome on Android, or from Safari on iPhone."],
  ["How do I create an account?", "With your email and a password, or with your Google account. It takes about a minute."],
  ["Can I cancel?", "Yes, at any time, from your account screen. Your plan stays active until the end of the period you paid for. After that your account moves to the free plan and your documents stay."],
  ["What is your refund policy?", "If Aurum is not right for you, tell us within 7 days of your first payment and we refund it in full. Renewals are not refunded, but you can stop renewal at any time."],
  ["Is Aurum accounting software?", "No. Aurum is an invoicing app. It does not run payroll, track stock or file taxes. You can export your records as a spreadsheet for your accountant."],
];
const FAQ_PRICING = [ // plan/03 section 2 with part K
  ["What happens when I reach 5 documents on the free plan?", "You can still open, edit and save drafts, and everything you already sent keeps working. To send a new document, wait until the 1st of next month or choose a paid plan."],
  ["Can I pay by bank transfer?", "Yes. You can pay by card, bank transfer or USSD through Paystack. A card renews by itself. A transfer pays for one month or one year, and we remind you before it ends."],
  ["Is the yearly price really cheaper?", "Yes. A year of Starter is ₦30,000 instead of ₦36,000, and a year of Pro is ₦60,000 instead of ₦72,000. You get 12 months for the price of 10."],
  ["Can I change plan later?", "Yes. You can move up at any time, and your unused Starter days are converted into Pro days. To move down, stop renewal and choose the smaller plan when your current period ends."],
  ["What is your refund policy?", "If Aurum is not right for you, tell us within 7 days of your first payment and we refund it in full. Renewals are not refunded, but you can stop renewal at any time."],
  ["Do I get a receipt for my subscription?", "Yes. Paystack emails a receipt for every payment, and your account screen lists all your payments."],
  ["What is the Business plan?", "It is for larger teams and is coming soon. Tap \"Request Business\" and we will contact you when it is ready."],
];
const FAQ_GEN = [ // plan/03 section 3 with part K
  ["Is it really free?", "Yes, for 5 documents a month. There is no time limit on the free plan."],
  ["Do I need an account?", "Yes, a free one, so your documents are saved and backed up. Sign up with email or Google."],
  ["Can I add my logo and bank details?", "Yes. Your logo, colours, signature and bank details are on every document, including on the free plan."],
  ["Can I send the invoice on WhatsApp?", "Yes. Send it as a private link, or as a PDF or image."],
  ["Is the invoice in naira?", "Yes. Amounts are in naira with commas, and you can switch VAT on or off."],
  ["What if I need more than 5 a month?", "Starter is ₦3,000 a month or ₦30,000 a year."],
];

/* ---------------------------------------------------------------- 1. the SEO pages */
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(downloads|og|app|icons|landing)$/.test(e.name)) walk(p, out); } else if (/\.(html|txt)$/.test(e.name)) out.push(path.relative(OUT, p).split(path.sep).join("/")); } return out; }
const seoFiles = walk(OUT).filter((f) => /\.html$/.test(f) && f !== "index.html" && f !== "admin.html" && f !== "policies.html" && !/^google/.test(f));
const STICKY = '<div class="sticky" role="complementary" aria-label="Start free"><a class="btn" href="/pricing/" data-cta="plans" data-where="sticky">See plans</a><a class="btn primary" href="/app/" data-cta="signup" data-where="sticky">Start free</a></div>';
const IN_BRIEF = '<section id="aurum-in-brief"><h2>Aurum in brief</h2><table><tbody>' + [
  ["Name", "Aurum Invoice Studio"], ["What it is", "Invoice, receipt and quotation app for Nigerian businesses"],
  ["Documents", "Invoice, receipt, quotation, delivery note (waybill), credit note, purchase order (LPO)"],
  ["Works on", "Android phones, iPhones and computers, in the browser. Installs like an app. Works without data."],
  ["Price", "Free for 5 documents a month. Starter ₦3,000 a month or ₦30,000 a year. Pro ₦6,000 a month or ₦60,000 a year."],
  ["Made in", "Nigeria"], ["Contact", "WhatsApp 0703 297 8008"], ["Website", "https://auruminvoice.com.ng/"],
].map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join("") + "</tbody></table></section>";
for (const f of seoFiles) {
  let t = rd(f), slug = f.split("/")[0];
  // structure
  t = swap(t, '<a href="/#pricing">Pricing</a><a class="btn sm" href="/#pricing" data-cta="buy" data-where="header">Get Aurum</a>', '<a href="/pricing/">Pricing</a><a class="btn sm" href="/app/" data-cta="signup" data-where="header">Start free</a>', f + " header");
  if (f !== "llms.txt" && f !== "robots.txt" && f !== "sitemap.xml" && f !== "_headers") {
    t = t.replace(/<div class="sticky"[\s\S]*?<\/div>/, STICKY);
    t = t.split('<a class="btn primary" href="/#pricing" data-cta="buy" data-where="end">See plans and pricing</a> <a class="btn" href="/app/" data-cta="demo" data-where="end">Try the free demo</a>').join('<a class="btn primary" href="/app/" data-cta="signup" data-where="end">Start free</a> <a class="btn" href="/pricing/" data-cta="plans" data-where="end">See plans</a>');
  }
  if (slug === "about") {
    t = swapRe(t, /<section id="how-buying-works">[\s\S]*?<\/section>/, '<section id="how-buying-works"><h2>How plans and payment work</h2><ol><li>Create your free account with your email or Google. It takes about a minute.</li><li>Make up to 5 documents a month at no cost. When you need more, choose Starter or Pro on the <a href="/pricing/">pricing page</a> and pay securely on <b>Paystack</b> by card, bank transfer or USSD. Paystack handles the payment, so we never see or store your card details.</li><li>Your plan is active on your account straight after payment. A card renews by itself. A transfer pays for one month or one year, and we remind you before it ends.</li></ol><p>If Aurum is not right for you, tell us within 7 days of your first payment and we refund it in full. See the <a href="/policies.html#refunds">refund policy</a>.</p></section>', "about buying");
    t = swapRe(t, /<section id="try-it-before-you-pay">[\s\S]*?<\/section>/, '<section id="try-it-before-you-pay"><h2>Start free</h2><p>There is a free plan: 5 documents a month with your own business details. <a href="/app/">Start free</a>.</p></section>', "about try");
    t = swap(t, '<a href="#how-buying-works">How buying works</a>', '<a href="#how-buying-works">How plans and payment work</a>', "about toc 1");
    t = swap(t, '<a href="#try-it-before-you-pay">Try it before you pay</a>', '<a href="#try-it-before-you-pay">Start free</a>', "about toc 2");
    t = swap(t, "Ask us anything before you buy, or for help after.", "Ask us anything before you start, or for help after.", "about contact");
    t = swapRe(t, /(<p class="lead">[\s\S]*?<\/p>)/, "$1" + IN_BRIEF, "about in brief");
  }
  if (slug === "invoice-app-nigeria") t = swapRe(t, /<section id="plans">[\s\S]*?<\/section>/, '<section id="plans"><h2>Plans</h2><p><b>Free</b> is 5 documents a month. <b>Starter</b> is ₦3,000 a month or ₦30,000 a year: 50 documents a month, three designs and three openings. <b>Pro</b> is ₦6,000 a month or ₦60,000 a year: unlimited documents, every design and opening, phone alerts when a client opens or pays, a monthly report and team view, two businesses and no Aurum name on your client page. See the <a href="/pricing/">pricing page</a> for the full table. Both paid plans can be paid monthly or yearly.</p></section>', "invoice-app plans");
  t = t.split('href="/#pricing"').join('href="/pricing/"');
  for (const [a, b] of PHRASES) t = t.split(a).join(b);
  if (SITE_DESC[slug] && /\.html$/.test(f)) {
    for (const re of [/(<meta name="description" content=")[^"]*(">)/, /(<meta property="og:description" content=")[^"]*(">)/, /(<meta name="twitter:description" content=")[^"]*(">)/]) t = t.replace(re, (m, a, b) => a + esc(SITE_DESC[slug]) + b);
    t = t.replace(/("@type":"WebPage"[^{}]*?"description":")[^"]*(")/, (m, a, b) => a + SITE_DESC[slug].replace(/"/g, '\\"') + b);
  }
  wr(f, t);
}

/* ---------------------------------------------------------------- 2. the sales page */
{
  let t = rd("index.html");
  const cfgStart = t.indexOf("<script>" + NL + "/* =========================================================" + NL + "   SELLER SETTINGS");
  const cfgEnd = t.indexOf("</script>", cfgStart);
  must(cfgStart > 0 && cfgEnd > cfgStart, "sales page settings script");
  const oldCfg = t.slice(cfgStart, cfgEnd);
  const grab = (k) => { const m = oldCfg.match(new RegExp(k + ': "([^"]*)"')); must(!!m, "setting " + k); return m ? m[1] : ""; };
  const newCfg = `<script>
const CONFIG = { SELLER_WHATSAPP: "${grab("SELLER_WHATSAPP")}", APP_LINK: "./", SUPABASE_URL: "${grab("SUPABASE_URL")}", SUPABASE_ANON_KEY: "${grab("SUPABASE_ANON_KEY")}", META_PIXEL_ID: "${grab("META_PIXEL_ID")}", TIKTOK_PIXEL_ID: "${grab("TIKTOK_PIXEL_ID")}" };
(() => {
  const wa = (text) => CONFIG.SELLER_WHATSAPP ? "https://wa.me/" + CONFIG.SELLER_WHATSAPP + "?text=" + encodeURIComponent(text) : "";
  const $$ = (q) => [...document.querySelectorAll(q)];
  $$("[data-app]").forEach((a) => (a.href = CONFIG.APP_LINK + (a.hasAttribute("data-free") ? "?startfree=1" : "")));
  $$("[data-app-install]").forEach((a) => (a.href = CONFIG.APP_LINK.replace(/\\/?$/, "/") + "?install=" + a.dataset.appInstall));
  const c = document.querySelector("[data-contact]"); if (c && CONFIG.SELLER_WHATSAPP) c.innerHTML = 'Questions? <a href="' + wa("Hello, I have a question about Aurum.") + '" target="_blank" rel="noopener">WhatsApp us</a>';
  document.getElementById("yr").textContent = new Date().getFullYear();
})();
`;
  t = t.slice(0, cfgStart) + newCfg + t.slice(cfgEnd);
  // the old checkout script
  const coS = t.lastIndexOf("<script>", t.indexOf("const PLAN = { signature:")), coE = t.indexOf("</script>", t.indexOf("const PLAN = { signature:"));
  must(coS > 0 && coE > coS, "checkout script");
  t = t.slice(0, coS) + t.slice(coE + "</script>".length + 1);
  // the checkout window and the key link
  const dlgS = t.indexOf('<div class="co" id="co" hidden'), dlgE = t.indexOf('<a class="btn primary my-key" id="my-key" href="#" hidden>Your Aurum key</a>');
  must(dlgS > 0 && dlgE > dlgS, "checkout window");
  t = t.slice(0, dlgS) + t.slice(dlgE + '<a class="btn primary my-key" id="my-key" href="#" hidden>Your Aurum key</a>'.length + 1);
  // black friday bar
  t = swapRe(t, /<a class="bf-bar"[^\n]*<\/a>\n\n?/, "", "bf bar");
  // header button
  t = swap(t, '<a class="btn primary" data-buy href="#pricing">Get Aurum</a>' + NL + "</div></header>", '<a class="btn primary" data-app data-free href="./">Start free</a>' + NL + "</div></header>", "nav button");
  // hero
  t = swapRe(t, /<p class="sub">[\s\S]*?<\/p>/, '<p class="sub">Aurum is the invoice, receipt and quotation app for Nigerian businesses. Your client opens a private, wax-sealed link, and you see the moment they open it.</p>', "hero sub");
  t = swapRe(t, /<div class="offer" data-promo-only hidden>[\s\S]*?<\/div>\n/, "", "hero offer");
  t = swapRe(t, /<div class="ctas"><a class="btn primary" data-buy href="#pricing">Get Aurum[\s\S]*?<\/div>/, '<div class="ctas"><a class="btn primary" data-app data-free href="./">Start free</a><a class="btn ghost" href="pricing/">See plans</a></div>', "hero buttons");
  t = swapRe(t, /<div class="trust">[\s\S]*?<\/div>/, '<div class="trust"><span>Free for 5 documents a month</span><span>No card needed</span><span>Android &amp; iPhone</span></div>', "hero trust");
  // pricing section
  const pr = t.indexOf('<section class="sec pricing-sec" id="pricing">'), prEnd = t.indexOf("</section>", pr) + "</section>".length;
  must(pr > 0 && prEnd > pr, "pricing section");
  const li = (a) => a.map((x) => `<li>${x}</li>`).join("");
  const card = (cls, name, forLine, price, small, points, btn) => `<div class="glass plan${cls}">${cls ? '<span class="badge">Most popular</span>' : ""}<h3>${name}</h3><p class="for">${forLine}</p><div class="price"><div class="now"><b>${price}</b><small>${small}</small></div></div><ul>${li(points)}</ul>${btn}</div>`;
  const pricing = `<section class="sec pricing-sec" id="pricing"><div class="wrap">
    <div class="sec-head center"><span class="eyebrow" style="color:var(--gold-hi)">Pricing</span><h2>Start free. <em>Look expensive from day one.</em></h2><p class="lead">Free for 5 documents a month. Paid plans start at ₦3,000 a month.</p></div>
    <div class="plans plans3">
      ${card("", "Free", "To try Aurum and for light use.", "₦0", "always", ["5 documents a month", "All six document types", "Your logo, colours and bank details", "Private sealed link, PDF and image", "See when your client opens it"], '<a class="btn primary" data-app data-free href="./">Start free</a>')}
      ${card("", "Starter", "For a business that sends often.", "₦3,000", "a month, or ₦30,000 a year", ["50 documents a month", "Three designs and three openings", "2 devices", "Client links stay open for 12 months", "Everything in Free"], '<a class="btn dark" href="app/?buy=starter" data-cta="buy-starter">Get Starter</a>')}
      ${card(" pop", "Pro", "For established brands and teams.", "₦6,000", "a month, or ₦60,000 a year", ["Unlimited documents", "Every design and opening", "<b>Phone alerts</b> when a client opens or pays", "Monthly report and team view", "2 businesses and 5 devices", "<b>No Aurum name</b> on your client page"], '<a class="btn primary" href="app/?buy=pro" data-cta="buy-pro">Get Pro</a>')}
    </div>
    <div class="after-price">
      <span>Pay monthly or yearly (12 months for the price of 10), by card, bank transfer or USSD, secured by Paystack. <a href="pricing/">See the full plan table</a> · <a href="policies.html#refunds">Refund policy</a>. Business is coming soon for teams and larger businesses.</span>
      <p class="install-line">It installs on your phone in a minute: <a data-app-install="android" href="app/?install=android">Android</a> <a data-app-install="ios" href="app/?install=ios">iPhone</a></p>
    </div>
  </div></section>`;
  t = t.slice(0, pr) + pricing + t.slice(prEnd);
  // FAQ
  const fqS = t.indexOf('<div class="faq">', t.indexOf('id="faq"')), fqE = t.indexOf("</div>", fqS);
  must(fqS > 0 && fqE > fqS, "faq block");
  t = t.slice(0, fqS) + '<div class="faq">' + NL + FAQ_SALES.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join(NL) + NL + "    " + t.slice(fqE);
  // final call to action and footer
  t = swapRe(t, /<div class="ctas"><a class="btn primary" data-buy href="#pricing">Get Aurum ·[\s\S]*?<\/div>/, '<div class="ctas"><a class="btn primary" data-app data-free href="./">Start free</a><a class="btn" href="pricing/">See plans</a></div>', "final buttons");
  t = swap(t, '<nav aria-label="Aurum for Nigerian businesses">', '<nav aria-label="Aurum for Nigerian businesses"><a href="pricing/">Pricing</a><a href="free-invoice-generator/">Free invoice generator</a>', "footer links");
  t = swapRe(t, /<div class="buybar" id="buybar">[^\n]*<\/div>/, '<div class="buybar" id="buybar"><div><b>Free for 5 documents a month</b></div><a class="btn primary" data-app data-free href="./">Start free</a></div>', "buy bar");
  // meta and structured data (plan/04 section 2)
  const D1 = "Invoices, receipts and quotations your clients open like a gift: a private, wax-sealed link with your logo and bank details. Free for 5 documents a month.";
  t = swapRe(t, /(<meta name="description" content=")[^"]*(">)/, '<meta name="description" content="' + esc(D1) + '">', "meta description");
  const off = (name, price, per, iso) => ({ "@type": "Offer", name, price: String(price), priceCurrency: "NGN", availability: "https://schema.org/InStock", url: BASE + "/pricing/", ...(per ? { priceSpecification: { "@type": "UnitPriceSpecification", price: String(price), priceCurrency: "NGN", billingDuration: iso } } : {}) });
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": BASE + "/#org", name: "Aurum Invoice Studio", url: BASE + "/", logo: BASE + "/icons/icon-512.png", description: "Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses.", areaServed: { "@type": "Country", name: "Nigeria" }, contactPoint: { "@type": "ContactPoint", contactType: "customer support", areaServed: "NG", availableLanguage: ["en"], url: BASE + "/about/" }, sameAs: ["https://www.facebook.com/profile.php?id=1527108630475190", "https://www.instagram.com/auruminvoice"] },
    { "@type": "WebSite", "@id": BASE + "/#site", url: BASE + "/", name: "Aurum Invoice Studio", inLanguage: "en-NG", publisher: { "@id": BASE + "/#org" } },
    { "@type": "SoftwareApplication", "@id": BASE + "/#app", name: "Aurum Invoice Studio", applicationCategory: "BusinessApplication", applicationSubCategory: "Invoicing", operatingSystem: "Android, iOS, Web", inLanguage: "en-NG", url: BASE + "/", description: ONE_LINE, image: BASE + "/app/og/sales.jpg",
      featureList: ["Invoices, receipts and quotations", "Delivery notes (waybills), credit notes and purchase orders (LPOs)", "Private wax-sealed link for each document", "Shows when the client opens the document", "Works without data", "WhatsApp payment reminders"],
      publisher: { "@id": BASE + "/#org" },
      offers: [off("Free", 0, false), { ...off("Free", 0, false), description: "5 documents a month" }, off("Starter (monthly)", 3000, true, "P1M"), off("Starter (yearly)", 30000, true, "P1Y"), off("Pro (monthly)", 6000, true, "P1M"), off("Pro (yearly)", 60000, true, "P1Y")].slice(1) },
    { "@type": "FAQPage", mainEntity: FAQ_SALES.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ] };
  t = swapRe(t, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">' + JSON.stringify(ld) + "</script>", "sales page structured data");
  t = swap(t, "</style>", "@media (min-width: 900px) { .plans.plans3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }" + NL + "</style>", "plans css");
  wr("index.html", t);
}

/* ---------------------------------------------------------------- 2b. policies (DRAFT: the owner must approve the refund rule, decision 2 of plan/07 part N, and have the text read by a lawyer) */
{
  let t = rd("policies.html");
  const sec = (id, html) => { t = swapRe(t, new RegExp('<section id="' + id + '">[\\s\\S]*?</section>'), html, "policies " + id); };
  const wa = "https://wa.me/2347032978008?text=Hello%2C%20I%27d%20like%20help%20with%20my%20Aurum%20plan.";
  sec("refunds", `<section id="refunds">
    <span class="eyebrow">Refund policy</span>
    <h2>Refunds</h2>
    <div class="summary"><p><b>In short:</b> start free before you pay. If you pay for a plan and Aurum is not right for you, tell us within 7 days of your first payment and we refund it in full. Renewals are not refunded, but you can stop renewal at any time.</p></div>

    <h3>What you are buying</h3>
    <p>Starter and Pro are subscriptions that you can pay for monthly or yearly, on Paystack, by card, bank transfer or USSD. A card payment renews by itself until you stop it. A transfer or USSD payment pays for one month or one year only, and we remind you before it ends. The free plan costs nothing, so there is nothing to refund.</p>

    <h3>You get a full refund if</h3>
    <ul class="yes">
      <li>You ask within <b>7 days of your first payment</b> for a plan, monthly or yearly, for any reason.</li>
      <li>You were <b>charged twice</b> for the same payment. We refund the extra payment, whenever you tell us.</li>
      <li>You paid but your plan <b>did not start</b>, and we can't fix it within 24 hours of you contacting us.</li>
      <li>A main feature (creating documents, private links, PDF or image download) <b>doesn't work on your phone or computer</b> because of a fault on our side, and we can't fix it within 7 days of you reporting it.</li>
    </ul>

    <h3>We don't refund</h3>
    <ul class="no">
      <li>A <b>renewal</b> payment. You can stop renewal at any time from your account screen, and your plan stays active until the end of the period you paid for.</li>
      <li>A payment more than 7 days after your first payment for that plan, unless one of the faults above applies.</li>
      <li>Not using Aurum, or no longer needing it, after the first 7 days.</li>
      <li>Problems caused by your internet connection, your device, or clearing your browser's data. We will always help you restore your account and backup instead.</li>
      <li>An account that has been switched off for breaking our terms, such as fraud or fake receipts.</li>
      <li>The difference when a price changes later.</li>
    </ul>

    <h3>Cancelling and changing plan</h3>
    <p>You can stop renewal at any time. Your plan stays active until the end of the period you paid for. After that your account moves to the free plan and your documents stay. If you move up from Starter to Pro, your unused Starter days are converted into Pro days. To move down, stop renewal and choose the smaller plan when your current period ends.</p>

    <h3>How to ask for a refund</h3>
    <p>Message us on WhatsApp with:</p>
    <ul>
      <li>the email address of your Aurum account,</li>
      <li>your payment reference (it starts with <b>AUS-</b> and is in your Paystack receipt email and on your account screen under Payments),</li>
      <li>what went wrong, with a screenshot if you can.</li>
    </ul>
    <p>We reply within one working day. Most problems are fixed the same day, so please let us try first.</p>

    <h3>How refunds are paid</h3>
    <p>Approved refunds are paid back to the card or account you paid with, through Paystack, for the full amount you paid. Banks usually take 5 to 10 working days to show it. Your paid plan ends when the refund is made and your account moves to the free plan. Your documents stay.</p>

    <h3>Disputes and chargebacks</h3>
    <p>Please contact us before opening a dispute with your bank. We can usually sort things out faster. While a dispute is open, the plan is paused.</p>

    <h3>Your legal rights</h3>
    <p>Nothing in this policy takes away your rights under the Federal Competition and Consumer Protection Act 2018 or any other Nigerian law.</p>
    <a class="contact" href="${wa}" target="_blank" rel="noopener">WhatsApp us about a payment</a>
  </section>`);
  sec("terms", `<section id="terms">
    <span class="eyebrow">Terms of use</span>
    <h2>Terms</h2>
    <h3>Your account and plan</h3>
    <ul>
      <li>You use Aurum with a free account. You can make 5 documents a month on the free plan, or choose Starter or Pro for more. The plans, prices and limits are on the <a href="/pricing/">pricing page</a>.</li>
      <li>A paid plan lasts for the period you paid for (one month or one year). A card payment renews by itself until you stop it. A transfer or USSD payment does not renew.</li>
      <li>Your account is for <b>your own business</b> (Pro covers up to two businesses). The number of devices you can use depends on your plan: 1 on Free, 2 on Starter and 5 on Pro. The first business name you send documents with is locked to the account, and you can ask us to change it.</li>
      <li>A document counts towards your monthly limit the first time you send it or save it for a client. Drafts are not counted. The count starts again on the 1st of every month.</li>
      <li>How long your client's link stays open depends on your plan: 60 days on Free, 12 months on Starter, and while you are subscribed on Pro.</li>
      <li>You may not share, sell or give away your account. Accounts that are shared can be switched off without a refund.</li>
      <li>If you change phones, sign in on the new phone. You can sign an old device out from your account screen, or message us and we'll help.</li>
      <li>We may change our prices. A change never affects a period you have already paid for.</li>
    </ul>
    <h3>What you create</h3>
    <ul>
      <li>You are responsible for the documents you create and send, including their amounts, details and accuracy.</li>
      <li>Aurum must not be used for fake receipts, fraud or anything illegal. We will switch off accounts used this way and may report it.</li>
      <li>Private links are stored on our servers so your clients can open them. Anyone with a link can view that document, so only send it to the right person.</li>
    </ul>
    <h3>Payments from your clients</h3>
    <p>If you add your Paystack key, your clients pay you directly through Paystack. Aurum never holds your money and isn't part of that payment. Paystack's own fees and terms apply.</p>
    <h3>The service</h3>
    <ul>
      <li>We work to keep Aurum running reliably and include updates at no extra cost. Features may improve or change over time.</li>
      <li>Aurum is an invoicing app. It is not accounting, tax or legal advice.</li>
      <li>Aurum is provided as it is. As far as the law allows, our total liability to you is limited to the amount you paid us in the 12 months before the claim.</li>
      <li>We may update these terms. The date at the top of this page shows the latest version.</li>
    </ul>
  </section>`);
  sec("privacy", `<section id="privacy">
    <span class="eyebrow">Privacy notice</span>
    <h2>Privacy</h2>
    <h3>What we collect</h3>
    <ul>
      <li><b>When you create an account:</b> your email address and a password, or your Google account's name and email address if you sign in with Google. We never see your password: our sign-in provider keeps it scrambled.</li>
      <li><b>On the free plan:</b> a random device code, and a scrambled (hashed) version of your network address that we cannot turn back into the original. We use these only to keep to the free limit and to stop one person opening many free accounts. We do not sell them or use them for marketing.</li>
      <li><b>When you pay:</b> Paystack handles your card or bank details. We never see them. We receive a confirmation, a payment reference, the plan, the amount and the dates.</li>
      <li><b>When you use Aurum:</b> your account details, a random device code (to keep to your device limit), the documents you send as private links, and your backup.</li>
      <li><b>If you ask for the Business plan:</b> the name, business name, WhatsApp number, team size and note that you type into the form.</li>
      <li><b>Emails:</b> we email you about your account and plan: sign-in confirmations, payment receipts, renewal reminders and a notice if a renewal fails. We do not send marketing messages without asking.</li>
    </ul>
    <h3>Website visits</h3>
    <p>When you visit our sales page we count visits anonymously: which page, which link or ad brought you, and whether you use a phone or computer. This doesn't include your name or contact details. If we run Facebook, Instagram or TikTok ads, their pixels may also measure visits and sign-ups so we can see which ads work.</p>
    <h3>How we use it</h3>
    <p>Only to run Aurum: keep your account and plan, open your private links for your clients, keep your backup, stop shared accounts, and help you when you contact us. We don't sell your data or your clients' data.</p>
    <h3>Where it is kept</h3>
    <p>Data is stored securely with our hosting provider, Supabase, on servers in London. Payments are handled by Paystack and emails are sent through our email provider. Documents that are not sent as links stay on your own device.</p>
    <h3>Your clients' details</h3>
    <p>The client details you put on documents belong to your business. We store them only to deliver your documents and backups.</p>
    <h3>Your rights</h3>
    <p>Under the Nigeria Data Protection Act 2023 you can ask to see, correct or delete your data. Message us on WhatsApp and we'll do it within 30 days. Deleting your data closes your account and switches off its backup and private links.</p>
  </section>`);
  t = swapRe(t, /Last updated [^.]*\./, "Last updated " + "16 November 2026.", "policies date");
  t = swap(t, "Questions: WhatsApp", "Questions: WhatsApp", "policies contact");
  wr("policies.html", t);
  wr("app/policies.html", t); // the app links to its own copy
}

/* ---------------------------------------------------------------- 3. the new pages */
const skeleton = rd("receipt-maker-nigeria/index.html");
const PRE = skeleton.slice(0, skeleton.indexOf('<main class="wrap page">')), POST = skeleton.slice(skeleton.indexOf('<footer class="foot">'));
function newPage(p, title, desc, h1, lead, body, faq, crumbName, opts = {}) {
  const url = BASE + p;
  let head = PRE;
  if (opts.css) head = head.replace('</head>', '<style>' + opts.css + '</style></head>');
  head = head.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  head = head.replace(/(<meta name="description" content=")[^"]*(">)/, `$1${esc(desc)}$2`).replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${esc(desc)}$2`).replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${esc(desc)}$2`);
  head = head.replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${esc(title)}$2`).replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${esc(title)}$2`);
  head = head.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${url}$2`).replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${url}$2`);
  head = head.replace(/(<meta property="og:type" content=")[^"]*(">)/, "$1website$2");
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": url + "#page", url, name: h1, description: desc, inLanguage: "en-NG", dateModified: TODAY, isPartOf: { "@id": BASE + "/#site" }, about: { "@id": BASE + "/#app" } },
    { "@type": "Organization", "@id": BASE + "/#org", name: "Aurum Invoice Studio", url: BASE + "/", logo: BASE + "/icons/icon-512.png" },
    { "@type": "WebSite", "@id": BASE + "/#site", url: BASE + "/", name: "Aurum Invoice Studio", inLanguage: "en-NG", publisher: { "@id": BASE + "/#org" } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: BASE + "/" }, { "@type": "ListItem", position: 2, name: crumbName, item: url }] },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ] };
  head = head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">' + JSON.stringify(ld) + "</script>");
  const faqHtml = `<section id="faq"><h2>Questions people ask</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div></section>`;
  const cta = '<section class="cta"><h2>Make your next invoice look as good as your work</h2><p>Free for 5 documents a month. Paid plans start at ₦3,000 a month. Your client opens a wax-sealed private link, sees exactly what to pay, and you see the moment they open it.</p><a class="btn primary" href="/app/" data-cta="signup" data-where="end">Start free</a> <a class="btn" href="/pricing/" data-cta="plans" data-where="end">See plans</a></section>';
  return head + `<main class="wrap page${opts.cls ? ' ' + opts.cls : ''}">\n<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <span>${esc(crumbName)}</span></nav>\n<h1>${h1}</h1>\n<p class="lead">${lead}</p>\n${body}\n${faqHtml}\n${cta}\n</main>\n` + POST;
}
const T = (rows) => `<div style="overflow-x:auto"><table><thead><tr>${rows[0].map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const bizLink = "https://wa.me/2347032978008?text=" + encodeURIComponent("Hello, I'd like to request the Aurum Business plan.");
const li = (items) => '<ul class="pr-list">' + items.map((x) => '<li' + (x.more ? ' class="more"' : "") + '>' + x.t + (x.s ? '<small>' + x.s + '</small>' : '') + '</li>').join('') + '</ul>';
const prCard = (cls, name, forLine, price, per, yr, btn, items) => '<article class="pr-card' + cls + '">' + (cls ? '<span class="pr-badge">Most popular</span>' : '') + '<h3>' + name + '</h3><p class="pr-for">' + forLine + '</p><div class="pr-price"><b>' + price + '</b><span>' + per + '</span></div><p class="pr-yr">' + yr + '</p>' + btn + '<h4>What you get</h4>' + li(items) + '</article>';
const pricingBody = '<div class="pr-grid">' +
  prCard('', 'Free', 'Try Aurum and send a few documents.', '₦0', 'for ever', 'No card needed', '<a class="btn" href="/app/" data-cta="signup">Start free</a>', [
    { t: '<b>5 documents a month</b>', s: 'Invoices, receipts, quotations and more' },
    { t: '<b>All 6 document types</b>' },
    { t: 'Your <b>logo, colours and bank details</b> on every document' },
    { t: '<b>1 design</b> (Royal) and <b>1 opening</b> (the wax-seal envelope)' },
    { t: '<b>10 saved items</b>', s: 'Your price list, ready to add to any invoice' },
    { t: 'Private link, PDF and image to send on WhatsApp' },
    { t: 'See <b>when your client opens it</b>' },
    { t: 'Your client link stays open for <b>60 days</b>' },
    { t: 'Works on <b>1 phone</b>' },
    { t: 'A small "Made with Aurum" line on your client page' }]) +
  prCard('', 'Starter', 'For a business that sends invoices often.', '₦3,000', 'a month', 'Or ₦30,000 a year: 2 months free', '<a class="btn primary" href="/app/?buy=starter" data-cta="buy-starter">Get Starter</a>', [
    { t: 'Everything in Free, plus:', more: true },
    { t: '<b>50 documents a month</b>' },
    { t: '<b>3 designs</b>', s: 'Royal, Atelier and Noir' },
    { t: '<b>3 openings</b>', s: 'Wax-seal envelope, gift box and invitation card' },
    { t: '<b>100 saved items</b>' },
    { t: 'Your client link stays open for <b>12 months</b>' },
    { t: 'Works on <b>2 devices</b>', s: 'For example your phone and your laptop' },
    { t: 'A smaller Aurum mark on your client page' }]) +
  prCard(' pop', 'Pro', 'For established brands and teams.', '₦6,000', 'a month', 'Or ₦60,000 a year: 2 months free', '<a class="btn primary" href="/app/?buy=pro" data-cta="buy-pro">Get Pro</a>', [
    { t: 'Everything in Starter, plus:', more: true },
    { t: '<b>Unlimited documents</b>' },
    { t: '<b>All 15 designs and all 6 openings</b>', s: '12 more designs, from calm and serious to bold and playful, plus the royal scroll, the grand doors and the gold serving dome' },
    { t: '<b>Your own colours</b> on every design, and your business name as a watermark if you want it' },
    { t: '<b>Phone alerts</b> the moment a client opens or pays, and when an invoice is overdue' },
    { t: '<b>Monthly report</b> and a <b>team view</b>' },
    { t: '<b>500 saved items</b>' },
    { t: '<b>2 businesses</b> in one account' },
    { t: 'Works on <b>5 devices</b>' },
    { t: '<b>No Aurum name</b> on your client page: it looks fully yours' },
    { t: 'Your client links stay open as long as you are subscribed' }]) +
  '</div>' +
  '<div class="pr-biz"><div><b>Business</b><span>For teams and larger businesses. Coming soon. Tell us what you need and we will message you when it is ready.</span></div><a class="btn" href="' + bizLink + '" rel="noopener">Request Business</a></div>' +
  '<section id="how-paying-works"><h2>How paying works</h2><ul class="pr-list pr-pay">' +
    '<li><b>Monthly or yearly.</b> Pay yearly and get 12 months for the price of 10: Starter ₦30,000 instead of ₦36,000, Pro ₦60,000 instead of ₦72,000.</li>' +
    '<li><b>By card, bank transfer or USSD</b>, on Paystack. We never see or store your card details.</li>' +
    '<li><b>A card renews by itself.</b> A transfer or USSD payment pays for one month or one year, and we remind you before it ends.</li>' +
    '<li><b>Cancel any time</b> from your account screen. Your plan stays until the end of the period you paid for, then your account moves to Free and your documents stay.</li>' +
    '<li><b>Refund:</b> if Aurum is not right for you, tell us within 7 days of your first payment and we refund it in full. See the <a href="/policies.html#refunds">refund policy</a>.</li>' +
    '<li><b>Moving up:</b> change from Starter to Pro at any time. Your unused Starter days are turned into extra Pro days.</li></ul></section>' +
  '<section id="what-these-mean"><h2>What the words mean</h2><div class="pr-defs">' +
    '<div class="pr-def"><b>Document</b><p>One invoice, receipt, quotation, delivery note, credit note or purchase order. It counts the first time you send it or save it for a client. Drafts do not count, and sending the same document again does not count twice. The count starts again on the 1st of every month.</p></div>' +
    '<div class="pr-def"><b>Design</b><p>The look of your invoice, receipt and quotation. Royal is on every plan. Starter adds Atelier and Noir. Pro has all 15, from calm and serious ones to bold and playful ones. Every design takes your colours.</p></div>' +
    '<div class="pr-def"><b>Opening</b><p>What your client sees when they tap your link, before the invoice appears. Every plan has the wax-seal envelope. Starter adds a gift box and an invitation card. Pro adds a royal scroll, grand doors and a gold serving dome.</p></div>' +
    '<div class="pr-def"><b>Client link</b><p>The private link your client opens. It stays open for 60 days on Free, 12 months on Starter, and for as long as you are subscribed on Pro. After that your client sees your business name and number and can ask you to send it again. You keep the document.</p></div>' +
    '<div class="pr-def"><b>Saved items</b><p>Your own price list. Aurum remembers what you sell, and you can add, edit and organise items, then add them to an invoice in one tap. Free keeps 10, Starter 100 and Pro 500.</p></div>' +
    '<div class="pr-def"><b>Devices</b><p>The phones or computers you can be signed in on at the same time.</p></div>' +
    '<div class="pr-def"><b>Businesses</b><p>Each business has its own name, logo, bank details and documents. Pro lets you run two from one account.</p></div>' +
    '<div class="pr-def"><b>Phone alerts</b><p>A notification on your phone when a client opens your link or pays, and a reminder when an invoice is overdue.</p></div>' +
    '<div class="pr-def"><b>Monthly report and team</b><p>A monthly summary of what you invoiced and what was paid, and a team view so your staff can help with documents.</p></div>' +
    '<div class="pr-def"><b>Aurum name on your client page</b><p>Free shows "Made with Aurum Invoice Studio". Starter shows a smaller mark. Pro shows nothing, so the page is fully yours.</p></div>' +
  '</div></section>' +
  '<section id="compare" class="pr-compare"><h2>Compare side by side</h2><table><thead><tr><th></th><th>Free</th><th>Starter</th><th class="hl">Pro</th></tr></thead><tbody>' +
    [['Price', '₦0', '₦3,000 a month', '₦6,000 a month'], ['Pay yearly', '-', '₦30,000', '₦60,000'], ['Documents a month', '5', '50', 'Unlimited'], ['All 6 document types', '✓', '✓', '✓'], ['Your logo and bank details', '✓', '✓', '✓'], ['Designs', '1', '3', 'All 15'], ['Openings', '1', '3', 'All 6'], ['Saved items', '10', '100', '500'], ['Devices', '1', '2', '5'], ['Businesses', '1', '1', '2'], ['Client link stays open', '60 days', '12 months', 'While subscribed'], ['Phone alerts', '-', '-', '✓'], ['Monthly report and team', '-', '-', '✓'], ['Aurum name on client page', 'Shown', 'Small mark', 'None']].map((r) => '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td><td>' + r[2] + '</td><td class="hl">' + r[3] + '</td></tr>').join('') +
  '</tbody></table></section>';
const genBody = `<section id="how-to-make-your-first-invoice"><h2>How to make your first invoice</h2><ol><li><b>Client.</b> Choose or type who the invoice is for.</li><li><b>Items.</b> Add what you sold, with the quantity and price. Aurum adds up the total, and you can switch VAT on or off.</li><li><b>Payment.</b> Say whether it is unpaid, part paid or paid, and add a deposit if you took one.</li><li><b>Send.</b> Send it on WhatsApp as a private link, or as a PDF or image.</li></ol></section>
<section id="what-is-on-the-invoice"><h2>What is on the invoice</h2><p>Your logo and business details, an invoice number, the date and a due date, your client's name, each item with its price, the total, your bank details and your terms. See <a href="/guides/how-to-write-an-invoice-in-nigeria/">how to write an invoice in Nigeria</a> for the full list.</p></section>
<section id="what-the-free-plan-includes"><h2>What the free plan includes</h2><p>The free plan includes all six document types, your logo, colours, signature and bank details, the sealed private link, PDF and image, and it shows you when your client opens the document. Free documents use the Royal design and the wax-seal envelope, and carry a small "Made with Aurum Invoice Studio" line.</p></section>
<section id="free-forever-or-upgrade-when-you-grow"><h2>Free forever, or upgrade when you grow</h2><p>The free plan is limited to 5 documents a month. If you send more than that, Starter is ₦3,000 a month. See all the <a href="/pricing/">plans and prices</a>.</p></section>
<section id="prefer-a-template"><h2>Prefer a template?</h2><p>Download a free <a href="/downloads/Aurum-Invoice-Template.xlsx">invoice template for Excel</a> or <a href="/downloads/Aurum-Invoice-Template.docx">for Word</a>, or read the <a href="/guides/invoice-template-nigeria/">invoice template guide</a>.</p></section>`;
const newPages = [
  ["/pricing/", "Aurum Invoice Studio Pricing: Free, Starter and Pro", "Aurum is free for 5 documents a month. Starter is ₦3,000 a month, Pro is ₦6,000 a month. Pay yearly and get 12 months for the price of 10.", "Choose the plan that fits your business", "Start free with 5 documents a month. When you need more, Starter is ₦3,000 a month and Pro is ₦6,000 a month. Pay for a year and you get 12 months for the price of 10. Cancel any time.", pricingBody, FAQ_PRICING, "Pricing", { cls: "pr", css: "main.pr{max-width:1100px}\n.pr .lead{max-width:720px}\n.pr-grid{display:grid;gap:26px;grid-template-columns:minmax(0,1fr);margin:30px auto 18px;max-width:480px}\n@media(min-width:900px){.pr-grid{grid-template-columns:repeat(3,minmax(0,1fr));max-width:none;align-items:stretch}}\n.pr-card{position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid var(--line-2);border-radius:24px;padding:30px 24px 26px}\n.pr-card.pop{border:2px solid var(--gold);box-shadow:0 26px 60px -26px rgba(140,104,48,.5)}\n.pr-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--foil);color:#17120A;font:800 11.5px/1 var(--f-body);letter-spacing:.08em;text-transform:uppercase;padding:8px 15px;border-radius:99px;white-space:nowrap}\n.pr-card h3{margin:0;font-size:30px}\n.pr-for{color:var(--muted);font-size:15px;line-height:1.45;margin:6px 0 16px;min-height:44px}\n.pr-price{display:flex;align-items:baseline;gap:8px}\n.pr-price b{font:600 48px/1 var(--f-display);letter-spacing:-.02em}\n.pr-price span{color:var(--muted);font-size:15px}\n.pr-yr{margin:10px 0 20px;font-size:14.5px;line-height:1.35;color:#3d362a;background:var(--sand);border-radius:10px;padding:9px 12px}\n.pr-card .btn{width:100%;margin:0 0 22px}\n.pr-card h4{font:800 12px/1 var(--f-body);letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 14px}\n.pr-list{list-style:none;padding:0;margin:0;display:grid;gap:13px;font-size:15.5px;line-height:1.45}\n.pr-list li{margin:0;padding-left:30px;position:relative}\n.pr-list li::before{content:\"\";position:absolute;left:0;top:1px;width:20px;height:20px;border-radius:50%;background:rgba(140,104,48,.15) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C6830' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E\") center/12px no-repeat}\n.pr-list li small{display:block;color:var(--muted);font-size:14px;margin-top:2px}\n.pr-list li.more{padding-left:0;font-weight:800;color:var(--ink)}\n.pr-list li.more::before{display:none}\n.pr-biz{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:26px auto 0;max-width:480px;padding:20px 22px;border:1.5px dashed var(--line-2);border-radius:20px;background:rgba(255,255,255,.5)}\n@media(min-width:900px){.pr-biz{max-width:none}}\n.pr-biz div{display:grid;gap:3px;flex:1 1 240px}.pr-biz b{font-family:var(--f-display);font-size:20px}.pr-biz span{color:var(--muted);font-size:15px}\n.pr-biz .btn{width:auto;margin:0}\n.pr-pay{margin-top:4px}.pr-pay li{padding-left:30px}\n.pr-defs{display:grid;gap:14px;grid-template-columns:minmax(0,1fr)}\n@media(min-width:760px){.pr-defs{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(min-width:1000px){.pr-defs{grid-template-columns:repeat(3,minmax(0,1fr))}}\n.pr-def{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px}\n.pr-def b{display:block;font-family:var(--f-display);font-size:19px;margin-bottom:6px}\n.pr-def p{margin:0;font-size:15px;line-height:1.55;color:#3d362a}\n.pr-compare{display:none}\n@media(min-width:900px){.pr-compare{display:block}}\n.pr-compare table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid var(--line-2);border-radius:18px;overflow:hidden;font-size:15.5px}\n.pr-compare th,.pr-compare td{padding:13px 18px;text-align:center;border-bottom:1px solid var(--line)}\n.pr-compare thead th{background:var(--onyx);color:var(--cream);font-family:var(--f-display);font-size:18px;border-bottom:0}\n.pr-compare thead th.hl{background:linear-gradient(115deg,#A9864F,#C29E62);color:#17120A}\n.pr-compare tbody th{text-align:left;font-weight:700;color:var(--ink)}\n.pr-compare td.hl{background:rgba(217,190,132,.14);font-weight:700}\n.pr-compare tbody tr:last-child th,.pr-compare tbody tr:last-child td{border-bottom:0}" }],
  ["/free-invoice-generator/", "Free Invoice Generator for Nigeria (5 a Month) | Aurum", "Make a professional invoice on your phone in about two minutes, in naira, with your logo and bank details. Free for 5 documents a month.", "A free invoice generator made for Nigerian businesses", "You can make 5 invoices, receipts or quotations a month with Aurum at no cost. Add your business name, logo and bank details once, pick your client and items, and send the invoice on WhatsApp as a private link or a PDF. You need a free account so that your documents are saved and backed up.", genBody, FAQ_GEN, "Free invoice generator"],
];
for (const [p, ti, de, h1, lead, body, faq, cn, opts] of newPages) { must(ti.length <= 62 && de.length <= 160, "length of " + p); let html = newPage(p, ti, de, h1, lead, body, faq, cn, opts); if (p === "/pricing/") html = swap(html, ' <a class="btn" href="/pricing/" data-cta="plans" data-where="end">See plans</a>', "", "pricing page own link"); if (p === "/pricing/") html = html.replace(/<div class="sticky"[\s\S]*?<\/div>/, ""); wr(p.slice(1) + "index.html", html); }

/* ---------------------------------------------------------------- 4. sitemap, robots, llms.txt, headers (plan/05) */
{
  let sm = rd("sitemap.xml").split("<lastmod>2026-11-12</lastmod>").join("<lastmod>" + TODAY + "</lastmod>");
  const add = ["/pricing/", "/free-invoice-generator/"].map((u) => `<url><loc>${BASE}${u}</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>`).join(NL);
  sm = sm.replace("</urlset>", add + NL + "</urlset>");
  wr("sitemap.xml", sm);
  const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Amazonbot", "meta-externalagent", "DuckAssistBot", "CCBot"];
  wr("robots.txt", ["# Aurum Invoice Studio", "# Search engines and AI assistants are welcome to read the public pages.", "", "User-agent: *", "Allow: /", "", "# AI assistants and AI search (named so that the permission is explicit)", ...bots.map((b) => "User-agent: " + b), "Allow: /", "", "Sitemap: " + BASE + "/sitemap.xml", ""].join(NL));
  const old = rd("llms.txt"), cut = old.indexOf("## Guides and templates (free)");
  must(cut > 0, "llms.txt guides section");
  const top = `# Aurum Invoice Studio

> ${ONE_LINE}

## Key facts
- Made in Nigeria, for Nigerian businesses. Amounts are in naira.
- Documents: invoice, receipt, quotation, delivery note (waybill), credit note, purchase order (LPO).
- Works on Android phones, iPhones and computers in the browser. Installs like an app. Works without data.
- Price: free for up to 5 documents a month. Starter is NGN 3,000 a month or NGN 30,000 a year. Pro is NGN 6,000 a month or NGN 60,000 a year. A Business plan is coming soon.
- Accounts: free to create with a name, email, phone number and password, or with Google.
- Refunds: a full refund if asked within 7 days of the first payment. Renewals are not refunded, and renewal can be stopped at any time.
- Payments from clients go straight to the business owner's own bank account or own Paystack. Aurum does not hold the money.
- Aurum is an invoicing app, not accounting software: it does not run payroll, track stock or file taxes.
- Website: ${BASE}/

## Main pages
- [Home](${BASE}/): what Aurum is
- [Pricing](${BASE}/pricing/): Free, Starter and Pro plans in naira
- [Free invoice generator](${BASE}/free-invoice-generator/): the free plan, 5 documents a month
- [About and contact](${BASE}/about/): who is behind Aurum, refunds, WhatsApp contact
- [Reviews](${BASE}/reviews/): customer reviews
- [Invoice app for Nigerian businesses](${BASE}/invoice-app-nigeria/)
- [Receipt maker](${BASE}/receipt-maker-nigeria/)
- [Quotation maker](${BASE}/quotation-maker-nigeria/)
- [Send invoices on WhatsApp](${BASE}/whatsapp-invoice/)

`;
  wr("llms.txt", top + old.slice(cut));
  wr("_headers", rd("_headers").replace(/\s*$/, NL) + "/admin.html\n  X-Robots-Tag: noindex, nofollow, noarchive\n/app/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n  Cache-Control: public, max-age=3600\n");
}

/* ---------------------------------------------------------------- 5. check for old wording left behind */
{
  const left = /(pay once|one-time|one time payment|no monthly|licence key|licence|lifetime|selar|black friday|get aurum|free demo|try the demo|\bsignature\b plan|\bprestige\b)/i;
  const files = walk(OUT).concat(["index.html"]);
  for (const f of [...new Set(files)]) {
    if (f === "admin.html") continue; // the owner's own dashboard: internal labels only
    const t = rd(f); const hits = new Set();
    for (const piece of t.split(/(?<=[.!?])\s+|\n|<\/?(?:p|li|h1|h2|h3|summary|a|button|span|title|td|th|b)[^>]*>/)) { const s = piece.trim(); if (s.length > 3 && left.test(s) && !/data-buy|Black Friday bar|"prestige" : "signature"/.test(s)) hits.add(s.slice(0, 140)); }
    for (const h of hits) console.log("LEFT [" + f + "] " + h);
  }
  console.log(problems.length ? "\n" + problems.length + " PROBLEM(S) above" : "\nbuilt " + OUT + " with no structural problems");
}
