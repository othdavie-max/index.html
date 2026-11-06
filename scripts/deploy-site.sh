#!/usr/bin/env bash
# Builds the offline game and publishes it to the gh-pages branch (GitHub Pages serves that branch for free).
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build-site.mjs
tmp="$(mktemp -d)"
cp -r site/. "$tmp/"
rev="$(git rev-parse --short HEAD)"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="deploy" -c user.email="deploy@example.invalid" commit -q -m "Deploy ${rev}"
git remote add origin "$(git -C "$OLDPWD" remote get-url origin)"
git push -q --force origin gh-pages
echo "Published. Live at https://$(git -C "$OLDPWD" remote get-url origin | sed -E 's#.*github.com[:/]([^/]+)/([^/.]+(\.html)?)(\.git)?$#\1.github.io/\2#')/"
