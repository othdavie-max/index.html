# Guides 1-8. Plain language, Nigerian context, no invented statistics or legal claims.
def script(label, text): return f'<div class="script"><small>{label}</small>{text}</div>'
def callout(text): return f'<div class="callout">{text}</div>'

TAX_NOTE = callout("<b>About tax.</b> Tax rules for small businesses in Nigeria changed with the 2025 tax reforms, and they depend on your business type and turnover. This guide is general information, not tax advice. Confirm your own situation with a registered accountant or the tax authority (FIRS, now moving to the Nigeria Revenue Service).")

G1 = dict(
    slug="how-to-write-an-invoice-in-nigeria", nav="How to write an invoice in Nigeria",
    title="How to Write an Invoice in Nigeria (Step by Step)",
    desc="What to put on an invoice in Nigeria: the 10 details every invoice needs, a worked example, and mistakes that make customers pay late.",
    h1="How to write an invoice in Nigeria: step by step",
    intro="An invoice is your written request for payment. A clear one gets you paid faster and protects you if a customer disputes the price later. Here is exactly what to put on it, in the order customers expect to see it.",
    sections=[
        ("What an invoice is, and when to send one", "<p>An invoice tells a customer what they bought, how much they owe, and how to pay you. You send it <b>before or at the time</b> payment is due. It is not proof that you were paid. That is a receipt (see our guide on <a href=\"/guides/invoice-vs-receipt-vs-quotation/\">invoice vs receipt vs quotation</a>).</p><p>Send an invoice any time you sell on credit, take a deposit, finish a job, or just want a clean record. Even if the customer pays on the spot by transfer, an invoice makes you look organised and gives both of you something to refer to.</p>"),
        ("The 10 things every invoice should have", "<ol><li><b>The word &quot;Invoice&quot;</b> at the top, so nobody mistakes it for a receipt or a price quote.</li><li><b>Your business name</b>, address, phone number and email. Add your logo if you have one.</li><li><b>Your CAC (RC) number</b>, if your business is registered, and your <b>TIN</b> if you have one.</li><li><b>The customer's name</b> and contact details (their business name if they are a company).</li><li><b>An invoice number</b>, in a simple running order, like INV-0001, INV-0002. Never reuse a number.</li><li><b>The invoice date</b> and, if it is not due immediately, the <b>due date</b>.</li><li><b>A line for each item or service</b>: description, quantity, unit price and line total.</li><li><b>The totals</b>: subtotal, any discount, delivery or VAT if it applies, and the <b>amount due</b>.</li><li><b>How to pay</b>: bank name, account name and account number. Make sure the account name matches your business name.</li><li><b>Terms</b>: when payment is due, what a deposit covers, and your return or refund rule in one short line.</li></ol>"),
        ("A worked example", """<div class="doc"><h4>Invoice INV-0042</h4><p><b>Sample Couture Ltd</b> &middot; 14B Example Way, Lekki, Lagos &middot; RC 1234567</p><p>Billed to: <b>Mrs. Funmi Bakare</b> &middot; Date: 12 Nov 2026 &middot; Due: 26 Nov 2026</p>
<table class="ex"><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr>
<tr><td>Bespoke lace gown</td><td class="r">1</td><td class="r">₦385,000</td><td class="r">₦385,000</td></tr>
<tr><td>Aso-ebi outfit</td><td class="r">3</td><td class="r">₦25,000</td><td class="r">₦75,000</td></tr>
<tr><td>Delivery (Lagos)</td><td class="r">1</td><td class="r">₦5,000</td><td class="r">₦5,000</td></tr>
<tr><td colspan="3"><b>Total</b></td><td class="r"><b>₦465,000</b></td></tr>
<tr><td colspan="3">Deposit paid</td><td class="r">₦150,000</td></tr>
<tr><td colspan="3"><b>Balance due</b></td><td class="r"><b>₦315,000</b></td></tr></table>
<p>Pay to: GTBank &middot; Sample Couture Ltd &middot; 0123456789</p></div><p>This is sample data only. The point is the layout: the balance due is easy to find, and the payment details sit right under it.</p>"""),
        ("Mistakes that make customers pay late", "<ul><li><b>No due date.</b> &quot;Pay soon&quot; means nothing. Write a date.</li><li><b>A vague description.</b> &quot;Services: ₦200,000&quot; invites questions. List what was done.</li><li><b>Hiding the account details</b> in a long message. Put them on the invoice itself.</li><li><b>Sending it as a plain chat message.</b> A typed list of prices in WhatsApp looks informal and is easy to lose. A proper document, or a private link, looks trustworthy.</li><li><b>Forgetting to follow up.</b> Most late payment is forgetfulness, not refusal. See our <a href=\"/guides/payment-reminder-messages-nigeria/\">payment reminder messages</a>.</li></ul>"),
        ("Do you need to charge VAT?", "<p>It depends on your business. If VAT applies to you, show it as its own line so the customer can see the amount. If you are not sure, ask an accountant before you issue invoices. We explain the basics in <a href=\"/guides/vat-on-invoices-nigeria/\">VAT on invoices in Nigeria</a>.</p>" + TAX_NOTE),
        ("Making invoices quickly", "<p>You can write an invoice in Word, Excel or a notes app, but that gets slow and inconsistent once you have more than a few customers. An invoicing app fills in your details automatically, remembers your customers and prices, and keeps a record. <a href=\"/invoice-app-nigeria/\">Aurum</a> is built for this, with your logo and bank details already on every document.</p>"),
    ],
    faq=[("Is a handwritten invoice valid in Nigeria?", "A handwritten invoice can serve as a record, but a typed or printed one with all the details above is easier to read and looks more professional. Many companies also require a clear, typed invoice before they will pay."),
         ("Do I need a CAC number to issue an invoice?", "No. You can invoice without being registered, but if you have a CAC (RC) number, putting it on the invoice builds trust, especially with companies."),
         ("What is the difference between an invoice and a receipt?", "An invoice asks for payment. A receipt confirms that payment was made. You usually send an invoice first, then a receipt once the customer has paid."),
         ("How long should I keep invoices?", "Keep copies for several years. Ask your accountant how long applies to your business, as record-keeping rules can differ.")],
    related=["invoice-template-nigeria", "invoice-vs-receipt-vs-quotation", "how-to-get-paid-on-time-nigeria", "vat-on-invoices-nigeria", "invoice-app-nigeria"])

