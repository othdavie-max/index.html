# 07. Accounts and billing design

Written by Fable on 15 Nov 2026. This is a design only. Nothing here has been built or tested.
It answers every question in section 5 of `00-master-plan.md`. Build 1 (accounts) uses parts A to D. Build 2 (plans and payment) uses parts E to K.

**Builder rules.** Use the names, numbers and wording here exactly. Where this file says "check" and the check fails, stop and ask. Paystack and Supabase details were written from memory of their documentation; confirm each call against their current documentation before coding it, and stop and ask if something differs.

---

## A. The main idea (read this first)

Today everything on the server belongs to a **licence key**: documents, client links, the backup, devices. Every server function takes `p_key` and `p_device`.

**We keep that.** The key stops being something the customer types and becomes a hidden workspace number.

- An **account** (a Supabase sign-in) owns exactly one row in `licences`. That row is the account's workspace.
- When a new person signs up, the server quietly creates a `licences` row with plan `free` and ties it to the account. The key is never shown.
- When a person signs in on a phone, the server hands the app the key for that account and registers the phone. From then on the app calls the existing functions (`publish_invoice`, `save_workspace`, `invoice_activity` and the rest) exactly as it does today.
- An existing buyer joins their key to an account once. Nothing about their key, documents or links changes.

Why: the app is one large file with no build scripts. This design adds sign-in and plans around the existing code and leaves the document, link and backup code almost untouched.

The app has no Supabase library and calls the server with plain `fetch`. Keep it that way. Sign-in uses plain `fetch` to Supabase's `/auth/v1/` addresses (part C). No new library.

---

## B. Plans (question 1)

### B1. What each plan includes
Prices are decided in `WORKFLOW.md`. The rest is decided here. The numbers live in a database table (part H), so you can change a limit later without a new build.

| | Free | Starter | Pro |
|---|---|---|---|
| Price | ₦0 | ₦3,000 a month, ₦30,000 a year | ₦6,000 a month, ₦60,000 a year |
| Documents sent a month | 5 | 50 | Unlimited |
| All six document types | Yes | Yes | Yes |
| Logo, colours, signature, bank details | Yes | Yes | Yes |
| Sealed private link, PDF, image, QR | Yes | Yes | Yes |
| See when the client opens it | Yes | Yes | Yes |
| One-tap WhatsApp reminders, money overview, CSV export | Yes | Yes | Yes |
| Cloud backup | Yes | Yes | Yes |
| Designs | Royal | Royal, Atelier, Noir | All five |
| Openings | Wax-seal envelope | Envelope, gift box, invitation card | All six |
| "Straight to invoice" (no animation) | Yes | Yes | Yes |
| Aurum's name on the client page | A line: "Made with Aurum Invoice Studio. Make yours free." (links to the sales page) | The small Aurum mark, as on Signature today | None |
| Devices | 1 | 2 | 5 |
| Businesses | 1 | 1 | 2 |
| Saved items in the catalogue (file 09) | 10 | 100 | Unlimited |
| Client links stay open for | 60 days | 12 months | As long as the plan is active |
| Phone alerts (opened, paid, accepted), morning overdue alert | No | No | Yes |
| Monthly report, Team tab, logo pressed into the seal | No | No | Yes |
| Scheduled reminders (file 10, when built) | No | No | Yes |

- "Unlimited" has a safety ceiling of 2,000 documents a month to stop abuse. It is stated in the terms and not advertised.
- **Own web address** is not in Starter or Pro. It needs manual set-up per customer. It moves to the Business plan. Prestige owners keep it.
- **Business:** no price and no features yet. A Request button only (part G6).

### B2. People who already bought (question 5, first half)
| They own | They keep, for good | New things they also get |
|---|---|---|
| **Signature** | Everything they have today: unlimited documents, 2 devices, 1 business, the three designs and three openings, links that never expire | The Starter column for anything new (catalogue: 100 items) |
| **Prestige** | Everything they have today: unlimited documents, 5 devices, 2 businesses, own web address, no Aurum name, alerts, reports, Team, logo on the seal, links that never expire | The Pro column for anything new: the two new designs, the three new openings, unlimited catalogue, scheduled reminders |

- Anyone who buys in the sale before launch day is treated the same way.
- The storefront is not promised to either group here. File 10 decides.
- A Signature owner can subscribe to Pro on top. While the subscription is active they have Pro. When it ends they are back on Signature, not Free.

### B3. How the app knows what is allowed
The server sends one small object, called `ent` (entitlements). The app shows and hides things from `ent` only. It never works limits out from the plan name.

```json
{
  "tier": "free",              // "free" | "starter" | "pro"  (what the app gates on)
  "label": "Free",             // shown to the user: Free, Starter, Pro, Signature, Prestige
  "legacy": null,              // null | "signature" | "prestige"
  "docs_limit": 5,             // null means unlimited
  "docs_used": 2,
  "docs_left": 3,              // null when unlimited
  "resets_on": "2026-12-01",
  "designs": ["royal"],
  "openings": ["envelope"],
  "branding": "line",          // "line" | "mark" | "none"
  "devices_max": 1, "devices_used": 1,
  "businesses_max": 1,
  "catalogue_max": 10,         // null means unlimited
  "link_days": 60,             // null means no expiry
  "pro_pack": false,           // alerts, monthly report, Team, logo on seal, overdue alert, scheduled reminders
  "own_domain": false,         // true only for Prestige
  "status": "none",            // "none" | "active" | "grace" | "ended"
  "paid_until": null,
  "period": null,              // "month" | "year"
  "method": null,              // "card" | "transfer"
  "renews": false,
  "checked_at": "2026-11-15T10:00:00Z"
}
```

