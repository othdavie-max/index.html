# 02. Page list with exact wording

Use the wording exactly. Where a page needs body text beyond what is written here, write it in the same plain style as the existing guides, and take every fact from this plan or from the existing pages. `[BILLING]` = wait for the billing file. `[VERIFY]` = needs the accountant's check before publishing.

## 1. Wording used everywhere

**The one-sentence description of Aurum (use word for word wherever Aurum is described):**
> Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses. Clients receive each document as a private, wax-sealed link, and the owner sees when it is opened.

**The price sentence (Phase A onward):**
> Free for 5 documents a month. Paid plans start at ₦3,000 a month.

**Buttons:** main button `Start free`. Second button `See plans` (links to `/pricing/`). Line under the main button: `Free for 5 documents a month. No card needed.` `[BILLING]` confirm "No card needed"; if a card is required, delete those three words.

**Headline on the sales page stays:** "Your business is premium. Your invoice should be too."

**What Aurum is not (keep this honesty line where it already appears):** "Aurum is an invoicing app, not accounting software: it does not run payroll, track stock or file taxes."

### Replacement table for the 33 live pages (Phase A, same release as subscriptions)
| Old wording | New wording |
|---|---|
| Pay once, no monthly fees. | Free for 5 documents a month. Paid plans start at ₦3,000 a month. |
| Pay once. *(end of a description)* | Free to start. |
| Pay once, use it on your phone, no monthly fees | Start free, use it on your phone |
| You pay once / You pay once and there are no monthly fees | You can start free, and paid plans start at ₦3,000 a month |
| It installs on your phone, works without data, and is a one-time payment with no monthly fees | It installs on your phone and works without data. It is free for 5 documents a month |
| Using it for your own business needs a licence, which is a one-time payment with no monthly fees | Using it for your own business needs a free account. You can make 5 documents a month at no cost |
| Both are one-time payments | Both paid plans can be paid monthly or yearly |
| licence key appears on your screen straight after payment | your plan is active on your account straight after payment |
| we have confirmed the reviewer paid for a licence | we have confirmed the reviewer is a paying customer |
| Get Aurum *(button)* | Start free |
| Try the free demo / Try free demo / Open the free demo *(buttons)* | Start free |
| There is a free demo with sample data... / There is a free demo that uses sample businesses... | There is a free plan: 5 documents a month with your own business details. |
| Signature / Prestige *(old plan names)* | Remove. Use Free, Starter, Pro only. |

Whether the sample demo stays as a separate thing is a master-plan decision. If it stays, its link text is `See a sample invoice`.

In the guide "Best invoice app for small businesses in Nigeria", the checklist lines "Is it a one-time payment or a subscription, and in which currency?" and "Compare a monthly fee with a one-time payment" stay as they are. They are neutral advice.

## 2. The 33 live pages: new titles and descriptions

Only pages listed here change their title or description. All other live pages keep their title and description, and only take the replacement table above.

| Page | Title | Description |
|---|---|---|
| `/` | Aurum Invoice Studio: Luxury Invoices & Receipts for Nigeria *(no change)* | Invoices, receipts and quotations your clients open like a gift: a private, wax-sealed link with your logo and bank details. Free for 5 documents a month. |
| `/invoice-app-nigeria/` | Invoice App for Nigerian Businesses \| Aurum Invoice Studio *(no change)* | Make invoices, receipts and quotations on your phone, with your logo and bank details. Works without data. Free for 5 documents a month. |
| `/receipt-maker-nigeria/` | Receipt Maker for Nigerian Businesses \| Aurum Invoice Studio *(no change)* | Make professional payment receipts on your phone in one tap, with your logo and a Paid stamp. Turn any paid invoice into a receipt. Free to start. |
| `/quotation-maker-nigeria/` | Quotation Maker for Nigerian Businesses \| Aurum Invoice Studio *(no change)* | Make professional price quotations on your phone with a valid-until date and deposit. When accepted, turn it into an invoice in one tap. Free to start. |
| `/whatsapp-invoice/` | Send Invoices on WhatsApp the Professional Way \| Aurum *(no change)* | Stop typing prices in WhatsApp chats. Send a private, wax-sealed invoice link, see when it is opened and remind clients in one tap. Free to start. |
| `/about/` | About Aurum Invoice Studio \| Made in Nigeria *(no change)* | Who is behind Aurum Invoice Studio, how the plans and payment work, how to reach us on WhatsApp, and our refund policy. |