G2 = dict(
    slug="invoice-template-nigeria", nav="Invoice template for Nigeria",
    title="Free Invoice Template for Nigeria (Copy and Use)",
    desc="A simple invoice template you can copy for your Nigerian business, with every field explained, plus tips to make it look professional.",
    h1="Free invoice template for Nigerian businesses",
    intro="Here is a clean invoice layout you can copy into Word, Google Docs or Excel today. Below it you will find what each part is for, and how to make it look more professional.",
    sections=[
        ("The template", """<div class="doc"><h4>INVOICE</h4>
<p><b>[Your business name]</b><br>[Address] &middot; [Phone] &middot; [Email]<br>RC: [CAC number, if registered] &middot; TIN: [if you have one]</p>
<p><b>Invoice no:</b> INV-0001 &nbsp; <b>Date:</b> [DD/MM/YYYY] &nbsp; <b>Due:</b> [DD/MM/YYYY]</p>
<p><b>Bill to:</b> [Customer name]<br>[Phone / email / address]</p>
<table class="ex"><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
<tr><td>[Item or service]</td><td class="r">[ ]</td><td class="r">₦[ ]</td><td class="r">₦[ ]</td></tr>
<tr><td>[Item or service]</td><td class="r">[ ]</td><td class="r">₦[ ]</td><td class="r">₦[ ]</td></tr>
<tr><td colspan="3">Subtotal</td><td class="r">₦[ ]</td></tr>
<tr><td colspan="3">Discount / Delivery / VAT (if any)</td><td class="r">₦[ ]</td></tr>
<tr><td colspan="3"><b>Amount due</b></td><td class="r"><b>₦[ ]</b></td></tr></table>
<p><b>Pay to:</b> [Bank] &middot; [Account name] &middot; [Account number]</p>
<p><b>Terms:</b> Payment due by [date]. [Deposit / refund note.] Thank you for your business.</p></div>"""),
        ("How to use it", "<ol><li>Copy the layout into Word, Google Docs or Excel and save it as a template.</li><li>Fill in your details once, then change only the customer, items and totals each time.</li><li>Number each invoice in order, and save a copy of every one.</li><li>Export to PDF before you send it, so nobody can change the figures by accident.</li></ol>"),
        ("What each part is for", "<ul><li><b>Invoice number:</b> lets you and the customer refer to the same document. It also stops duplicates.</li><li><b>Due date:</b> turns &quot;please pay&quot; into a clear deadline.</li><li><b>Item lines:</b> proof of exactly what was agreed. This prevents &quot;I did not order that&quot; arguments.</li><li><b>Amount due:</b> make it the biggest number on the page.</li><li><b>Pay to:</b> keep your account name the same as the name on the invoice. Customers get nervous when the two do not match.</li></ul>"),
        ("Making it look professional", "<p>Details that make a template feel premium: your logo at the top, one or two brand colours, a signature or stamp at the bottom, and a short thank-you line. Use a clean font and plenty of white space. Avoid clip art and more than two fonts.</p><p>If you want this without the layout work, a tool like <a href=\"/invoice-app-nigeria/\">Aurum</a> gives you ready-made designs with your logo, signature and bank details already filled in, and it can deliver the invoice as a private link instead of a plain file.</p>"),
        ("Template or app?", "<p>A template is free and fine for a handful of invoices a month. Once you are sending several a week, the copying, renumbering and retyping becomes the slow part. That is when an app pays for itself in saved time.</p>"),
    ],
    faq=[("Can I use this template for free?", "Yes. Copy the layout and use it for your own business. There is nothing to download or sign up for."),
         ("Should I send the invoice as PDF or image?", "PDF is best, because it keeps the layout and cannot be edited easily. If the customer only uses WhatsApp, an image works too, but a PDF looks more professional."),
         ("Do I need to put VAT on this template?", "Only if VAT applies to your business. If it does, add it as its own line. See our guide on VAT on invoices in Nigeria.")],
    related=["how-to-write-an-invoice-in-nigeria", "receipt-template-nigeria", "quotation-template-nigeria", "invoice-app-nigeria"])

