# Handover from the long chat (15 Nov 2026)

Read WORKFLOW.md first, then this file.

## Where things stand
- Product: Aurum Invoice Studio, a luxury invoice/receipt/quotation PWA for Nigerian businesses. Live at https://auruminvoice.com.ng (Netlify, drag-and-drop zip). Old address auruminvoicestudio.netlify.app still works.
- Source: single-file app built from parts kept in the session scratchpad (build.py, package.sh, build_landing.py); the built outputs are in `products/aurum-invoice/` (`index.html` app, `landing.html` sales page, SEO pages in `seo/`). If the scratchpad is gone, edit the built files directly. **Checked 16 Nov 2026: the app's build scripts (`build.py`, `package.sh`, `build_landing.py`) are not in the repository, not in its history and not on the owner's computer. The built files are the source.** Only the SEO pages still have a generator (`seo/build_seo.py`).
- Backend: Supabase project ymmxhjfcfaawrebxoxbu (Edge Functions `paystack`, `notify`, `free-signup`; set verify_jwt false after each deploy). Reached through Composio.
- Free plan today: email link for 3 documents/month (replaced by accounts and 5/month once the switches are on, see Build 1 and Build 2).
- Opening animation: the classic CSS envelope is the default. The Blender 3D videos exist but are switched off (user prefers the CSS one, wants a more detailed version later).
- Phone-safety: html `data-fx` levels; Mali GPUs (Infinix Note 30) default to level 8. Do not undo this.

## Open items
- Search Console: property https://auruminvoice.com.ng/ is added (unverified). Verification file google37356b1ccf2db02e.html is live on the new domain; the owner must click Verify, then the sitemap (33 URLs) can be submitted.
- Netlify: auruminvoice.com.ng should be set as the Primary domain.
- Backend address (checked 16 Nov 2026): the Supabase secret `SITE_URL` is now set to https://auruminvoice.com.ng, so `free-signup` uses the new address. The deployed `paystack` function (version 9) still has the old netlify address written into its code as the return address after payment; it is not changed because it is the live payment function. Buyers who pay still return to the old address, which still works. The old one-time checkout is retired at launch (master plan, section 10), so this can be left.
- Gmail app password was pasted in chat earlier; the owner should rotate it.
- Existing buyers (one-time purchases) must keep access when subscriptions arrive.

## What the owner wants (summary)
Subscriptions (Free/Starter/Pro, Business coming soon), email + Google registration, five luxury invoice designs, six openings, tracking and reminders, saved items, later a public storefront, and very strong SEO (Google, plus being recommended by AI assistants). Backlinks are a to-do list for the owner (profiles, directories, answers, partnerships); never buy or fake links.

## SEO and AI-visibility plan (done, 15 Nov 2026)
The plan is in `products/aurum-invoice/plan/` (start with its README). It is a plan only; nothing in it is built. The master plan is `plan/00-master-plan.md` (done, 15 Nov 2026); follow its order of work. The accounts and billing design is `plan/07-accounts-and-billing.md` (done, 15 Nov 2026); it has six decisions waiting for the owner in its part N and set-up jobs in its part L. The designs and openings spec is `plan/08-designs-and-openings.md` (done, 15 Nov 2026); four decisions wait for the owner in its part F. The saved items spec is `plan/09-saved-items.md` (done, 15 Nov 2026); three decisions wait for the owner in its part 12. The reminders and storefront brief is `plan/10-reminders-and-storefront.md` (done, 16 Nov 2026); seven decisions wait for the owner in its part C, and the owner must ask Paystack three questions before Zip 7b. **All Fable files are now written (00 to 10).** Step 0, Build 1 and Build 2 are done (see below). Next: the owner's switch-on steps and tests, then Build 3 (designs and openings, file 08). Items marked `[BILLING]` in the plan wait for the billing file; items marked `[VERIFY]` wait for an accountant's check. The builder must not switch the live "Pay once" wording until subscriptions launch.

