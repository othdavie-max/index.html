#!/usr/bin/env bash
# Builds the folder (and zip) you drag onto Netlify. Run from products/aurum-invoice:   bash package.sh [output-folder]
# Layout (it matches the live site): the sales page is the home page; the app and its document pages live in /app/;
# the SEO pages, robots.txt, sitemap and downloads sit at the top level.
set -euo pipefail
OUT="${1:-../../dist/aurum-site}"
rm -rf "$OUT"; mkdir -p "$OUT/app"
cp -r site-seo/. "$OUT/"                         # SEO pages, robots.txt, sitemap.xml, llms.txt, _headers, downloads, og, verification files
cp landing.html "$OUT/index.html"                # the sales page
cp -r landing "$OUT/landing"
cp -r icons "$OUT/icons"
cp policies.html admin.html "$OUT/"
cp index.html sw.js manifest.webmanifest policies.html invoice.html receipt.html quotation.html delivery-note.html credit-note.html purchase-order.html "$OUT/app/"
cp -r icons og env3d "$OUT/app/"
# the public store page: its address in the database and its public key come from the app settings
node -e 'const fs=require("fs"),h=fs.readFileSync("index.html","utf8"),g=(k)=>(h.match(new RegExp(k+": \"([^\"]*)\""))||[])[1];let s=fs.readFileSync("store.html","utf8").replace("__SB__",g("SUPABASE_URL")).replace("__AK__",g("SUPABASE_ANON_KEY"));fs.writeFileSync(process.argv[1]+"/store.html",s)' "$OUT"
printf "/s/*  /store.html  200
" > "$OUT/_redirects"
echo "built $OUT ($(find "$OUT" -type f | wc -l) files)"