In the app:
- `isFree()` becomes `ent.tier === "free"`.
- Every `isPrestige()` check becomes `ent.pro_pack`, except the two about the customer's own address, which become `ent.own_domain`, and "no Aurum name", which becomes `ent.branding === "none"`.
- Use the design and opening ids the app already uses. File 08 names the new ones; until file 08 is built, the lists hold only today's ids.
- The app stores the last `ent` on the device so it works without data (part F3).

---

## C. Accounts (question 4)

### C1. Ways to sign in
1. **Google.** The first, largest button.
2. **Email and password.**

No phone-number sign-in (SMS costs money). No "magic link" emails: a link opens in the phone's browser, not in the installed app, and the person ends up signed in to the wrong place. **Emails carry a 6-digit code that the person types into the app.**

### C2. Supabase settings (set-up job, part L)
- Site URL: `https://auruminvoice.com.ng/app/`. Redirect allow-list: `https://auruminvoice.com.ng/app/`.
- Email provider: on. Confirm email: on. Code length 6. Code lifetime 1 hour. Minimum password length 8.
- Google provider: on, with the client ID and secret from Google Cloud.
- Custom mail server connected (part L). Without it sign-up emails stop after a few an hour.
- Email templates in part J.

### C3. The calls (plain `fetch`, with the `apikey` header as today)
| Action | Call |
|---|---|
| Sign up | `POST /auth/v1/signup` with `email`, `password` |
| Confirm the code | `POST /auth/v1/verify` with `type: "signup"`, `email`, `token` |
| Send the code again | `POST /auth/v1/resend` with `type: "signup"`, `email` |
| Sign in | `POST /auth/v1/token?grant_type=password` |
| Keep signed in | `POST /auth/v1/token?grant_type=refresh_token` |
| Forgot password | `POST /auth/v1/recover` with `email`; then `POST /auth/v1/verify` with `type: "recovery"`; then `PUT /auth/v1/user` with the new `password` |
| Google | Send the browser to `/auth/v1/authorize?provider=google&redirect_to=https://auruminvoice.com.ng/app/`. It returns with the session in the address after `#`. Read it, store it, and clear the `#` part from the address at once. |
| Sign out | `POST /auth/v1/logout` |

- Store the session (access token, refresh token, expiry, email) on the device in the same storage the app already uses for its licence. Refresh the access token when it has under 5 minutes left, before any call that needs it.
- Calls that act for the account send `Authorization: Bearer <access token>`. The existing key-and-device calls keep the anon key as today.
- If a refresh fails because there is no connection, the app carries on (part F3). If it fails because the session is no longer valid, show the sign-in screen. The person's documents stay on the device.

### C4. Google sign-in where it does not work
- **Inside Instagram, Facebook, TikTok and similar in-app browsers** Google refuses to sign people in. Detect them from the browser's user-agent text (it contains `FBAN`, `FBAV`, `Instagram`, `TikTok`, `musical_ly` or `Line/`). There, hide the Google button and show: **"To continue with Google, open this page in Chrome or Safari. Tap the three dots at the top, then 'Open in browser'. Or use your email below."**
- **In the installed app on iPhone** the Google round trip may not return to the app. This must be tested on a real iPhone (part M). If it fails, hide the Google button in installed mode on iPhone and show: **"Use your email here. If you joined with Google, tap 'Forgot password' to set one."**

### C5. Screens and wording
Calm, short, the same dark-and-gold style as the first-run welcome.

**Welcome** (shown when there is no session and no stored key)
- Heading: `Welcome to Aurum`
- Line: `Create your free account. 5 documents a month, no card needed.`
- Buttons: `Continue with Google` · `Continue with email`
- Small links: `I already have an account` · `I have a licence key` · `See a sample invoice`
- Footer: `By continuing you agree to our terms and privacy notice.` (links to `policies.html`)

**Create account**: fields Email, Password (with show/hide). Hint: `At least 8 characters.` Button `Create account`.
**Enter your code**: `We sent a 6-digit code to {email}. Type it here.` Six boxes. Links `Send it again` (allowed after 60 seconds) · `Change email`.
**Sign in**: Email, Password. Button `Sign in`. Link `Forgot password?`
**Forgot password**: `Enter your email and we will send you a code.` Then the code screen, then `Choose a new password`, button `Save and sign in`.

Errors (exact):
| When | Message |
|---|---|
| Wrong email or password | `That email or password is not right. Try again, or tap "Forgot password".` |
| Email already has an account | `You already have an account with this email. Sign in instead.` |
| Wrong or old code | `That code is not right, or it has expired. Tap "Send it again".` |
| No connection | `You are offline. Connect to the internet to sign in.` |
| Too many tries | `Too many tries. Please wait a few minutes.` |
| Throwaway email address | `Please use your regular email address.` |
| This phone already has a free account | `This phone already has a free account ({masked email}). Sign in with that one.` |

**After sign-in** the app calls `account_enter` (part H). A new account then goes into the existing first-run welcome. An account with a workspace goes to Home and restores from the backup, as a new phone does today.

**Account card in "My house"**: email · plan label · documents used this month (`3 of 5 used · resets 1 Dec`) · for paid plans `Active until 14 Jan 2027` and `Renews by itself` or `Does not renew by itself` · buttons `Change plan`, `Payments`, `Devices`, `Sign out` · small link `Delete my account`.