## Build 1: accounts (built 16 Nov 2026)
Built from `plan/07-accounts-and-billing.md` parts A to D. **Nothing about plans, payment or the pricing page is built; that is Build 2.**

What changed
- `index.html` (the app): new sign-in screens in the gate (Google, email + 6-digit code, password sign-in, forgot password, licence key, choose-a-device), account card in My house (devices, sign out, delete my account), "Protect your purchase" card on Home for Signature and Prestige buyers, business-name change when the account's name differs, free limit shown as 5 a month. Code is in the "ACCOUNTS" block just after the licence code.
- `accounts.sql`: the server side. **Applied to the live database on 16 Nov 2026** (through the Supabase plugin, as migration `accounts_build1`; the owner asked for this). Tested before and after: 47 checks, all pass, inside a transaction that rolls back. Right after applying: 5 plan rows, 15 functions, switch `accounts_required` = off, all 203 licences untouched and none joined, no auth users.
- `tests/accounts-test.sql`: the test. Run it together with `accounts.sql` in ONE query; it ends with a deliberate error that undoes everything, and prints its results inside the error message.
- `tests/serve.js` and `tests/mock.js`: a local test server and a stand-in for Supabase (add `?mock=1`).
- `package.sh`: builds the folder/zip for Netlify (`bash package.sh <folder>`). The layout was checked against the live site: all 160 files sit at addresses that already exist.
- `sw.js`: cache name changed to `aurum-v4` so installed copies update.

Order to switch on (the app works with the old database too, but the account screens need the new functions)
1. ~~Run `accounts.sql`~~ done on 16 Nov 2026 (see above).
2. Owner deploys the zip.
3. Launch day only: `update app_config set value = 'on' where key = 'accounts_required';` (until then, old free keys can still send without an account).

Set-up jobs from file 07 part L, as checked on 16 Nov
- Job 4 (Supabase settings): done through Composio: site address `https://auruminvoice.com.ng/app/`, redirect list the same, code length 6, password minimum 8.
- **Email templates could not be set:** Supabase only allows custom email templates once a custom mail service (job 1) is connected. Until then sign-up emails use Supabase's default wording, which has a LINK and no code, and Supabase's own sender is limited to a few emails an hour. The app also accepts that link (it signs the person in when they tap it), so sign-up still works, but the "6-digit code" screen will not match the email. **Job 1 is needed before real testing.**
- Job 3 (Google sign-in) is not done: Google is switched off in Supabase, so the Google buttons stay hidden (the app checks this itself; no code change needed when it is switched on).
- `GOOGLE_IN_IOS_APP` in `CONFIG` is false: Google sign-in inside the installed iPhone app is hidden until tested on a real iPhone.
- Not done (owner): jobs 1, 2, 3; changing the Gmail app password.

Known limits and notes
- The code screen is one number field (styled with wide spacing), not six separate boxes.
- Account functions: `account_enter`, `link_licence`, `account_swap_device`, `account_devices`, `account_remove_device`, `account_release_device`, `rename_business`, `request_delete`, `my_plan`. Plan limits are in the `plan_rules` table; `_ent(key)` is what the app reads.
- The app's own variable named `history` hides the browser's `history`: use `window.history` for the address bar.
- Files use Windows line endings (CRLF) in the working copy.

## Build 2: plans, payment, pricing page (built 16 Nov 2026)
Built from `plan/07-accounts-and-billing.md` parts E to K, plus the SEO plan's Phase A (the launch pages). **The database part of Build 2 was applied to the live database on 16 Nov 2026 at the owner's request (migrations `billing_build2`, `admin_build2`, `signup_details_build2`). Nothing is deployed yet: the three functions and both zips still wait for the owner. Every plan switch is OFF, so the live site behaves as it does today until the owner turns switches on.**