G3 = dict(
    slug="receipt-template-nigeria", nav="Receipt template for Nigeria",
    title="Receipt Template for Nigeria: What to Include",
    desc="A simple payment receipt template for Nigerian businesses, what a receipt must show, and how it differs from an invoice.",
    h1="Receipt template for Nigerian businesses",
    intro="A receipt is proof that a customer paid you. It protects both sides: the customer can show they paid, and you have a record of what you received. Here is a clear template and what it must contain.",
    sections=[
        ("The template", """<div class="doc"><h4>RECEIPT</h4>
<p><b>[Your business name]</b><br>[Address] &middot; [Phone] &middot; [Email]</p>
<p><b>Receipt no:</b> RCT-0001 &nbsp; <b>Date:</b> [DD/MM/YYYY]</p>
<p><b>Received from:</b> [Customer name]</p>
<p><b>Amount received:</b> ₦[ ] ([amount in words])</p>
<p><b>Payment for:</b> [Invoice number or description]</p>
<p><b>Payment method:</b> [Bank transfer / Cash / POS / Card] &nbsp; <b>Reference:</b> [transfer reference, optional]</p>
<p><b>Balance remaining:</b> ₦[ ] (or &quot;Paid in full&quot;)</p>
<p>Signed: ____________ &nbsp; Thank you.</p></div>"""),
        ("What a receipt must show", "<ul><li>The word <b>Receipt</b> and a receipt number.</li><li>The <b>date</b> you received the money.</li><li>Who paid and who received it.</li><li>The <b>exact amount</b>, ideally also in words, to avoid arguments.</li><li>What the payment was <b>for</b>, such as an invoice number.</li><li>The <b>payment method</b>, and the transfer reference if it was a bank transfer.</li><li>Any <b>balance still owed</b>, if the customer only paid part.</li></ul>"),
        ("Part payments and deposits", "<p>If a customer pays a deposit, issue a receipt for the deposit and show the balance still due. When they pay the rest, issue a second receipt. Each receipt should refer to the same invoice number so the record is easy to follow. We cover this in <a href=\"/guides/deposit-and-part-payment-invoice/\">deposits and part payments</a>.</p>"),
        ("Check the money before you issue the receipt", "<p>Fake transfer alerts and edited bank screenshots are a real problem for sellers in Nigeria. Always confirm the money in <b>your own bank app or account statement</b>, not from a screenshot the customer sends. Issue the receipt only after you see the funds.</p>"),
        ("Receipts that look the part", "<p>A receipt with your logo, a signature and a clear &quot;Paid&quot; mark builds trust and gets saved by customers. With <a href=\"/receipt-maker-nigeria/\">Aurum</a>, you can turn a paid invoice into a receipt in one tap, and the invoice updates itself.</p>"),
    ],
    faq=[("Is a receipt the same as an invoice?", "No. An invoice asks for payment. A receipt confirms payment was received. See our guide on invoice vs receipt vs quotation."),
         ("Do I have to give a receipt for every payment?", "It is good practice to give one, and customers and companies often ask for it. Ask your accountant about requirements for your business."),
         ("Can I issue a receipt for a bank transfer?", "Yes. Include the transfer reference and the date. Only issue it after you have confirmed the money in your own account.")],
    related=["invoice-vs-receipt-vs-quotation", "invoice-template-nigeria", "deposit-and-part-payment-invoice", "receipt-maker-nigeria"])

