# 03. FAQ and answer pages

Use the questions and answers word for word. Every FAQ shown here must be visible on the page and repeated in the page's structured data (file 04). `[BILLING]` and `[VERIFY]` as in the README.

## 1. Sales page FAQ (`/`), Phase A
Replaces the current FAQ. Order matters: the first four are what people and AI assistants ask most.

1. **What is Aurum Invoice Studio?**
   Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses. Clients receive each document as a private, wax-sealed link, and the owner sees when it is opened. It also makes delivery notes, credit notes and purchase orders.
2. **How much does Aurum cost?**
   Aurum is free for up to 5 documents a month. Starter is ₦3,000 a month or ₦30,000 a year. Pro is ₦6,000 a month or ₦60,000 a year. A Business plan is coming soon.
3. **Is there a free plan?**
   Yes. You can make 5 documents a month at no cost, for as long as you like. `[BILLING]` add one sentence on what the free plan includes.
4. **Does it work without data?**
   Yes. Aurum installs on your phone and you can create documents with no connection. You need data only to send a link, back up, or sign in on a new phone.
5. **Do my clients need to download anything?**
   No. They open your link in their phone's browser, like any website. No app and no account.
6. **How do my clients pay me?**
   By transfer to your own bank account, which they copy in one tap, or by card, transfer or USSD through your own Paystack. The money goes straight to you. Aurum never touches it.
7. **Which phones does it work on?**
   Any modern Android phone or iPhone, and computers too. Install it from Chrome on Android, or from Safari on iPhone.
8. **How do I create an account?**
   With your email and a password, or with your Google account. It takes about a minute.
9. **I bought Aurum before subscriptions. Do I lose anything?**
   No. Your purchase stays valid and you keep the access you paid for. You do not need to subscribe.
10. **Can I cancel?**
    `[BILLING]`
11. **Is Aurum accounting software?**
    No. Aurum is an invoicing app. It does not run payroll, track stock or file taxes. You can export your records as a spreadsheet for your accountant.

Removed from the old FAQ: "How do I get my licence key?", "Is it a monthly subscription?", "Can I try it before I pay?", "Can I share my licence with a friend?". The old "How does my own web address work (Prestige)?" question is `[BILLING]`: keep it only if the billing file keeps that feature, with the plan name updated.

## 2. Pricing page FAQ (`/pricing/`), Phase A
1. **What happens when I reach 5 documents on the free plan?** `[BILLING]`
2. **Can I pay by bank transfer?** `[BILLING]` *(expected: yes, through Paystack)*
3. **Is the yearly price really cheaper?** Yes. A year of Starter is ₦30,000 instead of ₦36,000, and a year of Pro is ₦60,000 instead of ₦72,000. You get 12 months for the price of 10.
4. **Can I change plan later?** `[BILLING]`
5. **Do I get a receipt for my subscription?** `[BILLING]`
6. **What is the Business plan?** It is for larger teams and is coming soon. Tap "Request Business" and we will contact you when it is ready.
7. **I bought Aurum before subscriptions. Do I need to pay again?** No. Your purchase stays valid and you keep the access you paid for.

## 3. Free invoice generator FAQ (`/free-invoice-generator/`), Phase A
1. **Is it really free?** Yes, for 5 documents a month. There is no time limit on the free plan.
2. **Do I need an account?** Yes, a free one, so your documents are saved and backed up. Sign up with email or Google.
3. **Can I add my logo and bank details?** `[BILLING]`
4. **Can I send the invoice on WhatsApp?** Yes. Send it as a private link, or as a PDF or image.
5. **Is the invoice in naira?** Yes. Amounts are in naira with commas, and you can switch VAT on or off.
6. **What if I need more than 5 a month?** Starter is ₦3,000 a month or ₦30,000 a year.

## 4. Answer pages (Phase B)
Short pages, one question each, 250 to 450 words. They exist for people who ask a direct question, on Google or to an AI assistant.

**Layout of every answer page:**
- Address: `/answers/[slug]/`
- Title = the question (shorten only if over 60 characters). H1 = the question.
- Description = the first one or two sentences of the short answer, up to 155 characters.
- First thing under the H1: the **short answer** below, word for word, in a highlighted box.
- Then 2 to 4 short sections that explain, with one example from a Nigerian small business.
- Then "Read more" (the guide named below) and one line about Aurum with a `Start free` button.
- A visible "Last updated" date.
- Pages marked `[VERIFY]` also end with: "This is general information, not legal or tax advice."

**Hub page `/answers/`:** Title `Invoice and Receipt Questions, Answered Simply`. H1 `Invoice questions, answered`. Description `Short, plain answers to the questions Nigerian business owners ask about invoices, receipts, waybills, LPOs, VAT and getting paid.` It lists every answer page under four headings: The basics · Tax and registration · Getting paid · Using an invoice app.