The owner told us on 16 Nov 2026 that **nobody has bought Aurum before subscriptions began.** The database agrees: 202 keys (101 Signature, 101 Prestige) were all made on 9 Nov 2026 as unsold stock, none has a business name, one was opened on a device, two carry a buyer email (the owner confirmed these were their own test payments). So the launch pages have no "I bought before" text. The app and database still honour such keys (nothing was removed). At launch the owner should decide whether to switch off the unsold stock keys.

What was built
- `index.html` (the app): the Build 2 block: plan cards, Monthly/Yearly, pay sheet (card renews by itself; transfer or USSD pays one period), return-from-Paystack flow (pending, then confirmed), upgrade with the half-days rule, stop renewal, Payments list, Request Business form, limit and lock sheets, plan banners, offline document counting (`aurum.pendingDocs`). `CONFIG.REFUND_LINE=false` hides the refund sentence until the owner says yes. Tested in a browser against a stand-in server (`tests/mock.js`).
- `billing.sql` (**applied 16 Nov 2026**, 8 tables and 18 functions checked afterwards, all 203 licences untouched): tables `admins, prices, sub_orders, payments, subscriptions, business_requests, billing_log, mail_queue` and the functions that price, record and refund payments, extend `_ent`, enforce the plan rules in `publish_invoice` and `view_invoice`, and run `nightly()`. Test: `tests/billing-test.sql`, 64 of 64 pass (run with `billing.sql` in one query; it ends with a deliberate error that undoes everything).
- `admin.sql` (**applied 16 Nov 2026**; the owner list `admins` is still empty, so nobody can use the dashboard until the owner is added): owner-only functions behind `_is_admin()`. Test: `tests/admin-test.sql`, 27 of 27 pass. The commented lines at the bottom add you to `admins` and later drop the old passcode functions.
- `billing-cron.sql` (**not applied**, waits for the mail service): sends the mail queue and schedules `aurum-nightly` (7 am UTC, 8 am Lagos). Needs `billing_mail_url` and `billing_mail_secret` in `app_config` first.
- `functions/billing` (verify_jwt ON; actions init, verify, stop_renewal, manage_link, setup_plans), `functions/billing-webhook` (verify_jwt **OFF**), `functions/billing-mail` (verify_jwt **OFF**, shared secret header). **Not deployed.** Local test: `node tests/functions-test.mjs`, 47 of 47 pass. Secrets: `PAYSTACK_TEST_SECRET_KEY`, `PAYSTACK_LIVE_SECRET_KEY`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `BILLING_MAIL_SECRET`.
- `admin.html`: rewritten. Sign in with your own account (not a passcode). Cards: plans and money, needs attention, business requests, find an account (add time, sign a device out, unlock a business name), Paystack plan set-up, reviews. Tested in a browser.
- `launch/launch.js`: builds the LAUNCH version of the site from a built site folder: `node launch/launch.js <built site> <output folder with "launch" in its name>`. It rewrites the sales page (Free, Starter, Pro cards; 10-question FAQ; schema.org offers and FAQ; no Black Friday bar, no checkout), the SEO pages' old "pay once" and "free demo" wording, the About page (+ "Aurum in brief" table), adds `/pricing/` and `/free-invoice-generator/`, rewrites the policies, and updates sitemap, robots.txt (AI crawlers named), llms.txt and `_headers` (noindex for `/admin.html` and `/app/*`). It prints any sentence that still has old wording (the only ones left are two neutral lines in a guide). The launch site was checked: 47 pages, 1,398 internal links, none broken, all structured data parses, every sitemap address exists.
- `signup-details.sql` (**applied 16 Nov 2026**): the create-account form now asks for name, email, phone number and password. The name and phone are sent as sign-up details and `account_enter` saves them on the workspace (`licences.buyer_name`, `buyer_phone`) the first time, filling only what is empty. A Google sign-in saves the name only. The owner dashboard search now finds people by name or phone number and shows both. Checked with a rolled-back test (8 of 8). The app form was tested in a browser: validation messages, and the sign-up request carries the name and phone.
- `tests/BUILD2-TEST-LIST.md`: the owner's test list. `tests/serve.js`, `tests/mock.js`: local test server and stand-in for Supabase (`?mock=1`).