G4 = dict(
    slug="quotation-template-nigeria", nav="Quotation template for Nigeria",
    title="Quotation Template for Nigeria (with Example)",
    desc="How to write a price quotation in Nigeria, a copyable template, and how to turn an accepted quote into an invoice.",
    h1="Quotation template for Nigerian businesses",
    intro="A quotation tells a customer what you will charge before any work or sale happens. A clear one wins trust, avoids price arguments, and turns into an invoice once the customer says yes.",
    sections=[
        ("The template", """<div class="doc"><h4>QUOTATION</h4>
<p><b>[Your business name]</b><br>[Address] &middot; [Phone] &middot; [Email]</p>
<p><b>Quote no:</b> QUO-0001 &nbsp; <b>Date:</b> [DD/MM/YYYY] &nbsp; <b>Valid until:</b> [DD/MM/YYYY]</p>
<p><b>Prepared for:</b> [Customer name]</p>
<table class="ex"><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
<tr><td>[Item or service]</td><td class="r">[ ]</td><td class="r">₦[ ]</td><td class="r">₦[ ]</td></tr>
<tr><td>[Item or service]</td><td class="r">[ ]</td><td class="r">₦[ ]</td><td class="r">₦[ ]</td></tr>
<tr><td colspan="3"><b>Total estimate</b></td><td class="r"><b>₦[ ]</b></td></tr></table>
<p><b>Deposit to start:</b> ₦[ ] ([ ]%) &nbsp; <b>Timeline:</b> [ ] days</p>
<p><b>To accept:</b> reply &quot;Accepted&quot; or sign below. Signed: ____________</p></div>"""),
        ("What makes a good quotation", "<ul><li><b>A valid-until date.</b> Prices change. A quote should not last forever.</li><li><b>Itemised prices.</b> Customers trust a breakdown more than one lump sum.</li><li><b>What is included, and what is not.</b> Say if delivery, installation or materials are extra.</li><li><b>A timeline</b> for when you can deliver.</li><li><b>The deposit you need to start</b>, so there is no awkward conversation later.</li><li><b>A clear way to accept.</b> A signature or a written &quot;yes&quot;.</li></ul>"),
        ("Quotation, estimate or proforma?", "<p>These are close cousins. A <b>quotation</b> is a firm price offer. An <b>estimate</b> is a best guess that may change. A <b>proforma invoice</b> is a preliminary invoice sent before the sale is complete, often for the customer to arrange payment. See our guide on <a href=\"/guides/proforma-invoice-nigeria/\">proforma invoices</a>.</p>"),
        ("From quote to invoice", "<p>Once the customer accepts, copy the same line items into an invoice with a new invoice number, and reference the quote number. This keeps the price exactly as agreed. In <a href=\"/quotation-maker-nigeria/\">Aurum</a>, an accepted quotation becomes an invoice in one tap, with nothing retyped.</p>"),
        ("Sending it so it gets accepted", "<p>Reply fast, send it as a clean PDF or a private link, and follow up politely after a day or two if you hear nothing. A quote that looks premium is also easier to say yes to, because it signals you are serious.</p>"),
    ],
    faq=[("How long should a quotation be valid?", "Seven to thirty days is common, depending on how quickly your costs change. State the date clearly on the quote."),
         ("Can a customer hold me to my quotation?", "A clear, accepted quotation is a record of what you both agreed. Keep a copy and put key terms in writing. Ask a lawyer if you need legal advice on a specific contract."),
         ("Should I ask for a deposit on a quotation?", "For custom work or large orders, yes. It shows the customer is serious and covers your first costs.")],
    related=["proforma-invoice-nigeria", "invoice-vs-receipt-vs-quotation", "deposit-and-part-payment-invoice", "quotation-maker-nigeria"])

