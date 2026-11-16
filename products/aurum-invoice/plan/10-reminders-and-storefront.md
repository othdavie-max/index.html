# 10. Brief for reminders and the storefront

Written by Fable on 16 Nov 2026. This is a brief only. Nothing here has been built or tested.
It covers sections 6 and 9 of `00-master-plan.md` and part 10 of `09-saved-items.md`. It is the file for **Build 5 (reminders)** and **Build 6 (storefront)**, both built by Opus.

**How to read this brief.** It settles what the product does, the wording, and the choices that carry risk. It leaves the detailed code design to Opus, who will read the app before building. Where a rule is written, it is decided. Where it says "Opus decides", it is left open on purpose. Paystack details were written from memory of its documentation and must be confirmed against the current documentation before any code is written. If a confirmed fact contradicts this brief, stop and tell the owner.

---

# Part A. Reminders (Build 5)

## A1. What exists today
- **By hand:** "Remind" on any unpaid invoice opens three ready messages (`Gentle reminder`, `Due today`, `Overdue`) and sends the chosen one to WhatsApp. The invoice then shows "reminded 3 days ago". This is `remindSheet` in the app. It is on every plan and stays.
- **On the server:** each published invoice has a pay-by date (`pay_by`) and a state (`pay_status`). A job runs every morning at 8 am Lagos time (`send_overdue_alerts`, scheduled with `pg_cron`) and sends one phone alert listing overdue invoices, at most every 3 days, to Prestige businesses that switched alerts on.
- **Phone alerts** go through the `notify` function (Web Push). On an iPhone they work only when Aurum has been added to the Home Screen.
- **Email:** the `free-signup` function can already send through Brevo. File 07 makes Brevo, or a similar free service, the one mail service.

## A2. What cannot be done
Aurum cannot send a WhatsApp message by itself. That needs the paid WhatsApp Business API. Everything below works on free services. The design leaves a place for a paid WhatsApp channel to be added later (A9).

## A3. What Build 5 adds
Scheduled reminders, for Pro and Prestige (`ent.pro_pack`). Three things happen on a reminder day:

1. **The owner gets a phone alert** with the message already written. One tap opens WhatsApp with it, ready to send.
2. **The client gets an email by itself**, if the owner has switched that on and the conditions in A6 are met.
3. **The app shows a "Reminders to send today" card on Home.** The app works this out by itself from the invoices on the phone, so it appears even with no data and even if alerts are switched off.

The client's own page already shows the due date. Add one quiet line there when it applies: `Due today` or `Overdue by {4} days`. No red, no pressure.

## A4. The schedule
- A reminder schedule belongs to one invoice and needs a **pay-by date**. Without one, the control reads: `Add a pay-by date to schedule reminders.`
- Scheduled reminders work for invoices sent as a **private link**, because the server has to know about the invoice. An invoice sent only as a PDF still appears in the Home card.
- The owner sets a usual schedule once, in "My house", under a new heading `Reminders`:
  - Switch: `Schedule reminders for new invoices`
  - Chips, any number: `3 days before` · `1 day before` · `On the day` · `1 day after` · `3 days after` · `7 days after` · `14 days after`
  - Default: `3 days before`, `On the day`, `3 days after`, `7 days after`
  - Switch: `Also email my client` with the hint `Aurum emails the reminder to your client for you. Only when their email is on the invoice.`
- In the Send step of an invoice, one row: `Reminders: {3 days before, on the day, +2 more}` with `Change` and `Off`. `Change` shows the same chips for this invoice only.
- Reminder days are counted in Lagos time. Reminders go out once a day, in the 8 am job.
- At most 7 reminders per invoice.

## A5. Which message
| Day | Message used |
|---|---|
| Before the pay-by date | `Gentle reminder` |
| On the pay-by date | `Due today` |
| 1 to 13 days after | `Overdue` |
| 14 days after or later | `Final notice` (new) |

The first three are the texts already in `remindSheet`. Use them word for word. `Final notice` is new: take its wording from the final-notice message already published in the guide `/guides/payment-reminder-messages-nigeria/`. Do not write a new one. Add it as a fourth choice in `remindSheet` too.