| # | Slug and question | Short answer (exact) | Read more |
|---|---|---|---|
| 1 | `what-is-a-waybill` · What is a waybill? | In Nigeria, a waybill is the note that travels with goods being delivered. It lists what was sent, who sent it, who should receive it and who is carrying it. It shows quantities, not prices. It is the same idea as a delivery note. People also say "waybill it to me", meaning send it by road transport. | waybill guide |
| 2 | `what-is-an-lpo` · What is an LPO? | LPO means Local Purchase Order. It is a document a buyer, usually a company, school or government office, sends to a supplier to order goods or services at an agreed price. You supply first, then send an invoice that quotes the LPO number. | LPO guide |
| 3 | `is-an-invoice-a-legal-document` · Is an invoice a legal document? | An invoice is a business record, not a contract by itself. It shows what you supplied, the price and when payment is due. It becomes strong evidence when it matches something the customer agreed to, such as an accepted quotation, a signed delivery note or a message saying "go ahead". Keep those together. | how to write an invoice |
| 4 | `do-i-need-an-invoice-for-every-sale` · Do I need an invoice for every sale? | No. Use an invoice when the customer will pay later or needs a document to approve the payment. For a sale paid on the spot, a receipt is enough. Many businesses send an invoice first and a receipt after payment, so both sides have a full record. | invoice vs receipt vs quotation |
| 5 | `is-a-whatsapp-message-a-valid-invoice` · Is a WhatsApp message a valid invoice? | A price typed in a WhatsApp chat can show what was agreed, but it is a weak invoice. It has no invoice number, no due date and no business details, and it gets buried in the chat. Send a proper invoice as a link or PDF in the same chat, so both of you can find it later. | how to send an invoice on WhatsApp |
| 6 | `can-i-send-an-invoice-before-doing-the-work` · Can I send an invoice before doing the work? | Yes. Agree the price with a quotation first, then send an invoice for the deposit before you start, and invoice the balance when you deliver. For a small job, one invoice sent before the work, with payment due on delivery, is fine. | deposits and part payments |
| 7 | `can-i-change-an-invoice-after-sending-it` · Can I change an invoice after sending it? | If the customer has not paid or recorded it, correct the invoice, send it again with the same number, and say that it replaces the first one. If it is already paid or in their books, do not edit it. Issue a credit note for the difference, or a new invoice for anything extra. | credit note explained |
| 8 | `does-a-receipt-need-a-signature-or-stamp` · Does a receipt need a signature or stamp? | A receipt does not need a rubber stamp to be useful. What matters is that it shows who paid, how much, the date, what the payment was for and who received it. A signature, or the name of the person who received the money, adds trust, and many Nigerian customers expect one. | receipt template |
| 9 | `what-does-being-payment-for-mean` · What does "being payment for" mean on a receipt? | "Being payment for" is the line on a receipt that says what the money was for. Write the item or service, and the invoice number if there is one, for example "Being payment for 3 bridal makeup sessions, invoice 0042". If it is a part payment, say so and state the balance. | receipt template |
| 10 | `customer-lost-their-receipt` · What if a customer loses their receipt? | Send it again. A receipt is a record, so a copy is as good as the first one when the number, date and amount are the same. Mark a reprinted paper copy "Copy". This is one reason digital receipts are safer than a booklet: the link still opens. | receipt book vs digital receipts |
| 11 | `can-i-use-my-personal-bank-account-on-an-invoice` · Can I use my personal bank account on an invoice? | Yes, if you trade in your own name. Use the exact account name your bank shows, because customers check it before they pay. If you invoice under a business name, an account in that name looks more trustworthy, and some companies insist on it. | how to invoice a company |
| 12 | `can-i-issue-an-invoice-without-cac-registration` `[VERIFY]` · Can I issue an invoice without CAC registration? | You can invoice in your own personal name without registering a business. If you trade under a business name, Nigerian law expects that name to be registered with the Corporate Affairs Commission (CAC), and many companies will only pay a registered business. Put the same name on the invoice that is on your bank account. | how to invoice a company |
| 13 | `do-i-need-a-tin-on-my-invoice` `[VERIFY]` · Do I need a TIN on my invoice? | Not on every invoice. A Tax Identification Number (TIN) matters when you charge VAT, when you invoice a company or a government office, or when the customer deducts withholding tax. In those cases, put your TIN on the invoice. | VAT on invoices |
| 14 | `should-i-charge-vat-as-a-small-business` `[VERIFY]` · Should I charge VAT as a small business? | Only if your business is required to register for VAT. The rate is 7.5%. Small businesses below the legal turnover limit do not charge it. That limit changed with the tax laws that began in January 2026, so confirm the current figure with the Nigeria Revenue Service or an accountant before you add VAT to your invoices. | VAT on invoices |
| 15 | `why-did-my-client-pay-less-than-my-invoice` `[VERIFY]` · Why did my client pay less than my invoice? | If a company paid a few percent less than your invoice, it probably deducted withholding tax. The company pays that money to the tax authority in your name, and it counts as tax you have already paid. Ask the company for the withholding tax credit note or receipt as proof. | withholding tax guide |
| 16 | `how-long-should-i-keep-invoices` `[VERIFY]` · How long should I keep invoices and receipts? | Keep copies of your invoices and receipts for at least six years. Nigerian law expects businesses to keep their records for that long, and customers sometimes come back with questions years later. Digital copies with a backup are easier to keep than paper booklets. | how to number your invoices |
| 17 | `is-there-a-free-invoice-app-in-nigeria` · Is there a free invoice app in Nigeria? | Yes. Aurum Invoice Studio has a free plan: 5 documents a month, such as invoices, receipts and quotations, at no cost. Paid plans start at ₦3,000 a month if you need more. Excel and Word templates are also free, and Aurum offers those as downloads. | free invoice generator page |
| 18 | `can-an-invoice-app-work-without-internet` · Can an invoice app work without internet? | Some can. Aurum Invoice Studio installs on your phone and lets you create invoices, receipts and quotations with no data. You need a connection only to send the link, back up, or sign in on a new phone. | invoice app page |