**Sign out**: `Sign out of this phone? Your documents stay safe in your account.` Buttons `Sign out` · `Stay`. If the backup has unsaved changes and there is no connection: `You have changes that are not backed up yet. Connect to the internet first, or you may lose them.` Signing out removes the session and the workspace data from that device, and frees its device slot.

**Delete my account**: records a request (part H) and shows `We have your request. We will delete your account and documents within 7 days and confirm by email. Client links you sent will stop working.` The owner carries it out by hand at launch.

**The sample.** `See a sample invoice` opens what today's free demo button opens. Check how the current demo is entered and keep it working unchanged. It needs no account.

### C6. Devices (question 13)
- The limit is `ent.devices_max`. Each device row gains a `label` (for example `Android phone · Chrome`) set at sign-in.
- Signing in on one device too many shows: `Your plan allows {n} device(s). Choose one to sign out.` with the list (label, last used). Picking one frees it and lets the new one in.
- A person may do this **3 times in any 30 days**. After that: `You have changed devices several times this month. Message us on WhatsApp and we will help.`
- Clearing a browser's storage creates a new device and uses one change. The Devices screen says so in one line.
- **Business name lock stays** (1 business; 2 on Pro and Prestige). New: the owner of the account may change a business name themselves once every 60 days from My house. More often than that: WhatsApp. This replaces the SQL command you run today.
- Not built: watching for sign-ins from many places. The device limit, the device-change limit and the business lock are enough at this size.

---

## D. Moving everyone across (questions 5 and 6)

### D1. Existing buyers (Signature, Prestige)
- After the update, a phone that already holds a key **opens exactly as before**. No sign-in is forced, ever.
- Once, then every 30 days until done, Home shows a card: **"Protect your purchase. Create an account so you never lose your key or your documents. Your {Signature/Prestige} plan stays exactly as it is."** Buttons `Create account` · `Later`.
- Creating the account from that card joins the key to it (`link_licence`). Their plan label stays Signature or Prestige.
- **Order of calls after any sign-in:** if the device already holds a key, the app calls `link_licence` with it first. Only when the device holds no key does it call `account_enter`. This stops a second, empty workspace being made for someone who already has one.
- On a new phone they can either sign in (if they joined), or tap `I have a licence key`, type the key, and are then asked to create an account to finish.
- `link_licence` allows the join when **either** this device is already registered on that key, **or** the account's email equals the key's buyer email. Otherwise: `We could not match this key to you. Message us on WhatsApp with the email you bought with.`
- One key joins one account. An account has one workspace. If the account already has a workspace with no sent documents, that empty one is removed and the key takes its place. If it already has sent documents: `This account already has documents. Message us on WhatsApp and we will join them for you.` (You join them by hand; expected to be rare.)
- Once a key is joined, the old `activate_license` call no longer adds **new** devices to it. New devices come in by signing in. Devices already registered keep working.
- Plan screen for them: **"Signature. Paid once. Yours to keep. Nothing to renew."** then what it includes, then `Upgrade to Pro` (Signature only).

### D2. Today's free-link users
- Their free key stays as their workspace. The email-link sign-up retires.
- From launch day, a free key that is not joined to an account can open, edit and save drafts, but when it tries to send, the server answers `account_needed` and the app shows: **"Create your free account to keep sending. You now get 5 documents a month, up from 3."** with the Welcome buttons, email filled in from the key.
- After they sign up, the key joins the account and the 5-a-month limit applies.
- The `free-signup` function stays deployed for 7 days after launch so that links already emailed still open, then is removed. The sales page stops offering it on launch day.

### D3. Referral codes
Paused at launch. The "Refer a friend" card is hidden for everyone and new orders ignore codes. A referral scheme for subscriptions can be designed later. **Owner:** if you owe anyone a referral reward today, honour it by hand.

---

## E. What counts as a document (questions 2 and 3)

### E1. The rule
- A document is counted **the first time it is sent or saved for a client**: private link, WhatsApp, PDF, image or print.
- Drafts are never counted, and there is no limit on drafts.
- Sending the same document again, or editing its items, prices or notes, is not counted again, in this month or a later one.
- Changing the client or the document number makes it a new document.
- Every type counts as one: invoice, receipt, quotation, delivery note, credit note, purchase order.
- The count starts again on the 1st of each month, Lagos time.

Build note: the app already passes a signature (`p_sig`) with each count. Check what it is made from. It must be made from the document type, its number and the client's name only. If it includes items or amounts, change it to those three.

### E2. At the limit
The document is kept as a draft. Nothing is lost. The sheet says:

| Plan | Heading | Text | Buttons |
|---|---|---|---|
| Free | `You have used your 5 free documents this month` | `This one is saved as a draft, and everything you already sent keeps working. Your free documents come back on {1 December}. To send it now, choose a plan.` | `See plans` · `Not now` |
| Starter | `You have used your 50 documents this month` | `This one is saved as a draft. Your documents come back on {1 December}. Pro has no monthly limit.` | `See Pro` · `Not now` |

One line appears on Home when 1 is left: `1 document left this month.` No other countdown, no pop-ups.

A locked design, opening or Pro feature opens the existing upgrade sheet with: `{Feature} is part of {Starter/Pro}.` then the price line for that plan, buttons `See plans` · `Not now`.