The amount in every message is the balance still owed, as `dueOn(d)` gives it today.

**The owner's alert:**
- One invoice: title `Reminder to send`, text `{Client name} · {INV-0042} · {₦325,000} is due in 3 days. Tap to send on WhatsApp.` (or `is due today`, or `is {4} days overdue`).
- Several on one morning: one alert only. Title `{3} reminders to send today`, text the client names. It opens the Home card.
- Tapping an alert for one invoice opens the app on that invoice's reminder sheet with the right message already chosen.

## A6. The email to the client
Sent by the server through the mail service, only when **all** of these are true:
1. The owner switched on `Also email my client`.
2. The invoice has the client's email.
3. **The client has already opened the invoice link at least once.** This is a safeguard. It means the email only ever goes to someone who has already received the invoice from the business another way. Without it, anyone could use Aurum's address to email payment demands to strangers.
4. The invoice is still unpaid or part-paid, and the client has not tapped "I've paid".
5. The business is under its daily limit (A8).

| | |
|---|---|
| From | `{Business name} via Aurum <reminders@auruminvoice.com.ng>` |
| Reply-To | The business's email from its profile, when there is one |
| Subject, before | `Reminder: invoice {INV-0042} from {Business} is due on {14 Dec}` |
| Subject, on the day | `Invoice {INV-0042} from {Business} is due today` |
| Subject, after | `Invoice {INV-0042} from {Business} is overdue` |

Body (plain, no images):
```
Hello {client name},

This is a reminder from {Business} that {₦325,000} on invoice {INV-0042} is due on {14 December 2026}.

View the invoice and pay: {private link}

If you have already paid, thank you. You can let {Business} know from the same link.

{Business}
{Business phone}

This reminder was sent for {Business} by Aurum Invoice Studio.
```
- On the day, the first sentence ends `is due today.` After, it ends `was due on {14 December 2026} and is now overdue.`
- When there is a Reply-To, add as the last line: `Reply to this email to reach {Business}.`

## A7. When reminders stop
| Event | What happens |
|---|---|
| The invoice is marked paid | All its reminders stop. |
| The client taps "I've paid" or pays | Reminders pause. The owner gets the existing "Client says they have paid" alert. If the owner marks it paid, they stop. If the owner taps `Not received yet`, they resume. |
| A part payment is recorded | Reminders continue, with the new balance. |
| The invoice expires (its "valid until" date passes) or the owner switches its reminders off | They stop. |
| The plan is no longer Pro or Prestige | Scheduled reminders pause. Nothing is deleted. They resume when the plan returns. Reminding by hand still works. |
| The link has closed (file 07, link periods) | They stop. |

## A8. Limits
- At most 4 emails per invoice, and at most 30 reminder emails a day per business.
- Sign-up and password codes always come first. Reminder emails may use at most half of the mail service's daily allowance. Any that do not fit wait until the next morning. The owner's own alert is never delayed.
- Every reminder, sent or waiting, is recorded, and the invoice shows `Reminded {3} times · last on {12 Dec}`, counting both hand-sent and scheduled ones.

## A9. For the server (Opus decides the detail)
- Keep the one morning job. Extend it; do not add a second schedule.
- The schedule travels with the invoice when it is published and when its state changes (`publish_invoice`, `set_invoice_state`).
- A table that records each reminder with its invoice, day, channel (`push`, `email`, and later `whatsapp`) and state. One reminder per invoice per day per channel, so a job that runs twice sends nothing twice.
- An invoice with its own schedule is left out of the general "overdue invoices" alert, so the owner is not told twice.
- A new mail function, or an extension of an existing one, that sends from a queue and respects A8. It must not share the code path of the sign-up emails.
- Leave the channel list open so a paid WhatsApp channel can be added later without changing the schedule or the table.