Answer 17 and 18 ship with Phase A wording, so they go live with or after subscriptions. Answer 15 goes live only when guide 5 (withholding tax) exists; until then "Read more" points to the VAT guide.

## 5. "In short" boxes for the live guides (Phase B)
A highlighted box directly under the H1, 40 to 60 words, answering the page's main question. Exact text for the definitional guides:

| Guide | "In short" text |
|---|---|
| how-to-write-an-invoice-in-nigeria | An invoice needs ten things: your business name and contact, the customer's name, an invoice number, the date, a due date, each item with its price, the total, any deposit paid, your bank details and your terms. Send it as soon as the price is agreed. |
| invoice-template-nigeria | A good invoice template has your logo and details at the top, the customer and invoice number, a table of items with prices, the total, and your bank details and terms at the bottom. You can copy the layout below or download it free in Excel or Word. |
| receipt-template-nigeria | A receipt confirms that money was received. It shows who paid, the amount in figures and words, the date, what the payment was for, how it was paid and who received it. Issue it as soon as the money arrives. |
| quotation-template-nigeria | A quotation tells a customer what a job will cost before they agree. It lists the items and prices, how long the price is valid, the deposit needed to begin and the delivery time. When the customer accepts, it becomes the basis of your invoice. |
| invoice-vs-receipt-vs-quotation | A quotation is the price you offer before the job. An invoice is the request for payment once the job is agreed or done. A receipt is the proof that payment was received. Most jobs use all three, in that order. |
| proforma-invoice-nigeria | A proforma invoice is an advance invoice: it shows exactly what the final invoice will say, before the goods are supplied. Customers use it to get approval or to pay in advance. It is not a demand for payment and is not entered in the accounts as a sale. |
| delivery-note-vs-invoice | A delivery note, often called a waybill in Nigeria, goes with the goods and lists what was delivered, with no prices. An invoice asks for payment and shows prices. The customer signs the delivery note to confirm the goods arrived. |
| credit-note-nigeria | A credit note reduces what a customer owes you. You issue one when goods are returned, when an invoice was too high, or when you give a discount after invoicing. It refers to the original invoice and is settled by refund or by credit against the next purchase. |
| purchase-order-explained | A purchase order, often called an LPO in Nigeria, is the buyer's written order to a supplier. It states what is being bought, the agreed price and when it should be delivered. The supplier delivers, then sends an invoice quoting the order number. |
| invoice-number-format-nigeria | Number your invoices in one unbroken sequence and never reuse a number. A simple format is a prefix, the year and a running number, such as INV-2026-0042. Any format works if it is consistent and every number can be found again. |
| deposit-and-part-payment-invoice | Show the full price on the invoice, then the deposit paid and the balance still owed. Issue a receipt for each payment as it arrives, and state the remaining balance on every receipt until it reaches zero. |
| late-payment-fee-and-payment-terms | Payment terms say when the money is due, for example "Payment due within 7 days". A late fee only works if it was written on the quotation or invoice before the customer agreed. Keep the terms short, and state them on every invoice. |

For the other 13 guides (the trade guides and the remaining how-to guides), the builder writes the box from that guide's own existing first section: copy its main point, do not add new facts. `/guides/vat-on-invoices-nigeria/` gets its box only after the accountant's check.