### E3. Without data (question 3)
- A private link needs a connection anyway, so the server always counts it.
- A PDF or image can be made without data. The app allows it while its stored `docs_left` is above zero, lowers its stored count, and reports the document to the server the next time it connects.
- When those reports arrive, the server records them even if that takes the month over the limit. Nothing is taken back. The person simply has none left until the 1st.
- Honest limit: the link limit is enforced by the server and cannot be dodged. The PDF limit is enforced by the app, so a determined person could dodge it. That is acceptable: the link and the client experience are what people pay for.

---

## F. When a plan is active, late or ended (question 8)

### F1. The dates
- Every successful payment adds one period to `paid_until`: one calendar month or one year, starting from the later of now and the current `paid_until`.
- **Active:** now is before `paid_until`.
- **Grace:** up to 7 days after `paid_until`. Everything keeps working. A banner shows.
- **Ended:** after the grace days. The account behaves as Free (or as Signature or Prestige for those owners).

### F2. What "ended" means
| Thing | What happens |
|---|---|
| Documents, clients, saved items, backup | All stay. Nothing is deleted. |
| Documents already sent | Keep their design and opening, and their links stay open. The shorter link period of the lower plan starts to apply only 30 days after the plan ended, and the "plan ended" email gives that date. |
| A link that has closed | The client sees: `This document is no longer available here. Ask {business name} to send it again.` with a WhatsApp button to the business. The owner still has the document in the app and can send it again. |
| Sending | The lower plan's monthly limit applies. |
| Designs and openings above the lower plan | New documents use the lower plan's set. The person's choices are remembered for when they return. |
| Second business | Can be opened and read. It cannot send until Pro is back. |
| Devices | Nobody is signed out. The lower limit applies to the next new device. |
| Alerts, reports, Team, scheduled reminders | Stop. |

Banners (one at a time, on Home, with a `Pay now` button that opens the plan screen):
| When | Text |
|---|---|
| Transfer payer, 7 days or fewer left | `Your {Pro} plan ends on {14 Jan}. Renew to keep it.` |
| Card renewal failed, in grace | `We could not renew your {Pro} plan. Pay by {21 Jan} to keep it.` |
| Ended | `Your {Pro} plan has ended. Your documents are safe. Renew any time.` (can be dismissed; returns after 14 days, then stops) |

### F3. Without data
- A signed-in person can use the app with no connection. The stored `ent` applies.
- If the app has not reached the server for 7 days (the existing `OFFLINE_GRACE_DAYS`), paid features pause until it connects once. Documents stay open. Message: `Connect to the internet once so we can check your plan.`
- If the stored `paid_until` plus 7 days passes while offline, the app applies "ended" by itself until it connects.

---

## G. Paying (questions 7, 9 and 10)

### G1. Two ways to pay, one rule underneath
| Way | What the customer does | Renewal |
|---|---|---|
| **Card** | Pays on Paystack's page with a card | Paystack charges the card each month or year by itself |
| **Transfer or USSD** | Pays on Paystack's page by bank transfer or USSD | Does not renew by itself. Pays for one month or one year. We remind them before it ends. |

Underneath, both are the same: **a confirmed payment adds one period.** The server keeps a list of payments, and `paid_until` is worked out from it.

Yearly is shown first and marked `2 months free`, because transfers and failed cards make monthly renewals fragile in Nigeria.

### G2. Paystack set-up (set-up job, part L)
Four Paystack plans, created in **test** and again in **live**. Their codes go into the `prices` table.
| Name in Paystack | Amount | Interval |
|---|---|---|
| Aurum Starter Monthly | ₦3,000 | monthly |
| Aurum Starter Yearly | ₦30,000 | annually |
| Aurum Pro Monthly | ₦6,000 | monthly |
| Aurum Pro Yearly | ₦60,000 | annually |

### G3. The flow
1. The person is signed in and taps a plan. The **plan sheet** shows: plan, `Monthly` / `Yearly` switch, the price, and two buttons: `Pay with card (renews by itself)` · `Pay by transfer or USSD`. Under them: `You can cancel any time. Refund within 7 days of your first payment.` (The second sentence is shown only once the owner has said yes to decision 2 in part N.)
2. The app calls `create_sub_order` (signed in). The server works out the amount. The browser never sends a price.
3. The app calls the `billing` function, action `init`. It asks Paystack for a payment page: for card, with the plan code and the card channel only; for transfer, with the plain amount and the bank transfer, USSD and bank channels only. The return address is `https://auruminvoice.com.ng/app/?paid={reference}`.
4. The person pays on Paystack's own page (the same hosted page as today, not the popup).
5. **Paystack tells the server directly** (the webhook). The server checks the signature, asks Paystack again whether that reference was truly paid, in naira, for at least the order amount, then adds the period. This works even if the person never returns to the app.
6. When the person returns, the app calls `billing` `verify` with the reference (the same checks; safe to run twice) and then refreshes `ent`. It also refreshes `ent` whenever the app comes to the front.
7. Success screen: `You are on {Pro}. Thank you.` and `Active until {14 Dec 2026}.` Button `Done`. If the payment is not confirmed yet: `We are confirming your payment. This can take a minute.` with `Check again`; after 3 tries: `Still waiting. If you were charged, your plan will switch on by itself. Message us on WhatsApp if it has not within an hour.`

Card renewals arrive later as webhook events with Paystack's own reference. The server finds the account from the Paystack customer code and subscription saved at the first payment, runs the same checks, and adds a period.