G5 = dict(
    slug="invoice-vs-receipt-vs-quotation", nav="Invoice vs receipt vs quotation",
    title="Invoice vs Receipt vs Quotation: The Difference",
    desc="Invoice, receipt, quotation, proforma and delivery note explained in plain language, with when to use each one in your business.",
    h1="Invoice vs receipt vs quotation: what is the difference?",
    intro="Business owners often mix these up. Each one has a different job, and sending the right one at the right time keeps you organised and looking professional.",
    sections=[
        ("The quick answer", "<ul><li><b>Quotation:</b> &quot;This is what it will cost.&quot; Sent <i>before</i> the sale.</li><li><b>Invoice:</b> &quot;Please pay this amount.&quot; Sent <i>when payment is due</i>.</li><li><b>Receipt:</b> &quot;We confirm you paid.&quot; Sent <i>after payment</i>.</li></ul><p>The usual order is quotation, then invoice, then receipt.</p>"),
        ("Quotation", "<p>A price offer. It lists what you will provide and the total cost, usually with a valid-until date. It is <b>not</b> a request for payment. Learn more in our <a href=\"/guides/quotation-template-nigeria/\">quotation template guide</a>.</p>"),
        ("Invoice", "<p>A request for payment. It lists what the customer bought, the amount due, the due date and how to pay. See <a href=\"/guides/how-to-write-an-invoice-in-nigeria/\">how to write an invoice in Nigeria</a>.</p>"),
        ("Receipt", "<p>Proof that payment was received. It shows the amount, the date and what the payment was for. See our <a href=\"/guides/receipt-template-nigeria/\">receipt template</a>.</p>"),
        ("Other documents you may meet", "<ul><li><b>Proforma invoice:</b> a preliminary invoice sent before delivery, often used so the customer can arrange payment. See <a href=\"/guides/proforma-invoice-nigeria/\">proforma invoices</a>.</li><li><b>Delivery note:</b> lists what was delivered, signed by the person who received it. See <a href=\"/guides/delivery-note-vs-invoice/\">delivery note vs invoice</a>.</li><li><b>Credit note:</b> reduces what a customer owes, such as for a return. See <a href=\"/guides/credit-note-nigeria/\">credit notes</a>.</li><li><b>Purchase order:</b> a document a <i>buyer</i> sends to order from you. See <a href=\"/guides/purchase-order-explained/\">purchase orders</a>.</li></ul>"),
        ("A simple example", "<p>A caterer is asked to cook for an event. She sends a <b>quotation</b> for ₦300,000. The client accepts and pays a deposit, so she sends an <b>invoice</b> showing a ₦150,000 balance and issues a <b>receipt</b> for the deposit. After the event, the client pays the balance, and she sends a final <b>receipt</b> marked paid in full.</p>"),
        ("Keeping it all in one place", "<p><a href=\"/invoice-app-nigeria/\">Aurum</a> makes all of these documents in one app, with your logo, signature and bank details already filled in, so you do not need separate templates.</p>"),
    ],
    faq=[("Can I send an invoice without a quotation?", "Yes. A quotation is optional, and mostly useful when the price needs the customer's agreement before work starts."),
         ("Is a receipt required by law?", "Customers and companies commonly expect receipts, and keeping records is good practice. Ask an accountant what applies to your business."),
         ("What comes first, invoice or receipt?", "The invoice comes first, asking for payment. The receipt comes after, confirming the money arrived.")],
    related=["how-to-write-an-invoice-in-nigeria", "quotation-template-nigeria", "receipt-template-nigeria", "proforma-invoice-nigeria"])