### Sales page (`/`): the line under the headline
The headline has no search words in it, so the line directly under it must carry them. Use:
> Aurum is the invoice, receipt and quotation app for Nigerian businesses. Your client opens a private, wax-sealed link, and you see the moment they open it.

Prices on the sales page must be plain text in the HTML (rule 4 in README). The date-based sale prices and their script are removed in Phase A.

### About page: add an "Aurum in brief" box at the top
AI assistants and directories copy facts from boxes like this. Use a plain HTML table.

| | |
|---|---|
| Name | Aurum Invoice Studio |
| What it is | Invoice, receipt and quotation app for Nigerian businesses |
| Documents | Invoice, receipt, quotation, delivery note (waybill), credit note, purchase order (LPO) |
| Works on | Android phones, iPhones and computers, in the browser. Installs like an app. Works without data. |
| Price | Free for 5 documents a month. Starter ₦3,000 a month or ₦30,000 a year. Pro ₦6,000 a month or ₦60,000 a year. |
| Made in | Nigeria |
| Founder | *(owner's decision 1 in README; leave the row out if not named)* |
| Contact | WhatsApp *(existing number)*; email *(owner's decision 3)* |
| Website | https://auruminvoice.com.ng/ |

## 3. New pages for Phase A

### 3.1 `/pricing/`
- **Title:** Aurum Invoice Studio Pricing: Free, Starter and Pro
- **Description:** Aurum is free for 5 documents a month. Starter is ₦3,000 a month, Pro is ₦6,000 a month. Pay yearly and get 12 months for the price of 10.
- **H1:** Simple pricing in naira
- **Opening paragraph:** Aurum Invoice Studio is free for up to 5 documents a month. When you need more, Starter costs ₦3,000 a month and Pro costs ₦6,000 a month. Pay for a year and you get 12 months for the price of 10.
- **Table (plain HTML table, not an image):**

| | Free | Starter | Pro | Business |
|---|---|---|---|---|
| Monthly | ₦0 | ₦3,000 | ₦6,000 | Coming soon |
| Yearly | ₦0 | ₦30,000 | ₦60,000 | Coming soon |
| Documents | 5 a month | `[BILLING]` | `[BILLING]` | |
| Features | `[BILLING]` | `[BILLING]` | `[BILLING]` | |
| Button | Start free | Choose Starter | Choose Pro | Request Business |

- **Sections (H2):** What counts as a document · Paying monthly or yearly · How to pay (card, transfer, USSD through Paystack) · Already bought Aurum? · Pricing questions *(FAQ from file 03, section 2)*
- **"Already bought Aurum?" text:** If you bought Aurum before subscriptions began, your purchase stays valid. You keep the access you paid for, and you do not need to subscribe.
- **"What counts as a document" text:** `[BILLING]`
- **Links to:** `/`, `/free-invoice-generator/`, `/about/`, `/reviews/`

### 3.2 `/free-invoice-generator/`
- **Title:** Free Invoice Generator for Nigeria (5 a Month) | Aurum
- **Description:** Make a professional invoice on your phone in about two minutes, in naira, with your logo and bank details. Free for 5 documents a month.
- **H1:** A free invoice generator made for Nigerian businesses
- **Opening paragraph:** You can make 5 invoices, receipts or quotations a month with Aurum at no cost. Add your business name, logo and bank details once, pick your client and items, and send the invoice on WhatsApp as a private link or a PDF. You need a free account so that your documents are saved and backed up.
- **Sections (H2):** How to make your first invoice (4 numbered steps: Client, Items, Payment, Send) · What is on the invoice · What the free plan includes `[BILLING]` · Free forever, or upgrade when you grow · Prefer a template? *(links to the 4 downloads)* · Questions *(FAQ, file 03 section 3)*
- **Honesty line (must appear):** The free plan is limited to 5 documents a month. If you send more than that, Starter is ₦3,000 a month.
- **Links to:** `/pricing/`, `/invoice-app-nigeria/`, `/guides/invoice-template-nigeria/`, `/guides/how-to-write-an-invoice-in-nigeria/`

## 4. New pages for Phase B

### 4.1 `/delivery-note-maker/`
- **Title:** Waybill and Delivery Note Maker for Nigerian Businesses
- **Description:** Make a waybill or delivery note on your phone: items and quantities, rider or driver details, and a "received in good condition" line. Free to start.
- **H1:** A waybill and delivery note maker for businesses that deliver
- **Opening paragraph:** A waybill, also called a delivery note, lists what you sent, who is carrying it and who should receive it. With Aurum you make one on your phone in a minute, or start it from an invoice in one tap, and the customer signs that the goods arrived in good condition.
- **Sections (H2):** What goes on a waybill · Start from an invoice in one tap · Proof of delivery · Who uses it (online sellers, logistics, wholesalers) · Questions
- **Links to:** `/guides/waybill-template-nigeria/`, `/guides/delivery-note-vs-invoice/`, `/invoice-app-nigeria/`

### 4.2 `/purchase-order-maker/`
- **Title:** LPO and Purchase Order Maker for Nigerian Businesses
- **Description:** Make an LPO or purchase order on your phone: supplier, items, agreed prices, deliver-by date and a supplier acknowledgement line. Free to start.
- **H1:** An LPO and purchase order maker for small businesses
- **Opening paragraph:** A purchase order, often called an LPO in Nigeria, is your written order to a supplier at an agreed price. With Aurum you make one on your phone with your logo, the deliver-by date and your delivery address, and the supplier acknowledges it.
- **Sections (H2):** What goes on an LPO · Why order in writing · From LPO to invoice to receipt · Questions
- **Links to:** `/guides/lpo-local-purchase-order-nigeria/`, `/guides/purchase-order-explained/`, `/invoice-app-nigeria/`

### 4.3 `/tools/` (hub)
- **Title:** Free Business Tools for Nigeria | Aurum Invoice Studio
- **Description:** Free tools for Nigerian businesses: a VAT calculator, a naira amount-in-words converter and a payment reminder message generator. No account needed.
- **H1:** Free tools for Nigerian businesses
- **Opening paragraph:** Three small tools that save time when you are writing invoices and receipts. They are free, they work on your phone, and you do not need an account.

All three tools run in the browser with no sign-up, work offline once loaded, and send nothing to a server. Each has a short explanation in HTML above and below the tool, so the page is useful to a crawler that does not run JavaScript.

### 4.4 `/tools/vat-calculator-nigeria/` `[VERIFY]` the rate before publishing
- **Title:** VAT Calculator Nigeria (7.5%): Add or Remove VAT
- **Description:** Add 7.5% VAT to a price, or find the VAT inside a price that already includes it. Free Nigeria VAT calculator in naira, with the formula shown.
- **H1:** Nigeria VAT calculator
- **Opening paragraph:** Type an amount in naira. The calculator adds 7.5% VAT to a price, or works out how much VAT is inside a price that already includes it.
- **Formulas shown on the page:** To add VAT: VAT = price × 0.075, total = price × 1.075. To remove VAT: price before VAT = total ÷ 1.075, VAT = total − price before VAT.
- **Worked example on the page:** ₦100,000 plus VAT is ₦107,500. A total of ₦107,500 contains ₦7,500 VAT.
- **Note on the page:** Not every business charges VAT. See *Should I charge VAT as a small business?* (answer page). This tool is a calculator, not tax advice.
- **Build note:** keep the rate in one named constant.
- **Links to:** `/guides/vat-on-invoices-nigeria/`, the VAT answer page, `/invoice-app-nigeria/`

### 4.5 `/tools/amount-in-words-naira/`
- **Title:** Naira Amount in Words Converter for Receipts and Cheques
- **Description:** Type a naira amount and get it in words, ready to copy onto a receipt, invoice or cheque. Handles millions, billions and kobo. Free.
- **H1:** Write a naira amount in words
- **Opening paragraph:** Receipts and cheques in Nigeria usually state the amount in words as well as figures. Type the figure and copy the words.
- **Format rules:** Nigerian and British style with "and"; commas between groups; kobo after the naira; ends with "only".
- **Worked example on the page:** ₦1,250,500.50 is "One million, two hundred and fifty thousand, five hundred naira, fifty kobo only".
- **Links to:** `/guides/receipt-template-nigeria/`, `/receipt-maker-nigeria/`, the "being payment for" answer page

### 4.6 `/tools/payment-reminder-message-generator/`
- **Title:** Payment Reminder Message Generator for WhatsApp (Free)
- **Description:** Fill in the client's name, the amount and the due date, choose a tone, and copy a polite payment reminder to send on WhatsApp. Free, no account.
- **H1:** Write a polite payment reminder in seconds
- **Opening paragraph:** Asking for your money is uncomfortable, so most people leave it too late. Fill in four details, choose how firm you want to be, and copy a message you can send on WhatsApp now.
- **Inputs:** client's name, amount, invoice number (optional), due date. **Tone:** Gentle, Due today, Overdue, Final notice.
- **Message wording:** use the messages already published in `/guides/payment-reminder-messages-nigeria/` (the app's own Gentle, Due today and Overdue texts). Do not write new ones.
- **Buttons:** `Copy message`, `Open in WhatsApp`.
- **Links to:** `/guides/payment-reminder-messages-nigeria/`, `/guides/how-to-get-paid-on-time-nigeria/`, `/whatsapp-invoice/`

### 4.7 `/answers/` hub, the answer pages and `/glossary/`
Specified in file 03.

## 5. New guides for Phase C (one or two a week, in this order)

Each guide follows the layout of the existing guides: "In short" box, plain sections, a sample, a free download where one fits, FAQ, and a soft link to the app.

| # | Address | Title | Description |
|---|---|---|---|
| 1 | `/guides/waybill-template-nigeria/` | Waybill in Nigeria: Meaning, Sample and Free Template | What a waybill is in Nigeria, what to write on it, a sample you can copy, and how it differs from an invoice and a receipt. |
| 2 | `/guides/lpo-local-purchase-order-nigeria/` | LPO in Nigeria: Meaning, Sample and How to Respond | What an LPO (local purchase order) is, what it should contain, a sample, and what a supplier should do after receiving one. |
| 3 | `/guides/rent-receipt-nigeria/` | House Rent Receipt Sample for Nigeria (Free Template) | A rent receipt sample for Nigerian landlords and agents: what it must show, the period covered, and a template you can copy. |
| 4 | `/guides/how-to-invoice-a-company-in-nigeria/` | How to Invoice a Company in Nigeria and Get Paid | What companies need on your invoice before they pay: LPO number, TIN, bank details, the right contact, and how to follow up. |
| 5 | `/guides/withholding-tax-on-invoices-nigeria/` `[VERIFY]` | Withholding Tax on Invoices in Nigeria, Explained Simply | Why a company may pay less than your invoice, what withholding tax is, what proof to ask for, and how to show it in your records. |
| 6 | `/guides/client-refuses-to-pay-nigeria/` `[VERIFY]` | What to Do When a Client Will Not Pay (Nigeria) | Calm, practical steps when a customer will not pay: reminders, a final notice, a payment plan, and when to consider the small claims court. |
| 7 | `/guides/invoice-in-dollars-from-nigeria/` | How to Invoice a Foreign Client from Nigeria | How Nigerian freelancers and businesses invoice clients abroad: currency, payment details, what to include, and common mistakes. |
| 8 | `/guides/car-sales-receipt-nigeria/` `[VERIFY]` | Car Sales Receipt in Nigeria: Sample and What to Include | A car sales receipt sample for Nigeria: buyer, seller, vehicle details, amount in words, and why a receipt alone is not proof of ownership. |
| 9 | `/guides/invoice-app-vs-excel-template/` | Invoice App or Excel Template: Which Should You Use? | An honest comparison of invoice apps and Excel or Word templates for a small Nigerian business, with when each one makes sense. |
| 10 | `/guides/receipt-book-vs-digital-receipts/` | Receipt Book or Digital Receipts: Which Is Better? | Paper receipt booklets compared with digital receipts for Nigerian businesses: cost, trust, record keeping and what customers prefer. |
| 11 | `/guides/school-fees-receipt-sample/` | School Fees Receipt Sample for Nigerian Schools | A school fees receipt sample: pupil, class, term, fees paid, balance, and how schools can issue receipts quickly on a phone. |
| 12 | `/guides/how-to-price-your-services-nigeria/` | How to Price Your Services in Nigeria | A simple way for Nigerian freelancers and service businesses to set prices: costs, time, deposit, and how to present the price. |
| 13 | `/guides/e-invoicing-nigeria-small-business/` `[VERIFY]` | E-Invoicing in Nigeria: What Small Businesses Should Know | What e-invoicing means in Nigeria, who it applies to today, and what a small business needs to do now. Plain language. |

**Must-say lines:**
- Guide 5, 6, 8, 13 end with: "This guide is general information, not legal or tax advice. Confirm your own situation with an accountant or lawyer."
- Guide 8 must say: a receipt records the payment; change of ownership and vehicle papers are separate and must be done properly.
- Guide 9 must be fair to templates: say plainly that a template is enough for a business that sends one or two invoices a month, and link the free downloads.
- Guide 13 must say: "Aurum Invoice Studio is not connected to the government e-invoicing system." Do not publish guide 13 until every date and threshold in it is confirmed from the Nigeria Revenue Service website.
- Guide 7: describe only what Aurum can do today. Do not claim invoices in dollars unless the app supports another currency. If unsure, ask.

### Trade pages (Phase C, after the guides above)
Same layout as the live trade guides ("Invoice for photographers in Nigeria"). Title pattern: `Invoice for [Trade] in Nigeria (With Sample)`. Where that is longer than 60 characters, leave out `(With Sample)`. Description pattern: `How [trade] in Nigeria should invoice: [three things from "Must cover"], with a sample invoice.`

| Address | Trade in title | Must cover |
|---|---|---|
| `/guides/invoice-for-logistics-and-dispatch-riders-nigeria/` | Logistics and Dispatch Riders | per-delivery and bulk pricing, waybills, pay-on-delivery remittance, weekly statements |
| `/guides/invoice-for-real-estate-agents-nigeria/` | Real Estate Agents | agency and legal fees, caution deposit, rent receipts, payment by instalment |
| `/guides/invoice-for-bakers-and-food-vendors-nigeria/` | Bakers and Food Vendors | deposits before baking, delivery fee, bulk and event orders, order confirmation |
| `/guides/invoice-for-printing-and-branding-businesses-nigeria/` | Printing and Branding Businesses | quotation first, design fee and print fee apart, quantity breaks, deposit before production |
| `/guides/invoice-for-interior-designers-nigeria/` | Interior Designers | design fee, materials and labour apart, stage payments, variations |
| `/guides/invoice-for-auto-mechanics-nigeria/` | Auto Mechanics and Workshops | parts and labour apart, estimate before work, deposit for parts, warranty note |
| `/guides/invoice-for-event-rental-businesses-nigeria/` | Event Rental Businesses | hire period, refundable deposit, damage terms, delivery and pickup |
| `/guides/invoice-for-cleaning-and-fumigation-services-nigeria/` | Cleaning and Fumigation Services | one-off and monthly contracts, repeat invoices, site visits, materials |

## 6. Upgrades to live guides (Phase B)

| Guide | Add |
|---|---|
| All 25 guides | An "In short" box at the top (file 03, section 5) and a visible "Last updated" date |
| `/guides/receipt-template-nigeria/` | Sections for "cash receipt" and "sales receipt"; the words "sample" and "format" in a subheading; link to the amount-in-words tool |
| `/guides/invoice-template-nigeria/` | Subheading "Invoice sample and format"; a line on "cash invoice" and "sales invoice" (the printed booklet names) |
| `/guides/quotation-template-nigeria/` | Subheading "Quotation sample and format" |
| `/guides/delivery-note-vs-invoice/` | One line: "In Nigeria a delivery note is often called a waybill", linking to the waybill guide |
| `/guides/purchase-order-explained/` | One line: "In Nigeria a purchase order is often called an LPO", linking to the LPO guide |
| `/guides/vat-on-invoices-nigeria/` `[VERIFY]` | Accountant re-checks the whole guide against the tax laws that began in January 2026; link to the VAT calculator |
| `/guides/payment-reminder-messages-nigeria/` | Link to the reminder generator near the top |
| `/guides/best-invoice-app-for-small-business-nigeria/` | See the rule below |

**Naming other invoice apps (the "best invoice app" guide).** AI assistants often answer "best invoice app in Nigeria" from pages that compare real options. The guide may name other tools, under these rules: the owner checks each tool's own public pricing page on the day of publishing; every fact has a link to its source and the date checked; nothing negative is said that the source does not say; Aurum's limits are stated as plainly as anyone else's; the list is reviewed every 3 months. If the owner cannot do that check, the guide stays as it is, comparing types of tools without names.

## 7. Menus and links between pages
- **Top menu:** Guides · Tools · Pricing · Reviews · `Start free`
- **Footer columns:** *Product:* Invoice app, Free invoice generator, Receipt maker, Quotation maker, Waybill maker, LPO maker, WhatsApp invoices, Pricing. *Learn:* Guides, Answers, Glossary, Tools, Templates. *Company:* About, Reviews, Policies, Contact.
- Each guide links to: its product page, 2 related guides, and 1 tool or answer page.
- Each answer page links to: the fuller guide, and one product page.
- Link text describes the target ("free invoice template"), never "click here".
- Every new page goes into `sitemap.xml` with a `lastmod` date, and into `llms.txt`.

## 8. Private and thin pages (never in the sitemap)
The app (`/app/`), `admin.html`, the document viewer pages (invoice, receipt, quotation, delivery note, credit note, purchase order), sign-in and account pages, and the 404 page. See file 05 for the settings.
