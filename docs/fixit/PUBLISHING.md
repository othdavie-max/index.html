# Publishing the game (free)

The game is one static, offline-capable page. Build it with `npm run build:site` (output in `site/`), publish it with `npm run deploy:site`
(pushes `site/` to the `gh-pages` branch; GitHub Pages serves that branch for free).

First time only: GitHub repo, Settings, Pages, Source "Deploy from a branch", Branch `gh-pages`, folder `/ (root)`, Save.
The link is `https://<your-github-name>.github.io/<repo-name>/`.

Installing: Android Chrome offers "Install app"; iPhone Safari, Share, Add to Home Screen. After the first visit the game works with no data.

## Seeing how the game is doing
1. Sign up free at goatcounter.com (choose a site code, e.g. `noelod`).
2. Put that code in `scripts/site/config.js` (`window.FIX_GC = "noelod"`), run `npm run deploy:site`.
3. Your dashboard at `https://noelod.goatcounter.com` shows visitors, countries, devices and the events below. No accounts, cookies or personal data; nothing is sent if Do Not Track is on or the player is offline.

Events (they appear under "Events" in GoatCounter): `start`, `start/<difficulty>`, `scenario/<name>`, `reached/month-12|24|36|48|72|96|144`
(how far people get), `end/<kind>` (how games end), `open/<screen>` (which features people use: `open/x`, `open/league`, `open/grand`, ...), `installed`.