G6 = dict(
    slug="proforma-invoice-nigeria", nav="Proforma invoice in Nigeria",
    title="Proforma Invoice in Nigeria: Meaning and Template",
    desc="What a proforma invoice is, when to use one in Nigeria, how it differs from a normal invoice, and a template you can copy.",
    h1="Proforma invoice in Nigeria: what it is and when to use it",
    intro="A proforma invoice is a preliminary invoice you send <i>before</i> goods are delivered or work is done. It lets the customer see the cost, arrange payment or documents, and confirm the order.",
    sections=[
        ("What a proforma invoice means", "<p>&quot;Pro forma&quot; means &quot;for the sake of form&quot;. It looks like an invoice, but it is an advance document, a statement of what you intend to charge. It is usually <b>not</b> your final request for payment. After the sale is complete you issue the real invoice.</p>"),
        ("When to use one", "<ul><li>When a customer needs a price document to <b>raise funds</b> or get approval before paying.</li><li>When you are quoting for <b>imports or exports</b>, where customs or banks ask for one.</li><li>When you want to <b>confirm an order and price</b> before you buy stock or start production.</li><li>When you take a <b>deposit</b> before the full invoice is ready.</li></ul>"),
        ("Proforma invoice vs quotation vs invoice", "<ul><li><b>Quotation:</b> a price offer. The customer may or may not accept.</li><li><b>Proforma invoice:</b> a pre-sale invoice, usually after the customer has shown clear intent to buy.</li><li><b>Invoice:</b> the final request for payment after delivery or completion.</li></ul><p>More on the differences in <a href=\"/guides/invoice-vs-receipt-vs-quotation/\">invoice vs receipt vs quotation</a>.</p>"),
        ("Template", """<div class="doc"><h4>PROFORMA INVOICE</h4>
<p><b>[Your business name]</b> &middot; [Address] &middot; [Phone] &middot; [Email]</p>
<p><b>Proforma no:</b> PRO-0001 &nbsp; <b>Date:</b> [DD/MM/YYYY] &nbsp; <b>Valid until:</b> [DD/MM/YYYY]</p>
<p><b>Customer:</b> [Name and address]</p>
<table class="ex"><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
<tr><td>[Item]</td><td class="r">[ ]</td><td class="r">₦[ ]</td><td class="r">₦[ ]</td></tr>
<tr><td colspan="3"><b>Total</b></td><td class="r"><b>₦[ ]</b></td></tr></table>
<p><b>Payment terms:</b> [e.g. 50% before production, balance on delivery]. <b>Delivery time:</b> [ ] days.</p>
<p><i>This is a proforma invoice. It is not a demand for payment and is not a tax invoice.</i></p></div>"""),
        ("Things to get right", "<ul><li>Mark it clearly as <b>Proforma</b> so no one mistakes it for a final invoice.</li><li>Give it its own numbering, such as PRO-0001.</li><li>State how long the prices are valid.</li><li>Do not count it as income until you issue the real invoice and are paid. Ask your accountant how to record it.</li></ul>"),
    ],
    faq=[("Is a proforma invoice legally binding?", "Usually not on its own. It is a statement of expected charges. A signed order or accepted quotation carries more weight. Ask a lawyer about specific contracts."),
         ("Can a customer pay against a proforma invoice?", "Yes, many do, especially for deposits. Issue a receipt when the money arrives, and a final invoice when the sale is complete."),
         ("Is a proforma invoice the same as a quotation?", "They are similar, but a proforma looks like an invoice and is usually sent once the customer has decided to buy.")],
    related=["quotation-template-nigeria", "invoice-vs-receipt-vs-quotation", "deposit-and-part-payment-invoice", "invoice-app-nigeria"])