Paystack events to handle: `charge.success` (first payments and renewals), `subscription.create` (save the subscription code and its email token), `invoice.payment_failed` (mark the subscription as needing attention; send the "could not renew" email), `subscription.not_renew` and `subscription.disable` (mark as not renewing), `refund.processed` (part G5). Always answer 200 once the signature is valid, as the function does today.

### G4. Changing plan and cancelling (question 9)
| Change | Rule | Wording |
|---|---|---|
| Starter to Pro | Immediate. They pay the full Pro price. Starter days left are converted: **Starter days left ÷ 2, rounded up, added as Pro days.** The old card subscription is switched off and a new one made. | `Your {18} unused Starter days become {9} extra Pro days.` |
| Monthly to yearly, same plan | Immediate. The year is added after the days already paid for. The old card subscription is switched off. | `Your year starts when your current month ends.` |
| Pro to Starter | Not mid-period. They stop renewal, and choose Starter when Pro ends. | `To move to Starter, stop renewal. You can choose Starter when Pro ends on {date}.` |
| Stop renewal (card) | `Change plan` > `Stop automatic renewal`. The server switches the Paystack subscription off. The plan stays until `paid_until`. | Confirm: `Stop automatic renewal? You keep {Pro} until {14 Jan}. After that your account moves to the free plan and your documents stay.` Buttons `Stop renewal` · `Keep it`. |
| Transfer payer | Nothing to cancel. | `Your plan does not renew by itself. It ends on {date} unless you renew.` |
| Change the card | Opens Paystack's own "manage subscription" link for that subscription. | `Update card` |

The half-days rule is exact when both plans are on the same period (Pro costs exactly twice Starter) and a fair approximation otherwise. It is deliberately simple.

### G5. Refunds
- **Rule (needs your yes, decision 2 in part N):** a full refund if asked within 7 days of the **first** payment for a plan, monthly or yearly. No refunds for renewals; renewal can be stopped at any time.
- You make the refund in the Paystack dashboard. When Paystack confirms it (`refund.processed`), the server marks that payment refunded and removes its period. The account drops to the lower plan as in F2, without the grace days.

### G6. The Business request (question 10)
A small public form, reached from the Pricing page and the plan screen. No sign-in needed.
- Fields: Your name · Business name · WhatsApp number · Team size (`2 to 5`, `6 to 20`, `More than 20`) · `What do you need?` (optional).
- After sending: `Thank you. We will message you on WhatsApp when Business is ready.`
- Saved in `business_requests`. It appears in the owner dashboard, and the owner gets an email. Protected against spam the same way as the review form (hidden trap field, a limit per visitor per day).

### G7. Receipts for subscribers
- Paystack emails a receipt for every payment by itself.
- `Payments` in the account card lists every payment: date, plan, period, amount, reference, and `Refunded` where it applies.
- Not at launch: an Aurum-designed receipt for the subscription. A good later touch.

### G8. What you receive (check Paystack's current fees page)
Paystack's local fee, as I know it, is 1.5% plus ₦100, capped at ₦2,000.
| Price | Fee | You receive |
|---|---|---|
| ₦3,000 | ₦145 | ₦2,855 |
| ₦6,000 | ₦190 | ₦5,810 |
| ₦30,000 | ₦550 | ₦29,450 |
| ₦60,000 | ₦1,000 | ₦59,000 |

---

## H. Database design (question 11)

One new file, `accounts.sql`, safe to run more than once, applied after the existing SQL files. Every table has row-level security switched on with **no policies**, as today: nothing can be read or written except through the functions below.

### H1. Changes to existing tables
```
licences
  + user_id      uuid unique references auth.users(id)   -- the account that owns this workspace
  + paid_tier    text check (paid_tier in ('starter','pro'))
  + paid_until   timestamptz
  + paid_period  text check (paid_period in ('month','year'))
  + paid_method  text check (paid_method in ('card','transfer'))
  + ended_at     timestamptz        -- when the last paid plan ended (for the 30-day link rule)
  + name_changed_at timestamptz
  plan stays as it is: 'free' | 'signature' | 'prestige'   (what the workspace owns for good)

licence_devices
  + label text

invoices
  + branding text        -- 'line' | 'mark' | 'none', stamped when published
  + closed_at timestamptz -- set when the link's period is over; the payload is then replaced
                          -- by a small stub holding only the business name and WhatsApp number
```

### H2. New tables
```
plan_rules        -- one row per level; the limits in part B
  level text primary key      -- 'free','starter','pro','signature','prestige'
  tier text                   -- what the app gates on: free | starter | pro
  label text
  docs_per_month int          -- null = unlimited
  devices int, businesses int
  designs text[], openings text[]
  branding text
  catalogue_items int         -- null = unlimited
  link_days int               -- null = no expiry
  pro_pack boolean, own_domain boolean

prices
  tier text, period text, amount_kobo bigint,
  plan_code_test text, plan_code_live text,
  primary key (tier, period)

sub_orders        -- one row each time someone starts to pay
  reference text primary key          -- 'AUS-' + 20 characters
  licence_key text, user_id uuid,
  tier text, period text, method text, amount_kobo bigint,
  mode text check (mode in ('test','live')),
  status text default 'pending',      -- pending | paid | underpaid
  created_at timestamptz default now(), paid_at timestamptz

payments          -- the list that paid_until is worked out from
  id bigint generated always as identity primary key,
  reference text unique not null,     -- ours, or Paystack's for a renewal
  licence_key text not null,
  source text,                        -- 'order' | 'renewal' | 'admin'
  tier text, period text, amount_kobo bigint, channel text,
  mode text, paid_at timestamptz,
  period_start timestamptz, period_end timestamptz,
  refunded_at timestamptz

subscriptions     -- the card subscription, when there is one
  licence_key text primary key,
  customer_code text, subscription_code text, email_token text, plan_code text,
  tier text, period text,
  status text,                        -- active | not_renewing | attention | off
  next_payment timestamptz, updated_at timestamptz

device_changes    (licence_key text, changed_at timestamptz default now())
business_requests (id, name, business, whatsapp, team_size, note, session, created_at)
delete_requests   (user_id uuid, licence_key text, created_at, done_at)
admins            (user_id uuid primary key)
billing_log       (id, at timestamptz default now(), kind text, reference text, detail jsonb)   -- every webhook and every refusal
```
`free_use` keeps its name and shape and now counts documents for every plan that has a limit.
`plan_rules` rows for `signature` and `prestige` hold today's promises (part B2).
`app_config` gains `subs_mode` (`off` | `test` | `live`). The existing `paystack_mode` keeps controlling the old one-time checkout until launch day.