## A10. One fix to make in this build: "Paid via Paystack"
Today, when a client pays with the Paystack button on an invoice page, the page tells the server so, and the app shows **"Paid via Paystack"**. The server never checks with Paystack. The button uses the business's own public key, and Aurum has no way to confirm a payment into someone else's Paystack account. A dishonest client could make that label appear without paying.

- Change the label to `Client paid by Paystack · check your Paystack`.
- Check that this signal never marks an invoice as paid, and never issues a receipt, by itself. If it does anywhere, change it to behave exactly like "Client says paid".
- Part B gives invoices a confirmed route later. Only that route may show `Paid · confirmed by Paystack`.

## A11. What you test (Zip 6)
1. Set the usual schedule. Send an invoice with a pay-by date three days ahead: next morning's alert arrives, and one tap opens WhatsApp with the right message.
2. With `Also email my client` on and your own second email as the client: no email arrives until you open the link once as the client; after that, the next reminder email arrives.
3. Mark the invoice paid: no further reminders.
4. As the client, tap "I've paid": reminders pause and you are told.
5. Two invoices due on the same morning: one alert, not two.
6. In aeroplane mode, the Home card still lists today's reminders.
7. On a Starter account, the schedule control offers Pro, calmly. Reminding by hand still works.
8. The label on a Paystack payment now reads `Client paid by Paystack · check your Paystack`.

---

# Part B. The storefront (Build 6)

## B1. The idea in one paragraph
A business switches on a public store page that shows the saved items it has chosen. A customer picks items and places an order. The order **becomes an invoice link straight away**, so the customer opens the same sealed envelope and pays on the same page every Aurum client already uses. When payment is confirmed, a receipt is made by itself and the owner is told. The storefront adds a way in; it reuses everything Aurum already does well.

It is built in two steps, each with its own zip:
- **Zip 7a: the store without confirmed online payment.** Orders become invoices. The customer pays by bank transfer and taps "I've paid", and the owner confirms, exactly as today. This step carries no payment risk and is useful by itself.
- **Zip 7b: confirmed online payment** (B5). Built only after the checks in B5 come back clear.