## 6. Glossary (`/glossary/`), Phase B
- **Title:** Invoice Terms Explained: A Simple Glossary for Nigeria
- **Description:** Plain meanings of invoice, receipt, quotation, proforma, waybill, LPO, credit note, VAT, TIN and other business terms used in Nigeria.
- **H1:** Invoice and receipt terms, explained simply
- One page. Each term is an `<h2>` with an `id` (so it can be linked as `/glossary/#waybill`), the definition, and a link to the fuller page where one exists.

| Term | Definition (exact) |
|---|---|
| Amount in words | The amount written out in full, such as "Fifty thousand naira only". Receipts and cheques use it to prevent the figure being changed. |
| Balance | What is still owed after a deposit or part payment. |
| Bill | Another word for an invoice, used by the person who has to pay it. |
| CAC | The Corporate Affairs Commission, the office that registers companies and business names in Nigeria. |
| Credit note | A document that reduces what a customer owes, used for returns, mistakes or discounts given after invoicing. |
| Delivery note | A list of goods delivered, with quantities and no prices, signed by the person who receives them. Often called a waybill in Nigeria. |
| Deposit | A part of the price paid before work starts or goods are ordered. |
| Discount | An amount taken off the price, shown as a percentage or a figure. |
| Due date | The date by which an invoice should be paid. |
| Estimate | A rough price given before the details are known. A quotation is firmer than an estimate. |
| Invoice | A request for payment that lists what was supplied, the price and when payment is due. |
| Invoice number | The unique number that identifies one invoice. Numbers run in sequence and are never reused. |
| Late fee | An extra charge for paying after the due date. It applies only if the customer agreed to it beforehand. |
| LPO | Local Purchase Order. A buyer's written order to a supplier at an agreed price. The same thing as a purchase order. |
| Milestone payment | A payment that becomes due when an agreed stage of a job is finished. |
| Net 7, Net 14, Net 30 | Payment terms meaning the invoice is due 7, 14 or 30 days after its date. |
| Paid stamp | The "Paid" mark placed on an invoice or receipt once the money has been received. |
| Part payment | A payment of some, but not all, of the amount owed. |
| Payment terms | The rules for payment written on a quotation or invoice: when it is due, how to pay, and any deposit or late fee. |
| Proforma invoice | An advance copy of an invoice, sent before the goods are supplied so the customer can approve or pay in advance. |
| Purchase order | A buyer's written order to a supplier. Called an LPO in Nigeria. |
| Quotation | A firm price offered to a customer before they agree to buy, usually valid for a set number of days. Also called a quote. |
| Receipt | Proof that a payment was received, showing who paid, how much, when and what for. |
| Retainer | A fixed amount paid regularly, usually monthly, for ongoing work. |
| Statement of account | A list of all a customer's invoices and payments over a period, showing what they still owe. |
| Subtotal | The total of all items before discount, delivery and VAT are applied. |
| TIN | Tax Identification Number. The number that identifies a person or business to the tax authority. `[VERIFY]` wording against the current official name |
| VAT | Value Added Tax. A tax added to the price of most goods and services by businesses that are registered to charge it. In Nigeria the rate is 7.5%. `[VERIFY]` |
| Waybill | The note that travels with goods being delivered, listing what was sent and who should receive it. The Nigerian name for a delivery note. |
| Withholding tax (WHT) | Tax a customer deducts from your payment and pays to the tax authority in your name. It counts as tax you have already paid. `[VERIFY]` |

## 7. The accountant's checklist (`[VERIFY]` items in one place)
Ask an accountant to confirm each of these against the law as it stands on the day of publishing. Nigeria's tax laws changed in January 2026.

1. The VAT rate (stated as 7.5%).
2. Which small businesses do not charge VAT, and the current turnover limit. *(The plan deliberately gives no figure.)*
3. Whether a VAT invoice must show the seller's TIN, and what else it must show.
4. The current name of the tax authority and of the tax number (the plan says "Nigeria Revenue Service" and "TIN").
5. Withholding tax: that it is deducted by the paying company, counts as tax already paid, and that a credit note or receipt is issued. Current rates, and any exemption for small businesses.
6. Record keeping: that business records should be kept for at least six years.
7. Business names: that trading under a business name requires CAC registration, while invoicing in one's personal name does not.
8. E-invoicing: who must use the government system today, the dates for smaller businesses, and the official name of the system.
9. Small claims court: where it exists, the claim limit, and the steps (guide 6).
10. Car sales: what besides a receipt is needed to transfer ownership (guide 8).
11. The whole live guide `/guides/vat-on-invoices-nigeria/`.

If an item cannot be confirmed, the page says less, not more: remove the specific claim and keep "confirm with an accountant".