Two zips (delivered to `Documents\list of buyer\aurum builds\`)
- `aurum-site-build2-test.zip`: `bash package.sh` output. App with plans built in, all switches off, old sales page. Safe to upload any time.
- `aurum-site-build2-LAUNCH.zip`: `package.sh` then `launch.js`. **Upload on launch day only.**

Order to switch on (details and test steps in `tests/BUILD2-TEST-LIST.md`)
1. Upload the test zip.
2. (Database already done.) Deploy the three functions (check verify_jwt after every deploy). Add the Paystack test secret. Point Paystack's test webhook to `billing-webhook`. Add yourself to `admins`. Create the test plans from the dashboard. `update app_config set value = 'test' where key = 'subs_mode';` (only `admins` can pay in test mode).
3. Run the tests in the list (payments, limits, dashboard). Mail service (set-up job 1) and `billing-cron.sql` before the email tests.
4. Launch day: live plans, live secret, live webhook, `subs_mode` = live, `plans_enforced` = on, `accounts_required` = on, then upload the LAUNCH zip.

Decisions (file 07 part N): on 16 Nov 2026 the owner said to apply all of them as recommended and that they will go through them afterwards. Applied: (1) Starter 50 documents a month; (2) refund rule, full refund within 7 days of the first payment and none for renewals (`CONFIG.REFUND_LINE = true`, the refund line is on Pricing, About, FAQ, llms.txt and the policies); (3) the free plan carries "Made with Aurum Invoice Studio" on the client page; (4) free links close after 60 days (12 months on Starter); (5) referrals paused at launch (the Refer a friend card hides when `subs_mode` is live). (6) VAT on subscriptions is still [VERIFY] with an accountant: prices are treated as final prices. **A lawyer should read the policies.** Their "last updated" date is 16 Nov 2026.

Needs the owner (not done)
- The owner's last message ended mid-sentence ("But the renewal, the"). Ask what they meant about renewal before the next build.
- Set-up jobs: mail service and a `hello@` address (job 1), Google sign-in (job 3), Brevo key, Paystack webhooks, changing the Gmail app password, Search Console verification, Netlify primary domain.
- The old one-time checkout (`paystack` function) can stay until launch, then retire. Decide what to do with the unsold stock keys.

Not built yet (later builds): new Silk and Heritage designs and three new openings (Build 3; the Pro plan says "all, new ones included" ahead of them), saved items and the 500-item limit (Build 4), reminders (Build 5), storefront (Build 6, Opus), SEO phases B and C.

Known limits and notes
- The pricing page table leaves out the saved-items row on purpose until Build 4.
- "Request Business" on the website is a WhatsApp link; in the app it is a form.
- Rules apply to accounts made with the new sign-in; old free keys keep old behaviour until `accounts_required` is on.
- The launch zip's `/app/policies.html` is the same text as `/policies.html`.
- The "Refer a friend" card hides itself when `subs_mode` is live (referrals are paused at launch).

- Mail (16 Nov 2026): sign-up and reset emails and the plan emails send through Gmail SMTP (sender othdavie@gmail.com, a Google app password; Brevo not used). Supabase auth SMTP is set with 6-digit-code templates. `billing-mail` uses nodemailer with secrets GMAIL_USER, GMAIL_APP_PASSWORD, BILLING_MAIL_SECRET. The nightly job `aurum-nightly` is scheduled. Paystack TEST secret and the four test plan codes are saved. The app password was pasted in chat: delete it in Google and make a new one, then update the two secrets and the Supabase SMTP password.

- Went live 16 Nov 2026 (database side): live Paystack plans created (codes saved in prices.plan_code_live), subs_mode=live, plans_enforced=on, accounts_required=on. To undo: set subs_mode=off, plans_enforced=off, accounts_required=off in app_config. The launch zip (sales page, pricing, policies) is uploaded by the owner. Sign-in screens restyled as a centred card; plans and checkout are full-screen pages.
