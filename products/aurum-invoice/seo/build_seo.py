#!/usr/bin/env python3
"""Generates the SEO pages (guides + product pages), robots.txt and sitemap.xml into ../site-seo/.
Run:  python3 build_seo.py
Content lives in content.py. Edit it there, then run this again and redeploy."""
import os, re, html, json, shutil, datetime
from content import GUIDES, PRODUCTS, HUB, SITE_NAME

BASE = "https://auruminvoicestudio.netlify.app"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site-seo")
TODAY = "2026-11-12"
OG_IMG = BASE + "/app/og/sales.jpg"
LOGO = BASE + "/icons/icon-512.png"
esc = html.escape

def strip_tags(s): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()
def slugify(s): return re.sub(r"[^a-z0-9]+", "-", strip_tags(s).lower()).strip("-")

CSS_LINK = '<link rel="stylesheet" href="/seo.css">'
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&display=swap">')

def jsonld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"

def org_ld():
    return {"@type": "Organization", "@id": BASE + "/#org", "name": SITE_NAME, "url": BASE + "/", "logo": LOGO,
            "description": "Invoice, receipt and quotation app for Nigerian businesses."}

def head(title, desc, path, og_type="article", extra=""):
    url = BASE + path
    return f"""<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#0E0C0A">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG_IMG}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="en_NG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{OG_IMG}">
<link rel="icon" type="image/png" href="/icons/favicon-64.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
{FONTS}
{CSS_LINK}
{extra}
</head>
"""

def header():
    return """<header class="top"><div class="wrap bar">
  <a class="brand" href="/" aria-label="Aurum Invoice Studio, home"><span class="mark">Au</span><span class="name">AURUM</span></a>
  <nav aria-label="Main"><a href="/guides/">Guides</a><a href="/#pricing">Pricing</a><a class="btn sm" href="/#pricing">Get Aurum</a></nav>
</div></header>"""

def footer():
    g = "".join(f'<li><a href="/guides/{x["slug"]}/">{esc(x["nav"])}</a></li>' for x in GUIDES[:8])
    p = "".join(f'<li><a href="/{x["slug"]}/">{esc(x["nav"])}</a></li>' for x in PRODUCTS)
    return f"""<footer class="foot"><div class="wrap cols">
  <div><div class="brand"><span class="mark">Au</span><span class="name">AURUM</span></div>
  <p>Invoices, receipts and quotations your clients open like a gift. Made for Nigerian businesses.</p></div>
  <div><h4>Aurum</h4><ul>{p}<li><a href="/#pricing">Pricing</a></li><li><a href="/policies.html">Refunds &amp; terms</a></li></ul></div>
  <div><h4>Guides</h4><ul>{g}<li><a href="/guides/">All guides</a></li></ul></div>
</div><div class="wrap fine">&copy; 2026 Aurum Invoice Studio. Lagos, Nigeria.</div></footer>"""

def cta(kind="guide"):
    if kind == "product":
        return """<section class="cta"><h2>Make your next invoice look as good as your work</h2>
<p>Pay once, use it on your phone, no monthly fees. Your client opens a wax-sealed private link, sees exactly what to pay, and you see the moment they open it.</p>
<a class="btn primary" href="/#pricing">See plans and pricing</a> <a class="btn" href="/#see">See how it looks</a></section>"""
    return """<section class="cta"><h2>Want this done for you in under a minute?</h2>
<p><b>Aurum Invoice Studio</b> makes invoices, receipts and quotations with your logo, signature and bank details, then delivers them as a private wax-sealed link your client opens like a gift. Pay once, no monthly fees.</p>
<a class="btn primary" href="/#pricing">See plans and pricing</a> <a class="btn" href="/#see">See how it looks</a></section>"""

def toc_and_body(sections):
    toc, body = [], []
    for h, content in sections:
        sid = slugify(h)
        toc.append(f'<li><a href="#{sid}">{esc(h)}</a></li>')
        body.append(f'<section id="{sid}"><h2>{esc(h)}</h2>{content}</section>')
    return "".join(toc), "\n".join(body)

def faq_html(faq):
    if not faq: return ""
    items = "".join(f"<details><summary>{esc(q)}</summary><p>{a}</p></details>" for q, a in faq)
    return f'<section id="faq"><h2>Questions people ask</h2><div class="faq">{items}</div></section>'

def related_html(slugs, kind_map):
    if not slugs: return ""
    lis = []
    for s in slugs:
        if s in kind_map:
            path, title = kind_map[s]
            lis.append(f'<li><a href="{path}">{esc(title)}</a></li>')
    return '<aside class="related"><h3>Keep reading</h3><ul>' + "".join(lis) + "</ul></aside>" if lis else ""

def words(sections, intro, faq):
    t = intro + " ".join(c for _, c in sections) + " ".join(a for _, a in (faq or []))
    return len(strip_tags(t).split())