## B2. The address and the page
- Address: `https://auruminvoice.com.ng/s/{handle}`. The handle is chosen by the owner: 3 to 30 characters, small letters, numbers and hyphens. It must be unique. A list of reserved and misleading words is refused (Aurum's own names, bank and payment-company names, words such as `admin`, `support`, `official`). The owner may change it once every 60 days; the old address forwards for 90 days.
- The page is a **new, small, separate file** (`store.html`), not part of the large app file. It must open fast on a low-cost phone: no animation beyond simple fades, photos loaded as they scroll into view.
- Look: ivory page, the business's colour for buttons and accents, the brand sheet's type. The dark, sealed experience begins when the order becomes an invoice.
- **Store pages are hidden from Google and AI crawlers at launch** (`noindex`, and not in the sitemap). Thousands of pages written by strangers on Aurum's domain could harm the ranking of Aurum's own pages, and could be used to mislead. Customers reach a store by its link, from WhatsApp, Instagram or a QR code. This can be revisited once there are real stores to judge.

What a visitor sees:
1. The business: logo, name, tagline, a one-line "about", and a `Chat on WhatsApp` button.
2. Category chips, then the items: photo, name, price with its unit, and the store note (`Made to order, 5 days`). An item with no price shows `Price on request` and a `Ask on WhatsApp` button in place of `Add`.
3. An item opens larger, with its detail, a quantity control and `Add to order`.
4. `Your order`: the items, quantities, and the total.
5. Details: `Your name`, `WhatsApp number`, `Email` (asked only when paying online), `Delivery` or `Pickup`, the address when delivery is chosen, and `Anything we should know?`
6. Button: `Place order`. Under it: `You will receive an invoice from {Business}. Nothing is charged until you choose to pay.`
7. At the foot of every store page: `Sold by {Business}. Aurum Invoice Studio provides this page and does not sell these items.` and a link `Report this store`.

When a store is switched off, or its plan has ended: `This store is taking a short break. You can still reach {Business} on WhatsApp.`

## B3. From order to receipt
1. The customer places the order. **The server works out every price** from its own copy of the store's items. Nothing the browser says about a price or a total is trusted.
2. The server creates the invoice as a private link and sends the customer to it. The customer sees the sealed envelope with their name on it, and the invoice.
3. **Numbers.** Store invoices have their own series kept by the server: `WEB-0001`, `WEB-0002`, and so on, per business. The app gives out its usual numbers on the phone, sometimes without data, so the two series must never share a counter. Store receipts are `WEB-R0001` and so on.
4. **Shape of the document.** When the owner publishes the store, the app uploads the business profile and one blank invoice made by the app's own `newDocFor`. The server fills that blank with the items, the customer, the number, the dates and the delivery fee. This guarantees the document has exactly the shape the client page expects. Opus must not hand-build a document shape on the server.
5. **Delivery.** The owner sets up to 5 delivery options, each a name and a fee (`Island: ₦3,500`), and may allow `Pickup` at no fee. VAT follows the business's own VAT setting.
6. **Paying.** By bank transfer and "I've paid", as today (7a). By confirmed online payment (7b).
7. **Unpaid orders lapse.** The invoice's existing "valid until" date is set to 48 hours after the order (the owner may choose 24, 48 or 72). After that the invoice shows the existing `EXPIRED` state with its `Request a new invoice` button.
8. **When payment is confirmed** (7b), the server marks the invoice paid, makes the receipt as a private link, shows the customer the thank-you card with `Open your receipt`, and tells the owner by phone alert and email.
9. **In the app.** A new dashboard section, `Store orders`: each order with its state (`Awaiting payment`, `Paid`, `Completed`, `Cancelled`). The owner can `Mark as paid` (which issues the receipt, as today), `Mark completed`, `Cancel order`, and `Message on WhatsApp`. Store invoices and receipts are brought into the app's own list of documents when it next connects, so statements, the money overview, reminders and CSV export include them.
10. New-order alert: title `New order`, text `{Customer} · {₦45,000} · {WEB-0007}`.

## B4. The store's items on the server
A store cannot read saved items from a phone. So:
- In the item sheet (file 09), when the store is switched on, two more controls appear: the switch `Show in my store` and the field `Store note`. They use the `inStore` and `storeNote` fields that file 09 already put on every item.
- An item can be shown only when **"Keep this price fixed" is on**, so a one-off price given to one client never changes the public price. Switching `Show in my store` on switches the fixed price on and says so.
- When an item is shown, the app copies it to the server. Changes made without data wait and are sent on reconnecting.
- **Store photos are separate from the small photo in the catalogue.** The owner adds one for the store. It is shrunk on the phone to 600px, JPEG, quality about .72, and kept in Supabase Storage, not on the phone. An item with no store photo shows a tile with its first letter.
- **At most 60 items per store at launch.** Supabase's free storage is 1 GB; at about 50 KB a photo, 60 items is about 3 MB a store, or roughly 300 stores before storage costs money.

## B5. Confirmed online payment: the decision

**The problem.** A business's own Paystack public key lets a customer pay, but only that business's secret key can confirm it. Aurum must never hold a business's secret key. So Aurum cannot confirm payments made that way.

**The route: Paystack subaccounts.** The customer pays through **Aurum's** Paystack account, with the payment marked for that business's **subaccount**. Paystack settles the money directly into the business's own bank account. Aurum's server can confirm every payment, because it was made on Aurum's account.

How it works for the owner:
1. In `My store` > `Get paid online`, the owner picks their bank and types their account number.
2. Aurum asks Paystack for the account's name and shows it: `Is this your account? {ACCOUNT NAME}`. The owner confirms.
3. Aurum creates the subaccount and stores only its code.
4. From then on, `Pay now` on the store's invoices goes through this route. Paystack's fee is taken from the business's side, as it would be on its own Paystack account. Aurum takes nothing (decision 3).

**What this changes, said plainly:**
- The sales page says "The money goes straight to you. Aurum never touches it." That remains true of the money: it never enters Aurum's bank account. But the payment is now made on Aurum's Paystack account. So for store payments the wording becomes: **"Payments go straight to your bank account through Paystack. Aurum does not hold your money."**
- **Aurum becomes the merchant Paystack sees.** If a customer disputes a payment or a store turns out to be a fraud, Paystack will come to Aurum first. That is a real responsibility and the reason for the safeguards below.

**Checks before Zip 7b is built (owner, with Paystack):**
1. Ask Paystack whether your account may use subaccounts (split payments) to collect for other businesses, and what they require of you. They may require a registered company.
2. Ask how disputes and chargebacks on a subaccount payment are handled, and who pays.
3. Ask whether there are limits on the number of subaccounts or on amounts.

If Paystack says no, the store stays as in Zip 7a, with transfer and "I've paid". That is still a useful product.

**Safeguards for 7b (decided):**
- Online payment is for Pro (and Prestige, decision 4), never for Free or Starter.
- **You approve each store's online payment yourself at launch.** A new card in the owner dashboard lists stores asking for it, with the business name, the bank account name, the handle and the items. One tap approves. This is a few minutes of your time per store and removes most of the risk while Aurum is small.
- The bank account's name must reasonably match the business or its owner. A mismatch is shown to you at approval.
- At launch: at most ₦500,000 per payment and ₦2,000,000 per store per day. Above that the customer is told to pay by transfer.
- You can switch any store, or its online payment, off at once from the dashboard.
- The same server checks as subscriptions (file 07, H6): the amount comes from the server; every payment is re-checked with Paystack; each reference counts once; test and live are kept apart.
- Store payments and subscription payments arrive at the **same** Paystack webhook, because one Paystack account has one address. The webhook function tells them apart by the reference: `AUS-` for subscriptions, `AUW-` for store and invoice payments.

**A bonus once 7b exists.** The same route can serve ordinary invoices. For a business with online payment approved, `Pay now` on any invoice link can use the confirmed route in place of its own public key, and show `Paid · confirmed by Paystack`. Include this in 7b if it does not add risk; otherwise leave it and say so.

## B6. Abuse
| Risk | Answer |
|---|---|
| Fake or junk orders | A limit per visitor (5 orders an hour per store) and per store (100 a day), a hidden trap field as on the review form, a check that the WhatsApp number looks real. Unpaid orders lapse (B3.7) and are cleared from the list after 14 days. The owner can block a number. |
| A store selling things it should not | A short list of what may not be sold, in the terms, in line with Paystack's own rules. `Report this store` on every page. Reports appear in the owner dashboard. You can switch a store off at once. |
| Pretending to be someone else | The handle rules in B2. You can rename or remove a handle. The page always says who is selling and that Aurum is not the seller. |
| Misleading people through search | Store pages are hidden from search (B2). |
| Customers' personal details | A customer's name, number and address are shown only to that store's owner. The privacy notice in `policies.html` must be extended to cover store customers before launch. `[VERIFY]` with a lawyer, together with the store terms. |

## B7. Who gets the storefront
- **Pro.** Business too, when it exists.
- **Prestige owners: yes** (decision 4). They were promised the Pro column for new things, they are few, and they are Aurum's earliest supporters.
- **Signature owners: no**, unless they subscribe to Pro.
- When a Pro plan ends, the store shows the "short break" message after the 7 days of grace. Orders and invoices already made are untouched.

## B8. The owner's screen: `My store`
A new row in "My house". Inside:
- Switch: `Store is open`
- `Store address`: `auruminvoice.com.ng/s/` and the handle field. Messages: `That address is taken.` · `Use 3 to 30 small letters, numbers or hyphens.` · `That address is not available.`
- `About`: one line, up to 120 characters.
- `Delivery`: up to 5 options (name and fee), and the switch `Allow pickup`.
- `Unpaid orders lapse after`: chips `24 hours` · `48 hours` · `72 hours`.
- `Get paid online` (7b): the bank and account steps in B5. States: `Not set up` · `Waiting for approval` · `On` · `Switched off`. While waiting: `We check every new store before switching on online payment. This usually takes a day.`
- `Share your store`: `Copy link` · `Share on WhatsApp` · the QR code · a hint `Put this link in your Instagram bio.`
- A count line: `{12} of 60 items in your store` with a link to Saved items.

## B9. For the server (Opus decides the detail)
- New tables for stores, store items, orders, order items, reports and blocked numbers. All with row-level security on and no policies, reached only through functions, as the rest of the database.
- A public function to read a store and to place an order; signed-in functions for the owner to manage the store.
- A rewrite in Netlify so that `/s/{handle}` serves `store.html`.
- Private links for store invoices use the app's existing link form (`invoice.html?i={id}`, `receipt.html?i={id}`).
- The storefront must not weaken any rule in file 07, and must not add any new `data-fx` rule.
- Tell the owner, before building 7b, which Paystack facts were confirmed and which differ from this brief.

## B10. What you test
**Zip 7a:**
1. Switch the store on, choose an address, show five items with store photos. Open the address on another phone.
2. Place an order as a customer: you land on the sealed invoice, numbered `WEB-0001`, with the right items, delivery fee and total.
3. In the browser, try to change a price before ordering (the builder will show you how): the invoice still shows the true price.
4. Tap "I've paid" as the customer. As the owner, `Mark as paid`: a receipt is made, and the order shows `Paid`.
5. Leave an order unpaid: it shows `EXPIRED` after the time you chose.
6. The order and its invoice appear in the app's documents and in the money overview.
7. Switch the store off: the address shows the "short break" message.
8. Search Google for the store's address a week later: it is not there.
9. On the Infinix Note 30, the store page opens quickly and scrolls smoothly.

**Zip 7b** (payments in test mode first):
1. Set up `Get paid online`. The account name shown is yours. It waits for your approval; approve it in the dashboard.
2. Pay an order with a Paystack test card: within a minute the invoice is `Paid · confirmed by Paystack`, a receipt link appears, and you get the alert.
3. Close the page before returning from Paystack: the order still becomes paid.
4. Try to mark an order paid from the browser without paying (the builder will show you how): it is refused.
5. An order above ₦500,000 offers transfer only.
6. Switch a store's online payment off from the dashboard: `Pay now` disappears at once.

## B11. Honest limits
- The Paystack steps here are from memory and are not confirmed. Whether your account may use subaccounts is not known yet.
- With subaccounts, disputes reach Aurum first. The safeguards reduce that risk; they do not remove it.
- Phone alerts on an iPhone work only when Aurum is added to the Home Screen.
- Free services set real ceilings: about 300 stores' photos, a daily cap on emails, and a database of 500 MB. Passing them is the point at which Aurum starts to cost money to run. By then the subscriptions should cover it.
- A store is not a stock system. It does not count stock or stop two people ordering the last item.

---

# Part C. Decisions I need from you

1. **Emailing clients by themselves.** Off until the owner switches it on, and only to a client who has already opened the invoice once. Yes?
2. **Confirmed online payment through Paystack subaccounts** (B5), with Aurum as the merchant Paystack sees and the safeguards listed. Yes, and will you ask Paystack the three questions?
3. **Aurum takes no share of store payments** at launch. Paystack can pay Aurum a percentage of each payment later if you choose. Yes to nothing for now?
4. **Prestige owners get the storefront.** It is a lifetime promise to a small group. Yes or no?
5. **Store pages hidden from Google at launch.** Yes?
6. **You approve each store's online payment by hand at launch.** Yes?
7. **The limits:** 60 items a store, ₦500,000 a payment, ₦2,000,000 a store a day. Say if you want different numbers.

# Part D. Not in these builds
- Automatic WhatsApp messages.
- Stock counts, variations (sizes, colours as separate choices), discount codes, delivery tracking.
- A store on the customer's own web address.
- Customer accounts or saved baskets.
- Reviews of a store or its items.
- New SEO pages for the storefront. When Zip 7a is live, ask for an addition to the SEO plan (a product page and the searches people use for online stores and payment links).
