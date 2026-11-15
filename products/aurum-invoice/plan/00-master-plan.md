# 00. Master plan

Written by Fable on 15 Nov 2026. This is the plan only. Nothing here has been built or tested.
Read `WORKFLOW.md` and `HANDOVER.md` first. This file says what gets built, in what order, by which model, from which file, and how you will know each step is finished.

## 1. Where we are going
Aurum changes from an app sold once with a licence key into an app people sign in to, with a free plan and monthly or yearly plans.

When the whole plan is finished:
- Anyone can create an account (email and password, or Google) and make 5 documents a month free.
- Starter and Pro are paid monthly or yearly in naira. Business shows "coming soon" with a Request button.
- People who already bought keep everything they paid for.
- The app has five invoice designs and six openings, a proper saved-items catalogue, and reminders that help owners get paid.
- Later: a public storefront where a customer orders, gets an invoice automatically and pays.
- The site is easy for Google and AI assistants to find and describe correctly.
- It still works without data, and it still runs on free services.

## 2. Where we are today
| Area | Today | Change needed |
|---|---|---|
| Selling | One-time purchase (Signature, Prestige) with a sale calendar until 10 Jan 2027. Paystack checkout, licence key shown after payment. | Replace with Free, Starter, Pro. No one-time purchase for new buyers. |
| Signing in | A licence key locked to 2 or 3 devices and one business name. | Accounts. The key stays valid for existing buyers. |
| Free use | An email link gives 3 documents a month. | A free account gives 5 documents a month. |
| Documents | Invoice, receipt, quotation, delivery note, credit note, purchase order. Customise panel (titles including "Proforma Invoice", watermark, amount in words, terms). | No change. |
| Designs | Three: Royal, Atelier, Noir, in any colour. | Two more, to make five. |
| Openings | Wax-seal envelope (default), gift box, invitation card, plus "Straight to invoice". 3D video versions exist but are switched off. | Three more animated openings, to make six. A more detailed envelope. See decision 3. |
| Saved items | Items and clients are remembered and suggested as you type. | A real catalogue: a list you manage, with prices, photos and categories. |
| Tracking | Opened, client says paid, paid through Paystack, quote accepted. | Keep. |
| Reminders | One-tap WhatsApp reminder messages. A morning overdue alert on Prestige. | Scheduled reminders. See section 6 for what is possible on free services. |
| Storefront | None. | Later: public catalogue page, automatic invoice, payment. |
| Backend | Supabase (database, three Edge Functions), Netlify hosting by zip, Paystack. | Add Supabase sign-in, subscriptions, plan limits. |
| SEO | 33 pages live. Plan written in files 01 to 06. | Build in three phases (A, B, C). |
| Source code | The app is one built file, `index.html`. Its build scripts lived in an earlier chat's temporary folder and are probably gone. | Treat the built files as the source. Edit them directly. The SEO pages still have their generator in `seo/`. |

## 3. The order of work
One zip at the end of each build step. You test it before the next step starts. Each step names the file the builder works from; if the file does not exist yet, the builder stops and asks.

| # | Step | Model, effort | Works from | You receive |
|---|---|---|---|---|
| 0 | Clean-up (section 4) | Haiku, low | This file, section 4 | A short "done / not done" list |
| 1 | SEO plan | Fable | Done | Files 01 to 06 |
| 2 | Master plan | Fable | Done | This file |
| 3 | Accounts and billing design | Fable, high or xhigh | Section 5 | `07-accounts-and-billing.md` |
| 4 | Designs and openings spec | Fable, high | Section 7 | `08-designs-and-openings.md` |
| 5 | Saved items spec | Fable, high | Section 8 | `09-saved-items.md` |
| 6 | Brief for reminders and storefront | Fable, high | Sections 6 and 9 | `10-reminders-and-storefront.md` |
| 7 | **Build 1: accounts** | Sonnet, high | File 07 | Zip 1 |
| 8 | **Build 2: plans, payment, pricing page, SEO Phase A** | Sonnet, high | Files 07, 02, 03, 04, 05 | Zip 2, with payments in test mode |
| 9 | **Billing review** (decision 1) | Opus, high | File 07 and the Build 2 code | A list of problems, fixed or explained |
| 10 | **Launch of subscriptions** (section 10) | Sonnet, medium | Section 10 | The live site on the new plans |
| 11 | **Build 3: five designs, six openings** | Sonnet, medium or high | File 08 | Zip 3 |
| 12 | **Build 4: saved items catalogue** | Sonnet, medium | File 09 | Zip 4 |
| 13 | **SEO Phase B**, then Phase C week by week | Sonnet, medium | Files 02 to 05 | Zip 5, then small zips |
| 14 | **Build 5: reminders** | Opus, high | File 10 | Zip 6 |
| 15 | **Build 6: storefront and its payments** | Opus, high | File 10 | Zip 7 |
| 16 | Final test and launch check | Sonnet medium, then Haiku low | Section 11 | A test report and the final zip |

