/**
 * Browser smoke test. Starts the Next dev server, plays a new life in both languages by
 * clicking through the real UI, opens every tab and every sheet it can, and fails on any
 * page error or console error. Run with: npm run test:e2e
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 3112;
const URL = `http://localhost:${PORT}/naija-life`;
const server = spawn("npx", ["next", "dev", "-p", String(PORT)], { cwd: process.cwd(), stdio: "ignore", detached: true });
const stop = () => { try { process.kill(-server.pid, "SIGTERM"); } catch { /* already gone */ } };
process.on("exit", stop);

async function waitUp() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(URL); if (r.ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("dev server did not start");
}

const errors = [];
let steps = 0;

async function clickIf(page, locator) {
  if (await locator.count()) { await locator.first().click({ timeout: 2000 }).catch(() => {}); return true; }
  return false;
}

async function play(browser, lang) {
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on("pageerror", (e) => errors.push(`[${lang}] pageerror: ${e}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push(`[${lang}] console: ${m.text()}`); });
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.getByRole("button", { name: lang === "en" ? "English" : "Pidgin", exact: true }).click();
  await page.getByRole("button", { name: /Be born|Born me/ }).click();
  // the first-time tutorial appears and can be walked through
  const tour = page.getByRole("dialog", { name: /How to play/ });
  await tour.waitFor({ timeout: 60000 });
  let shown = 0;
  for (let k = 0; k < 14; k++) {
    shown++;
    const next = tour.getByRole("button", { name: /Show me around|^Next$|Start my life/ });
    const label = await next.first().innerText();
    await next.first().click();
    if (/Start my life/.test(label)) break;
  }
  if (shown < 10) errors.push(`[${lang}] tutorial had only ${shown} steps`);
  await tour.waitFor({ state: "detached", timeout: 5000 });
  await page.getByRole("button", { name: /^Grow Up/ }).first().waitFor({ timeout: 60000 });
  const tabs = ["Work", "Money", "Family", "Explore", "Phone", "Health", "Law", "Map", "Power", "Legacy"];
  for (let year = 0; year < 30; year++) {
    // answer any event or sheet that is open
    for (let k = 0; k < 8; k++) {
      const choice = page.locator('[role="dialog"] button').filter({ hasNotText: /^✕$/ });
      if (!(await choice.count())) break;
      const enabled = page.locator('[role="dialog"] button:not([disabled])').filter({ hasNotText: /^✕$/ });
      if (!(await enabled.count())) break;
      await enabled.first().click({ timeout: 2000 }).catch(() => {});
      steps++;
    }
    if (year % 3 === 0) {
      for (const t of tabs) {
        const btn = page.locator("nav button, [role=tablist] button", { hasText: new RegExp(`^${t}$`) });
        if (await btn.count()) { await btn.first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(40); steps++; }
      }
    }
    const up = page.getByRole("button", { name: /^Grow Up/ });
    if (!(await up.count()) || (await up.first().isDisabled())) continue;
    await up.first().click({ timeout: 2000 }).catch(() => {});
    steps++;
    await page.waitForTimeout(30);
    if (await page.getByText(/Start a brand-new family|Start new family|Begin new family/).count()) break;
  }
  await page.close();
}

try {
  await waitUp();
  await fetch(URL); // warm the first compile
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  for (const lang of ["en", "pcm"]) await play(browser, lang);
  await browser.close();
} finally {
  stop();
}
console.log(`UI steps taken: ${steps}`);
if (errors.length) {
  console.error(`${errors.length} browser error(s):\n${errors.slice(0, 10).join("\n")}`);
  process.exit(1);
}
console.log("UI smoke test passed");
process.exit(0);
