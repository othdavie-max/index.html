# Build 2 test list: plans, payment and the pricing page

Two zips came out of Build 2. Test them in this order.

- **`aurum-site-build2-test.zip`**: the app with plans and payment built in, and the sales page and SEO pages exactly as they are today. Safe to upload at any time, because every plan switch is OFF: nobody sees anything new until you turn a switch on.
- **`aurum-site-build2-LAUNCH.zip`**: the same app, plus the new sales page, the Pricing page, the Free invoice generator page, the rewritten About, policies, sitemap, robots.txt and llms.txt. **Do not upload this one until launch day.**

## Part 1. Before any set-up (test zip only)

Upload the test zip. Nothing should look different to anyone.

1. Open https://auruminvoice.com.ng. The sales page still says "Pay once". Nothing else changed.
2. Open the app with a test key. Home, My house and a document all work as before, with no plan banner and no limits.
3. Make a document on the free plan. The count is the same as before (nothing new is enforced).

## Part 2. Set-up (owner jobs, in this order)

You and Claude do these together. None is done yet.

1. ~~Apply `billing.sql`, `admin.sql` and `signup-details.sql`~~ Done on 16 Nov 2026 (the tests inside them pass: billing 64 of 64, admin 27 of 27, sign-up details 8 of 8).
2. Deploy the three functions: `billing` (verify_jwt ON), `billing-webhook` (verify_jwt OFF), `billing-mail` (verify_jwt OFF). Check the verify_jwt setting after every deploy.
3. In Supabase, Edge Functions, Secrets: `PAYSTACK_TEST_SECRET_KEY` and later `PAYSTACK_LIVE_SECRET_KEY`.
4. In Paystack (test mode), set the webhook address to `https://ymmxhjfcfaawrebxoxbu.supabase.co/functions/v1/billing-webhook`.
5. Create your own account in the app first. Then Claude adds you to the owner list (`insert into admins select id from auth.users where lower(email) = lower('your email') on conflict do nothing;`).
6. Create the four Paystack test plans from the owner dashboard (card "Paystack plans", button "Create plans (test)").
7. Switch on test mode: `update app_config set value = 'test' where key = 'subs_mode';` In test mode only the accounts in the owner list can pay, so real users see nothing new.

## Part 3. Payment tests (test mode, Paystack test card)

Use Paystack's published test card: 4084 0840 8408 4081, any future expiry, CVV 408, PIN 0000, OTP 123456.

| # | Do this | You should see |
|---|---------|----------------|
| 0 | Open the app on a phone with no key and tap Continue with email | A form with Your name, Your email address, Your phone or WhatsApp number, and a password. Leaving one out, or a phone number with fewer than 8 digits, shows a message and sends nothing. After the code is entered, the owner dashboard (Find an account) finds the person by name or by part of the phone number |
| 1 | Sign in with your owner account, open My house, then Plans | Cards for Free, Starter and Pro, with Monthly / Yearly switch and correct prices |
| 2 | A normal (non-owner) account opens Plans | No pay buttons yet (test mode is for the owner only) |
| 3 | Pick Starter, Monthly, "Pay with card", pay with the test card | Paystack page, then back in the app: "We are confirming your payment. This can take a minute.", then "You are on Starter. Thank you." with an end date |
| 4 | Open My house, Payments | The payment listed with plan, amount and reference starting AUS- |
| 5 | Pick Pro, Yearly, "Pay by transfer or USSD", finish the test payment | "You are on Pro. Thank you.", end date one year ahead |
| 6 | Go from Starter to Pro | The sheet says "Your N unused Starter days become M extra Pro days" (half-days rule), and the thank-you screen says the extra days are included |
| 7 | Tap "Stop automatic renewal" | "Stop automatic renewal?" asks you to confirm; the plan stays until the end date and there is no new charge |
| 8 | In the Paystack test dashboard refund one payment | After a minute the payment shows "Refunded" and the account drops to the lower plan |
| 9 | Close the browser tab during the Paystack page, then reopen the app | The app finds the payment on its own and activates the plan |
| 10 | Pay the same reference twice (reload the return page) | Time is added once only |

## Part 4. Limits (turn on rules for your test account)

The rules apply to accounts made with the new sign-in. Use a fresh free account.

| # | Do this | You should see |
|---|---------|----------------|
| 1 | Send 5 documents in a month | A sheet: "You have used your 5 free documents this month". The new document is saved as a draft, the reset date is shown, and so is a plan button |
| 2 | Pick a design or an opening that is not included in Free | A lock sheet that offers Starter or Pro |
| 3 | Open a client link made on Free | A small "Made with Aurum Invoice Studio" line is shown |
| 4 | Make a document with no connection, then reconnect | It is counted once the phone is online again |
| 5 | Open the Home screen of a free account in test mode, then in live mode | The "Refer a friend" card is shown now and disappears when the mode is live (referrals are paused at launch) |
| 6 | Ask for the Business plan (Plans, Request Business) | "Thank you. We will message you on WhatsApp when Business is ready."; the request appears on your dashboard |

## Part 5. Owner dashboard (https://auruminvoice.com.ng/admin.html)

1. Sign in with your own email and password. A normal account is refused.
2. Cards show: plans and money, needs attention, business requests.
3. "Find an account": search an email, then add 7 days, sign a device out, let a business change its name.
4. "Paystack plans": creates only the plans that are missing.
5. Searching by a name, a phone number or an email finds the account and shows the name and phone.
6. Reviews card still works (approve or hide a review).

## Part 6. Emails (needs the mail service, set-up job 1)

1. The mail service is connected and `hello@auruminvoice.com.ng` can send.
2. Run `billing-cron.sql` after setting the two `app_config` values it explains.
3. Check: the "plan ending in 3 days" email, the "could not renew" email (once a day), and "plan ended".

## Part 7. Launch pages (LAUNCH zip, on a Netlify draft deploy, not on the live address)

1. Home: "Start free" and "See plans" buttons; Free, Starter and Pro cards; no Black Friday bar, no checkout window.
2. /pricing/: the plan table, monthly and yearly prices, the document count rules, "Request Business" opens WhatsApp.
3. /free-invoice-generator/: how to make a first invoice, the free plan includes, FAQ.
4. /about/: "How plans and payment work" and the "Aurum in brief" table.
5. /policies.html: read the refunds, terms and privacy text. The refund rule is applied as you agreed (full refund within 7 days of the first payment, none for renewals) and appears on Pricing, About and in the app's pay sheet. **A lawyer should read the policies.**
6. Page source of the home page contains one `SoftwareApplication` with offers and one `FAQPage`; /pricing/ and /free-invoice-generator/ contain `FAQPage`.
7. /sitemap.xml lists /pricing/ and /free-invoice-generator/; /robots.txt names the AI crawlers; /llms.txt opens with the key facts.
8. Check on a phone: nothing runs off the screen sideways; the plan table scrolls.

## Launch day only (after all of the above passes)

1. Create the four live Paystack plans (dashboard, "Create plans (live)") and add the live secret key.
2. Point the live Paystack webhook to `billing-webhook`.
3. `update app_config set value = 'live' where key = 'subs_mode';`
4. `update app_config set value = 'on' where key = 'plans_enforced';`
5. `update app_config set value = 'on' where key = 'accounts_required';`
6. Upload `aurum-site-build2-LAUNCH.zip`.
7. Run the tests in Parts 3 and 7 once more with a small real payment, and refund it.