### H3. The level of a workspace
One internal function, `_level(key)`, used everywhere:
1. If `plan = 'prestige'`: level `prestige`.
2. Else if `paid_until + 7 days > now()`: level = `paid_tier`.
3. Else if `plan = 'signature'`: level `signature`.
4. Else: `free`.

A Signature owner with an active Pro subscription is therefore `pro`, and returns to `signature` when it ends.

### H4. Functions
Signed-in functions use `auth.uid()` and are granted to `authenticated` only. Key-and-device functions stay as today.

| Function | Who may call | What it does |
|---|---|---|
| `account_enter(p_device, p_label)` | signed in | Finds the workspace for this account. If none: refuses throwaway email domains (the list already in `create_free_signup`); refuses if this device already holds a different free workspace; otherwise creates a free workspace. Registers the device or answers `device_limit` with the device list. Returns `key` and `ent`. |
| `account_swap_device(p_device, p_label, p_remove)` | signed in | Removes one device and registers this one. Max 3 in 30 days. |
| `link_licence(p_key, p_device)` | signed in | Part D1. |
| `my_plan(p_key, p_device)` | anyone with key and device | Returns `ent`. Replaces `free_status`, which stays as a thin copy so an old cached app still works. |
| `free_use(...)` | as today | Same name and arguments. Now uses the level's `docs_per_month`. Answers `account_needed` for a free key with no account. Reasons: `limit` with `used` and `limit`. Returns the new `docs_left`. |
| `publish_invoice(...)` | as today | Same. Uses the level for the document limit. Refuses a design or opening not in the level's lists (`design_locked`). Stamps `branding`. Business lock: 1, or 2 when `businesses = 2`. |
| `view_invoice(p_id)` | anyone | Same, and returns `branding` so the client page obeys the server. |
| `rename_business(p_key, p_device, p_slot, p_name)` | signed in | Once every 60 days. |
| `create_sub_order(p_tier, p_period, p_method)` | signed in | Makes the order with the amount from `prices`. When `subs_mode = 'test'` it refuses anyone who is not in `admins`. When `off` it refuses everyone. |
| `sub_order_for_verify(p_reference)` | server only | For the billing function. |
| `apply_payment(p_reference, p_paid_kobo, p_channel, ...)` | server only | **Runs once per reference** (the unique `reference`). Checks the amount, writes `payments`, sets `paid_tier`, `paid_until`, `paid_period`, `paid_method`, applies the half-days rule on an upgrade, clears `ended_at`. |
| `apply_refund(p_reference)` | server only | Part G5. |
| `save_subscription(...)`, `mark_subscription(...)` | server only | From the webhook. |
| `my_payments()` | signed in | The Payments list. |
| `request_business(...)`, `request_delete()` | public / signed in | Parts G6 and C5. |
| `admin_*` | signed in **and** in `admins` | Part I. |
| `nightly()` | scheduled | Sets `ended_at` for plans whose grace has passed; closes client links older than the level's `link_days` (sets `closed_at` and replaces the payload with the stub; `view_invoice` then answers `closed` with the stub) (never for `signature` or `prestige`; and for a workspace whose plan ended, not until 30 days after `ended_at`); queues the reminder emails in part J. |

`activate_license` keeps working for keys with no account. For a key that has an account it still accepts devices already registered, and answers `use_account` to a new device.

### H5. The two server functions (Supabase Edge Functions)
| Function | Sign-in check | Does |
|---|---|---|
| `billing` | **On.** It reads the signed-in user from the request. | `init`, `verify`, `stop_renewal`, `manage_link` |
| `billing-webhook` | **Off** (Paystack cannot sign in). | Receives Paystack's events. Checks the signature with the secret key. Re-checks every payment with Paystack. Writes every event to `billing_log`. |

They are separate on purpose. Supabase switches the sign-in check back **on** every time a function is deployed, which would silently break the webhook. After every deploy of `billing-webhook`, switch it off again. The owner dashboard shows "Last message from Paystack: {time}" so a broken webhook is noticed.

The existing `paystack` function is not touched in Build 2. It keeps serving the one-time sale until launch day.

### H6. Security rules
1. The browser never sends a price, a plan level or a date that the server trusts.
2. A payment grants time only after the server itself has asked Paystack about that reference: status success, currency NGN, amount at least the order amount, reference matches.
3. Each reference grants time once. A repeated webhook or a repeated `verify` changes nothing.
4. Test and live are kept apart: an order records its mode, the matching secret key is used, and a test payment can only reach an admin's account.
5. Secret keys live only in Supabase secrets. The app holds only the public anon key.
6. Sessions: the refresh token is stored on the device like the licence key is today. Signing out removes it.
7. Card details never touch Aurum. Paystack holds them.
8. Every refusal and every webhook goes into `billing_log`.