Steps 11, 12 and 13 do not depend on each other. If one is blocked, do another.

### Fable's deadline
Fable stops being available on 16 Nov 2026 at 7 pm. Steps 3 to 6 are Fable's. In order of importance:
1. **File 07, accounts and billing.** Everything else waits on it. It must be finished.
2. **File 08, designs and openings.**
3. **File 09, saved items.**
4. **File 10, the brief for reminders and storefront.**

If time or your usage limit runs out, the files not written move to **Opus at high effort**, which then also answers the "stop and ask for Fable" questions in `WORKFLOW.md`.

## 4. Step 0: clean-up (Haiku, low)
Small, safe jobs. Haiku reports each as done, not done, or needs you.
1. In the `paystack` and `free-signup` functions, replace the old netlify.app address with `https://auruminvoice.com.ng`, or set the Supabase secret `SITE_URL`. After each deploy, switch JWT verification off again for those functions.
2. Check that nothing else in the built files points to `auruminvoicestudio.netlify.app`.
3. Check whether the app's build scripts (`build.py`, `package.sh`, `build_landing.py`) still exist anywhere. If they do, save them in the repository. If not, write one line in `HANDOVER.md`: "The built files are the source."
4. List what is unused in the folder (for example the 3D opening videos, if they are not loaded) so that you can decide what to remove. Remove nothing without your yes.

Needs you (Haiku cannot do these):
- Click **Verify** in Search Console and submit `sitemap.xml`.
- Set `auruminvoice.com.ng` as the **Primary domain** in Netlify.
- **Change the Gmail app password** that was pasted in a chat, and put the new one in the Supabase secret.

## 5. Accounts and billing: what file 07 must decide
I have not decided these here. File 07 does. This list is so that nothing is forgotten.

**Principles (decided):**
- Nothing an existing buyer has today is taken away.
- Plan limits are checked on the server. The app can be copied; the server cannot.
- The free plan shows the full client experience, including the sealed opening. Every free invoice a client opens is an advert for Aurum.
- Upgrade messages are calm and honest. No tricks, no hidden renewals.
- The app keeps working without data for someone who is already signed in.

**Questions for file 07:**
1. What each plan includes: documents a month, designs, openings, devices, businesses, tracking, alerts, reports, team, Aurum branding on the client page, own web address.
2. What counts as a "document" for the limit, and what happens at the limit (the wording, and whether drafts are kept).
3. How a document made without data is counted.
4. Sign-up and sign-in screens, password reset, and the email that confirms an address.
5. Existing buyers: how a licence key is joined to an account, what "Signature" and "Prestige" owners see in the new plan screen, and what happens to features added later.
6. Today's free-link users: how they move to an account without losing their documents.
7. Paying: card with automatic renewal, and bank transfer. A transfer cannot renew by itself, so file 07 must define "pay for a month or a year, and we remind you before it ends".
8. What happens when a payment fails or a plan ends: the grace period, what stays readable, and what is locked.
9. Changing plan, cancelling, refunds, and the receipt the subscriber gets.
10. The Business "Request" button: what it collects and where it goes.
11. The database design, the security rules, and how the old licence tables and the new account tables live together.
12. The owner dashboard: it is protected today by a single password. With accounts it should require the owner's own sign-in.
13. Devices: whether the device lock continues, and how account sharing is discouraged.
14. Every `[BILLING]` mark in files 02, 03 and 04.