G7 = dict(
    slug="payment-reminder-messages-nigeria", nav="Payment reminder messages",
    title="Payment Reminder Messages for Customers (WhatsApp Scripts)",
    desc="Polite, ready-to-send payment reminder messages for WhatsApp in Nigeria: first reminder, due-today, overdue, and final notice.",
    h1="Payment reminder messages that get customers to pay",
    intro="Chasing a customer for money feels awkward, so many business owners wait too long. These messages are polite, clear and easy to copy. Pick the one that fits and change the details in brackets.",
    sections=[
        ("Before you send a reminder", "<ul><li>Send the <b>invoice number and amount</b>, so they do not have to search.</li><li>Include your <b>account details</b> again. Do not make them scroll for it.</li><li>Stay polite. Most late payment is simply forgetfulness.</li><li>Send reminders in the <b>morning</b>, when people are more likely to act.</li></ul>"),
        ("A gentle reminder (a few days before the due date)", script("Gentle reminder", "Good morning [Name], I hope you are well. Just a quick reminder that invoice [INV-0042] for ₦[amount] is due on [date]. You can view it here: [link]. Thank you!")),
        ("Due today", script("Due today", "Hello [Name], a friendly note that invoice [INV-0042] for ₦[amount] is due today. Payment details: [Bank] · [Account name] · [Account number]. Kindly send the proof of payment once done. Thank you for your business.")),
        ("A few days overdue", script("Overdue", "Hello [Name], I hope all is well. Our records show invoice [INV-0042] (₦[amount]) was due on [date] and is still open. If you have already paid, please send the details so I can update my records. If not, could you kindly settle it by [date]? Thank you.")),
        ("Firmer, still polite (a week or more overdue)", script("Firm reminder", "Hello [Name], I am following up on invoice [INV-0042] for ₦[amount], now [X] days overdue. Please let me know when I can expect payment, or if there is a problem I can help resolve. I would like to settle this by [date].")),
        ("Final notice", script("Final notice", "Dear [Name], this is a final reminder that invoice [INV-0042] for ₦[amount] remains unpaid. Please pay by [date] to avoid [late fee / pause in service / next steps]. If you need to discuss a payment plan, reply today. Thank you.")),
        ("When you want to offer a payment plan", script("Payment plan", "Hello [Name], I understand things can be tight. If it helps, we can split invoice [INV-0042] into [2/3] parts: ₦[x] by [date], then ₦[y] by [date]. Let me know and I will confirm it in writing.")),
        ("Make reminders automatic", "<p>Typing these by hand every time takes effort. <a href=\"/invoice-app-nigeria/\">Aurum</a> shows you who still owes you and writes a polite WhatsApp reminder in one tap, with the invoice link already inside.</p>"),
    ],
    faq=[("How soon should I remind a customer?", "A few days before the due date is polite and effective, then on the due date, then a few days after. Do not wait weeks."),
         ("Is it rude to remind a customer about payment?", "No. A courteous reminder is normal in business, and most customers appreciate it."),
         ("Should I charge a late fee?", "Only if you agreed it in writing beforehand, for example in your terms. Mention it on the invoice.")],
    related=["how-to-get-paid-on-time-nigeria", "how-to-send-an-invoice-on-whatsapp", "how-to-write-an-invoice-in-nigeria", "invoice-app-nigeria"])