---

## I. The owner dashboard (question 12)

Today `admin.html` asks for one password and sends it with each request. Change in Build 2:
- The dashboard asks you to **sign in with your own account**. Only accounts listed in `admins` get anything. Your account is added to `admins` once, by a line of SQL.
- The password versions of the admin functions (`admin_reviews(p_pass)` and the others) are removed after the new ones work.
- New cards: accounts created (today, 7 days, total) · people on Free, Starter, Pro, Signature, Prestige · payments this month and the amount received · renewals that failed · plans ending in the next 7 days · Business requests · delete requests · "Last message from Paystack" · database size.
- New actions: add time to an account by hand (`source = 'admin'`, for a customer who paid you directly), join two workspaces (rare), free a device, unlock a business name.

---

## J. Emails

All from `Aurum Invoice Studio <hello@auruminvoice.com.ng>` through the outside mail service (part L). Plain, short, no images.

| Email | Subject | Body |
|---|---|---|
| Sign-up code (Supabase template) | `Your Aurum code: {{ .Token }}` | `Welcome to Aurum Invoice Studio. Your code is {{ .Token }}. Type it into the app to finish creating your account. It works for 1 hour. If you did not ask for this, ignore this email.` |
| Password code (Supabase template) | `Your Aurum password code: {{ .Token }}` | `Your code is {{ .Token }}. Type it into the app to choose a new password. It works for 1 hour. If you did not ask for this, ignore this email; your password has not changed.` |
| Plan ending (transfer payers; 7 days, 3 days and on the day) | `Your Aurum {Pro} plan ends on {14 Jan}` | `Your {Pro} plan ends on {14 Jan 2027}. It does not renew by itself. To keep it, open Aurum and tap "Pay now". If you do nothing, your account moves to the free plan and your documents stay safe.` |
| Could not renew (card) | `We could not renew your Aurum plan` | `Your card payment for {Pro} did not go through. Your plan keeps working until {21 Jan}. To keep it, open Aurum and tap "Pay now". You can pay by card, transfer or USSD.` |
| Plan ended | `Your Aurum {Pro} plan has ended` | `Your {Pro} plan has ended and your account is now on the free plan. Your documents are all still in the app. On the free plan, client links stay open for 60 days, so links older than that will close on {date, 30 days after the plan ended}. You can renew any time from the app.` |

No welcome series and no marketing emails in this design. Paystack sends its own payment receipts.

---

## K. Answers to the `[BILLING]` marks in files 02, 03 and 04 (question 14)

| Where | Use |
|---|---|
| File 02 section 1, "No card needed" | Confirmed. Keep the words. |
| File 02 section 3.1, table row "Documents" | Free `5 a month` · Starter `50 a month` · Pro `Unlimited` |
| File 02 section 3.1, table rows "Features" | Use these rows, in this order: Designs (`1` · `3` · `All 5`) · Openings (`1` · `3` · `All 6`) · Devices (`1` · `2` · `5`) · Businesses (`1` · `1` · `2`) · Saved items (`10` · `100` · `Unlimited`) · Client links stay open (`60 days` · `12 months` · `Always, while subscribed`) · Phone alerts when a client opens or pays (`No` · `No` · `Yes`) · Monthly report and team (`No` · `No` · `Yes`) · Aurum's name on your client page (`Shown` · `Small mark` · `Removed`). Above the table: `Every plan includes all six document types, your logo and bank details, the sealed private link, PDF, and seeing when your client opens it.` |
| File 02 section 3.1, "What counts as a document" | `A document is counted the first time you send it or save it for a client: as a link, on WhatsApp, as a PDF or as an image. Drafts are not counted. Sending the same document again, or correcting it, is not counted again. Invoices, receipts, quotations, delivery notes, credit notes and purchase orders each count as one. The count starts again on the 1st of every month.` |
| File 02 section 3.2, "What the free plan includes" | `The free plan includes all six document types, your logo, colours, signature and bank details, the sealed private link, PDF and image, and it shows you when your client opens the document. Free documents use the Royal design and the wax-seal envelope, and carry a small "Made with Aurum Invoice Studio" line.` |
| File 03 section 1, question 3 (extra sentence) | `It includes your logo and bank details, the sealed private link, and seeing when your client opens it.` |
| File 03 section 1, question 10, "Can I cancel?" | `Yes, at any time, from your account screen. Your plan stays active until the end of the period you paid for. After that your account moves to the free plan and your documents stay.` |
| File 03 section 1, the old "own web address (Prestige)" question | Remove it from the sales page. Keep the same answer inside the app's Help for Prestige owners. |
| File 03 section 2, question 1 | `You can still open, edit and save drafts, and everything you already sent keeps working. To send a new document, wait until the 1st of next month or choose a paid plan.` |
| File 03 section 2, question 2 | `Yes. You can pay by card, bank transfer or USSD through Paystack. A card renews by itself. A transfer pays for one month or one year, and we remind you before it ends.` |
| File 03 section 2, question 4 | `Yes. You can move up at any time, and your unused Starter days are converted into Pro days. To move down, stop renewal and choose the smaller plan when your current period ends.` |
| File 03 section 2, question 5 | `Yes. Paystack emails a receipt for every payment, and your account screen lists all your payments.` |
| File 03 section 3, question 3 | `Yes. Your logo, colours, signature and bank details are on every document, including on the free plan.` |
| File 04 | No change. The offers already match. |
| Refund line (Pricing, About, policies), after your yes | `If Aurum is not right for you, tell us within 7 days of your first payment and we refund it in full.` |