**Known difficulties file 07 must handle (honest list):**
- **Sign-up emails.** Supabase's built-in email is limited to a few messages an hour. A free outside mail service must be connected, and the domain needs two DNS records so the emails do not land in spam.
- **Google sign-in inside Instagram and Facebook.** Google refuses to sign people in from those in-app browsers. Many of your visitors arrive that way. The sign-in screen must detect this and say "Open in Chrome" or "Open in Safari", with email sign-in still offered.
- **Google sign-in approval.** Google asks for a privacy page and a verified domain. `policies.html` exists; Search Console verification (your open item) covers the domain.
- **Card renewals fail often in Nigeria.** The plan must not lock someone out on the first failed charge.
- **A free Supabase project pauses after about a week with no activity.** With daily users it stays awake. File 07 should name a simple daily keep-awake.

## 6. Reminders: what is possible on free services
You asked for tracking and reminders. Being honest about the limits:
- **Sending WhatsApp messages automatically is not possible for free.** It needs the paid WhatsApp Business API, with fees per message. It cannot be built under the "free services" rule.
- **What can be built free:**
  1. A schedule per invoice ("remind 3 days before, on the day, 3 days after").
  2. At each scheduled time, an alert on the owner's phone with the message already written. One tap opens WhatsApp with it, ready to send.
  3. An automatic **email** to the client at the same moments, when the client's email is on the invoice. Free mail services allow a few thousand emails a month.
  4. The client's own page shows the due date and a gentle "due today" or "overdue" notice when they open the link.
- If you later accept a small cost per message, automatic WhatsApp can be added without rebuilding. File 10 should leave room for it.

## 7. Designs and openings: what file 08 must contain
- Names, the look, and exact colours and type for **two new designs** alongside Royal, Atelier and Noir.
- **Three new openings**, each described frame by frame, alongside the wax-seal envelope, the gift box and the invitation card. Also the more detailed envelope you asked for.
- Every opening must be made with CSS only (no video) and must stay smooth on a low-cost phone such as the Infinix Note 30. **The phone-safety system (`data-fx`) must not be changed.** (Corrected in file 08, part 0: those levels protect the app's own screens and deliberately leave the client's page alone, so openings are kept safe by the budget in file 08 instead.)
- "Straight to invoice" stays as the choice with no animation.
- Which designs and openings belong to which plan comes from file 07.
- Any brand changes to the sales page. The headline stays: "Your business is premium. Your invoice should be too."

## 8. Saved items: what file 09 must contain
- The catalogue screen: add, edit, archive, search; name, price, unit, photo, category, short description.
- How today's remembered items become catalogue items without the user doing anything.
- How an item is picked while making a document, and what happens to old documents when a price changes (they must not change).
- Backup and merging across devices, using the existing workspace backup.
- Limits per plan, from file 07.
- The fields the storefront will need later (visible in store, stock note), so the catalogue does not have to be redone.

## 9. Storefront: what file 10 must settle
The storefront is the last and hardest part. It is not designed here. File 10 must settle:
- The public address of a business's store, and what a visitor sees.
- Order → automatic invoice → payment → automatic receipt, and how the owner is told.
- **How a payment is confirmed.** Today a business pastes its own Paystack public key, and the page trusts the browser's word that payment succeeded. That is acceptable for an invoice the owner checks by hand. It is not safe for automatic orders. The likely safe route is Paystack subaccounts: the customer pays through Aurum's Paystack account, the money settles straight into the business's bank account, and Aurum's server can confirm the payment. File 10 decides, and says what it means for "Aurum never touches the money".
- Abuse: fake orders, spam, a store used to sell prohibited things.
- Which plan includes the storefront.

## 10. Launch of subscriptions: one release, one day
These go live together, because each one is wrong without the others:
1. Accounts and plans switched from test to live, after the billing review.
2. The old checkout and the sale calendar removed. Old licence keys still work.
3. SEO Phase A: new wording on all 33 pages, the Pricing page, the Free invoice generator page, new structured data, new robots.txt and llms.txt.
4. The About, FAQ and policies pages say how plans, cancelling and refunds work.
5. You edit your outside listings and profiles the same day (file 06, step 9).