def page(item, section, kind_map):
    path = f"/{section}/{item['slug']}/" if section else f"/{item['slug']}/"
    title, desc = item["title"], item["desc"]
    n = words(item["sections"], item["intro"], item.get("faq"))
    mins = max(2, round(n / 200))
    toc, body = toc_and_body(item["sections"])
    crumbs = [("Home", BASE + "/")]
    if section: crumbs.append(("Guides", BASE + "/guides/"))
    crumbs.append((item["nav"], BASE + path))
    ld = [{"@context": "https://schema.org", "@graph": [
        {"@type": "Article" if section else "WebPage", "@id": BASE + path + "#page", "headline": item["h1"], "description": desc,
         "datePublished": TODAY, "dateModified": TODAY, "inLanguage": "en-NG", "image": OG_IMG,
         "mainEntityOfPage": BASE + path, "author": {"@id": BASE + "/#org"}, "publisher": {"@id": BASE + "/#org"}, "isPartOf": {"@id": BASE + "/#site"}},
        org_ld(),
        {"@type": "WebSite", "@id": BASE + "/#site", "url": BASE + "/", "name": SITE_NAME, "inLanguage": "en-NG", "publisher": {"@id": BASE + "/#org"}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": nme, "item": u} for i, (nme, u) in enumerate(crumbs)]},
    ]}]
    if item.get("faq"):
        ld[0]["@graph"].append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}} for q, a in item["faq"]]})
    crumb_html = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a>' + (' <span>/</span> <a href="/guides/">Guides</a>' if section else "") + f' <span>/</span> <span>{esc(item["nav"])}</span></nav>'
    meta_line = f'<p class="meta">Updated 12 November 2026 &middot; {mins} min read</p>' if section else ""
    toc_html = f'<nav class="toc" aria-label="On this page"><b>On this page</b><ol>{toc}</ol></nav>' if len(item["sections"]) >= 3 else ""
    doc = head(title, desc, path, "article" if section else "website", jsonld(ld[0])) + f"""<body>
{header()}
<main class="wrap page">
{crumb_html}
<h1>{item["h1"]}</h1>
{meta_line}
<p class="lead">{item["intro"]}</p>
{toc_html}
{body}
{faq_html(item.get("faq"))}
{cta("guide" if section else "product")}
{related_html(item.get("related"), kind_map)}
</main>
{footer()}
</body>
</html>
"""
    return path, doc, n

def hub_page(kind_map):
    path = "/guides/"
    cards = "".join(f'<a class="card" href="/guides/{g["slug"]}/"><b>{esc(g["nav"])}</b><span>{esc(g["desc"])}</span></a>' for g in GUIDES)
    prods = "".join(f'<a class="card gold" href="/{p["slug"]}/"><b>{esc(p["nav"])}</b><span>{esc(p["desc"])}</span></a>' for p in PRODUCTS)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": BASE + path + "#page", "name": HUB["h1"], "description": HUB["desc"], "url": BASE + path, "inLanguage": "en-NG", "isPartOf": {"@id": BASE + "/#site"}},
        org_ld(), {"@type": "WebSite", "@id": BASE + "/#site", "url": BASE + "/", "name": SITE_NAME, "inLanguage": "en-NG"},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"}, {"@type": "ListItem", "position": 2, "name": "Guides", "item": BASE + path}]}]}
    doc = head(HUB["title"], HUB["desc"], path, "website", jsonld(ld)) + f"""<body>
{header()}
<main class="wrap page">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <span>Guides</span></nav>
<h1>{HUB["h1"]}</h1>
<p class="lead">{HUB["intro"]}</p>
<h2>Guides and templates</h2>
<div class="grid">{cards}</div>
<h2>Make them look premium</h2>
<div class="grid">{prods}</div>
{cta("product")}
</main>
{footer()}
</body>
</html>
"""
    return path, doc

def write(path, doc):
    fp = os.path.join(OUT, path.strip("/"), "index.html")
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    open(fp, "w", encoding="utf-8").write(doc)

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), "seo.css"), os.path.join(OUT, "seo.css"))
    kind_map = {g["slug"]: (f"/guides/{g['slug']}/", g["nav"]) for g in GUIDES}
    kind_map.update({p["slug"]: (f"/{p['slug']}/", p["nav"]) for p in PRODUCTS})
    urls = [("/", "1.0", "weekly"), ("/guides/", "0.8", "weekly")]
    total_words = 0
    for g in GUIDES:
        path, doc, n = page(g, "guides", kind_map); write(path, doc); urls.append((path, "0.7", "monthly")); total_words += n
    for p in PRODUCTS:
        path, doc, n = page(p, None, kind_map); write(path, doc); urls.append((path, "0.9", "monthly")); total_words += n
    path, doc = hub_page(kind_map); write(path, doc)
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, pr, fr in urls:
        sm.append(f"<url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod><changefreq>{fr}</changefreq><priority>{pr}</priority></url>")
    sm.append("</urlset>")
    open(os.path.join(OUT, "sitemap.xml"), "w").write("\n".join(sm) + "\n")
    open(os.path.join(OUT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nDisallow: /admin.html\n\nSitemap: {BASE}/sitemap.xml\n")
    print(f"built {len(GUIDES)} guides, {len(PRODUCTS)} product pages, hub, sitemap ({len(urls)} urls), ~{total_words} words")

if __name__ == "__main__":
    main()