G8 = dict(
    slug="how-to-get-paid-on-time-nigeria", nav="How to get paid on time",
    title="How to Get Customers to Pay On Time in Nigeria",
    desc="Practical ways Nigerian small businesses can stop chasing money: deposits, clear invoices, due dates, easy payment and polite follow-up.",
    h1="How to get customers to pay on time in Nigeria",
    intro="Late payment hurts cash flow, especially for small businesses. You cannot control every customer, but you can make paying on time easy and chasing rare. These habits do most of the work.",
    sections=[
        ("Take a deposit before you start", "<p>For custom work, orders and bookings, ask for a deposit upfront (30% to 50% is common). It protects you if the customer disappears, and it makes them commit. See <a href=\"/guides/deposit-and-part-payment-invoice/\">deposits and part payments</a>.</p>"),
        ("Agree the price in writing", "<p>Most payment arguments start with &quot;that is not what we agreed&quot;. A <a href=\"/guides/quotation-template-nigeria/\">written quotation</a> prevents them.</p>"),
        ("Send the invoice immediately", "<p>Send it the moment the work is done or the goods are delivered, not days later. The sooner the invoice arrives, the sooner it is paid.</p>"),
        ("Put a due date on every invoice", "<p>&quot;Due on receipt&quot;, &quot;Due in 7 days&quot; or a real date. A deadline beats a vague request. See <a href=\"/guides/how-to-write-an-invoice-in-nigeria/\">what to put on an invoice</a>.</p>"),
        ("Make paying easy", "<ul><li>Put your account details on the invoice itself.</li><li>Offer more than one way to pay if you can: transfer, card link, or POS.</li><li>Keep the invoice short so the amount is obvious.</li></ul>"),
        ("Follow up on a schedule", "<p>Remind before the due date, on the day, and shortly after. Use polite, ready-made messages. See our <a href=\"/guides/payment-reminder-messages-nigeria/\">payment reminder scripts</a>.</p>"),
        ("Look professional", "<p>Customers pay a business that looks organised faster than one that sends a typed list in a chat. A clean, branded invoice signals that you are serious, and that you keep records.</p>"),
        ("Know who owes you", "<p>Keep a simple list of unpaid invoices and review it weekly. <a href=\"/invoice-app-nigeria/\">Aurum</a> shows who still owes you in one screen, and tells you when a client has opened their invoice, so you know whether to nudge them.</p>"),
        ("Protect yourself from fake transfers", "<p>Never release goods because a customer sent a screenshot of a transfer. Confirm in your own bank app first. This one habit saves many sellers real money.</p>"),
    ],
    faq=[("What is the best way to avoid non-paying customers?", "Take deposits, agree prices in writing, send invoices immediately with due dates, and follow up politely. Most problems are prevented before they start."),
         ("How much deposit should I ask for?", "Thirty to fifty percent is common for custom work. For small, low-risk sales, full payment upfront is also normal."),
         ("What if a customer still will not pay?", "Stay polite and in writing, offer a payment plan if it helps, and keep your documents. For large amounts, ask a lawyer about your options.")],
    related=["payment-reminder-messages-nigeria", "deposit-and-part-payment-invoice", "invoicing-for-instagram-whatsapp-vendors", "invoice-app-nigeria"])

GUIDES_A = [G1, G2, G3, G4, G5, G6, G7, G8]