Before the day: three of your existing buyers confirm their key still opens everything they paid for.
After the day: watch the owner dashboard daily for a week for failed payments and sign-up problems.

## 11. How each step is judged finished
A step is finished when you have tested the zip on your own phone and said yes. The builder gives you a short test list with each zip. At a minimum:

| Zip | You check |
|---|---|
| 1 Accounts | Sign up with email. Sign up with Google. Sign out and in. Reset a password. Open the app with no data. An old licence key still works and joins an account. Your documents are still there. |
| 2 Plans | The 6th document in a month is stopped on Free, politely. Pay for Starter with a test card. Pay by transfer. The plan shows as active. Cancel. The Pricing page shows the right prices. |
| 3 Designs and openings | All five designs and six openings on your phone and on a low-cost Android phone. No stutter. A client link opens correctly in WhatsApp. |
| 4 Saved items | Add, edit and archive an item. Use it on an invoice. Change its price: the old invoice does not change. It appears on a second device. |
| 5 SEO Phase B | Each new page opens, reads well on a phone, and its facts match the plan. The tools give right answers for three amounts you choose. |
| 6 Reminders | A scheduled reminder arrives on your phone at the right time. The email reaches a test client. Marking an invoice paid stops its reminders. |
| 7 Storefront | A stranger can order, gets an invoice, pays in test mode, and gets a receipt. You are told. A fake "I paid" is not accepted. |

The final check (step 16) repeats all of these on the live site, and checks that no private page appears in Google.

## 12. Free services: the limits to know
| Service | Free limit that matters | What happens at the limit |
|---|---|---|
| Supabase | 500 MB database; pauses after about a week unused; a monthly cap on signed-in users far above what Aurum needs now | Old client links and activity can be trimmed. If the database fills, the paid tier is the first real cost. |
| Netlify | Monthly bandwidth and build limits | Unlikely to be reached by pages this light. |
| Outside mail service | A daily and monthly cap on emails | Sign-up emails come first; reminder emails wait. |
| Paystack | No monthly fee. A fee per payment, taken from each subscription payment | File 07 should say what you receive from ₦3,000 after fees. |
| Google sign-in | Free | None. |

The first thing likely to cost money is the database, and only after there are many active businesses. That is a good problem, and the subscriptions pay for it.

## 13. Risks, stated plainly
1. **One very large file.** The app is a single file of about 385 KB with no build scripts. Every build step edits it directly. Mistakes are easier to make and harder to see. Each build step must change as little as possible, and you must test every zip.
2. **Money code.** Mistakes in billing cost real money or lock out paying customers. This is why the billing review exists.
3. **Existing buyers.** A mistake here breaks a promise. Their access is tested before launch (section 10).
4. **Promises on the live site.** The sale calendar promises one-time prices until 10 Jan 2027. See decision 2.
5. **Your usage limit.** Each chat should do one job from one file and then stop. Long chats cost more than short ones.
6. **Search and AI results are not guaranteed** (see the SEO plan's README).

## 14. Decisions I need from you
1. **Review billing before real money, not at the very end.** `WORKFLOW.md` puts Opus last. I recommend one short Opus session straight after Build 2, before subscriptions go live, and I have written the order that way (step 9). Yes or no? If no, subscriptions stay in test mode until the end.
2. **When do subscriptions launch?** As soon as steps 7 to 9 are done, which ends the sale early, or after the sale calendar ends on 10 Jan 2027? I recommend launching when ready, with a clear notice on the sales page a week before.
3. **"Six openings."** I have read this as three new animated openings added to the three you have, with "Straight to invoice" kept as a seventh, plain choice. Is that right?
4. The three decisions in the SEO plan's README (a named founder, an accountant's check, a public email address) are still open.

## 15. Corrections to the SEO plan
Reading the app's full feature list for this file showed two things the SEO plan had listed as suggestions already exist: a document can be titled "Proforma Invoice", and amount in words is already on receipts. The SEO plan's README is corrected, and a Proforma invoice maker page is added to files 01 and 02.