---

## L. Set-up jobs (not code)

| # | Job | Who | Notes |
|---|---|---|---|
| 1 | **Mail service.** Create a free account with a mail service that allows a custom sending domain (Brevo's free plan allowed about 300 emails a day when I last knew; check today). Add the two DNS records it gives you to `auruminvoice.com.ng`. Put its SMTP details into Supabase > Authentication > SMTP. | Owner, with the builder's help | Needed before Build 1 can be tested. |
| 2 | **An address that receives mail.** `hello@auruminvoice.com.ng`, forwarded to your own inbox by a free forwarding service or your domain seller. | Owner | Also needed for the SEO plan's decision 3. |
| 3 | **Google sign-in.** In Google Cloud: create a project, set the consent screen (app name `Aurum Invoice Studio`, your support email, the privacy page `https://auruminvoice.com.ng/policies.html`), publish it, create a Web client, and add the return address `https://ymmxhjfcfaawrebxoxbu.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase > Authentication > Google. | Owner | Free. Verifying the domain in Search Console first makes this smoother. |
| 4 | **Supabase sign-in settings** from C2 and the two email templates from part J. | Builder (through Composio) or owner | |
| 5 | **Paystack plans** (G2), in test and in live. Send the eight plan codes to the builder. | Owner | |
| 6 | **Paystack webhook address:** `https://ymmxhjfcfaawrebxoxbu.supabase.co/functions/v1/billing-webhook`, in test and in live. | Owner | Paystack takes one address for test and one for live. **Test:** point it at `billing-webhook` when Build 2 starts. **Live:** leave it on the old `paystack` function until launch day, so the one-time sale keeps working. On launch day, in the same hour: change the live address, set `paystack_mode` to `off` and set `subs_mode` to `live`. |
| 7 | **Make your account an admin.** | Builder | One line of SQL after you sign up. |
| 8 | **Change the Gmail app password** and remove Gmail from the functions once job 1 works. | Owner, then builder | Still open from the handover. |

---

## M. What you test

**Zip 1 (accounts), on your own phone:**
1. Sign up with email; the code arrives within a minute; the code works; a wrong code is refused politely.
2. Sign up with Google in Chrome. Then try from inside Instagram's browser: the "open in Chrome" message shows.
3. On an iPhone, with Aurum added to the Home Screen: Google sign-in either works or the "use your email" message shows.
4. Sign out and in again. Forgot password works.
5. Switch to aeroplane mode: the app opens and you can make a draft.
6. On a phone that already has your old licence key: the app opens as before; create an account from the card; everything is still there; the plan still says Signature or Prestige.
7. Sign in on a second phone on a free account: you are asked which device to sign out.
8. An old free-link key: it is asked to create an account when it tries to send, and afterwards shows 5 a month.

**Zip 2 (plans and payment), with payments in test mode:**
1. On Free, the 6th document in a month is stopped with the calm message and saved as a draft.
2. Pay for Starter monthly with a Paystack test card. The plan shows as Starter within a minute.
3. Close the app before returning from Paystack on another test payment: the plan still switches on.
4. Pay by test transfer. It shows "Does not renew by itself".
5. Upgrade Starter to Pro: the extra days are shown and correct.
6. Stop automatic renewal: the plan stays until its date.
7. `Payments` lists each payment.
8. A Pro-only design is refused on Starter and offered with the upgrade sheet.
9. The owner dashboard asks you to sign in, and shows the new cards.
10. The Pricing page matches part K.

**For the Opus billing review (step 9 of the master plan), try to break:** paying once and being credited twice (repeat the webhook, repeat `verify`); paying less than the price; a test payment unlocking a live account; a forged webhook without a valid signature; one account's reference credited to another; the upgrade rule giving too many days; a refund that leaves the plan active; a renewal for an account whose subscription was switched off; an expired plan that keeps Pro features because the app was offline; `apply_payment` being callable by anyone but the server.

---

## N. Decisions I need from you

1. **Starter's limit: 50 documents a month.** I chose it so that a busy seller has a clear reason to move to Pro. It is one number in a table and can be changed any time. Say if you want a different number, or no limit on Starter.
2. **Refunds: full refund within 7 days of the first payment, none for renewals.** `policies.html` must say the same. Yes, or a different rule?
3. **Free plan carries the line "Made with Aurum Invoice Studio. Make yours free."** on the client page. It is how the free plan pays for itself: every free invoice introduces Aurum to a client. Yes or no?
4. **Client links on the free plan close after 60 days** (12 months on Starter). This keeps the free database from filling up. The owner keeps the document and can always send it again. Yes, or a longer period?
5. **Referral codes are paused at launch.** Yes or no?
6. **Tax on your subscription income.** Ask the accountant whether Aurum must charge VAT on subscriptions at your size. The prices here are treated as final prices to the customer.

## O. Not in this design
- Team members with their own sign-in (the Team tab keeps working by device name, as today).
- Changing the email on an account (by WhatsApp request for now).
- Paying in dollars, or from outside Nigeria.
- A referral scheme for subscriptions.
- Automatic WhatsApp messages (not possible on free services; see the master plan).
- The storefront, and whether existing buyers get it (file 10).
