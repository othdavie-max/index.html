from content_a import script, callout, TAX_NOTE

G9 = dict(
    slug="invoicing-for-instagram-whatsapp-vendors", nav="Invoicing for Instagram and WhatsApp sellers",
    title="Invoicing for Instagram and WhatsApp Sellers in Nigeria",
    desc="How online sellers in Nigeria can look professional, avoid payment disputes and build trust: invoices, receipts and order confirmations.",
    h1="Invoicing for Instagram and WhatsApp sellers in Nigeria",
    intro="Selling through DMs is fast, but it is also messy. Prices get typed into chats, orders get lost, and customers doubt whether you are real. A simple invoicing habit fixes all three and makes you look like a brand, not just a page.",
    sections=[
        ("Why DM sellers need invoices", "<ul><li><b>Trust.</b> New customers are cautious about paying strangers online. A proper invoice with your business name and details reassures them.</li><li><b>Fewer disputes.</b> Everything agreed is written in one place: item, price, delivery fee, date.</li><li><b>Fewer lost orders.</b> A chat scrolls away. An invoice is a record you can find.</li><li><b>A better look.</b> Compare &quot;Perfume 5k, delivery 1500, total 6500&quot; typed in a chat with a clean, branded document. Which one would you trust with your money?</li></ul>"),
        ("What to send, and when", "<ol><li><b>Quotation</b> (optional): when a customer asks &quot;how much is this?&quot; and the order is not simple.</li><li><b>Invoice:</b> once they decide to buy, with items, delivery fee, total and your account details.</li><li><b>Receipt:</b> once you confirm the money in your bank app.</li><li><b>Delivery note</b> (optional): for larger orders, to confirm what was sent. See <a href=\"/guides/delivery-note-vs-invoice/\">delivery note vs invoice</a>.</li></ol>"),
        ("A simple order flow", script("Order confirmation", "Thank you for your order, [Name]! 🎉 Here is your invoice [INV-0012] for ₦[total]. Please pay to [Bank · Account name · Account number] and send the proof here. Your order ships once I confirm payment. Delivery: [x] days.")),
        ("Protect yourself", "<ul><li>Check payment in <b>your own bank app</b>, never from a screenshot alone. Fake alerts exist.</li><li>Ask for payment <b>before</b> you ship, or use a deposit for custom orders.</li><li>Keep your own list of every order and who has paid.</li></ul>"),
        ("Make it feel premium", "<p>Add your logo, use consistent colours, and put a short thank-you line at the end. Little details make a small brand feel established. <a href=\"/invoice-app-nigeria/\">Aurum</a> sends your invoice as a private link, sealed with your brand, that gives your customer an experience, which is very different from a plain PDF, and it tells you when they open it.</p>"),
    ],
    faq=[("Do I need an invoice if the customer pays on the spot?", "It still helps. An invoice or receipt gives both of you a record, and it makes your business look professional."),
         ("What should a DM seller put on an invoice?", "Your business name, the customer's name, each item with its price, the delivery fee, the total, your account details and a payment deadline."),
         ("How do I stop fake payment screenshots?", "Confirm every payment in your own bank app or statement before releasing goods.")],
    related=["how-to-send-an-invoice-on-whatsapp", "receipt-template-nigeria", "how-to-get-paid-on-time-nigeria", "whatsapp-invoice"])

G10 = dict(
    slug="vat-on-invoices-nigeria", nav="VAT on invoices in Nigeria",
    title="VAT on Invoices in Nigeria: How to Show It",
    desc="How to show VAT on an invoice in Nigeria: the basics, a worked example at 7.5%, and when to ask an accountant.",
    h1="VAT on invoices in Nigeria: how to show it",
    intro="Value Added Tax (VAT) is a tax added to the price of many goods and services. Whether you must charge it depends on your business. If you do, it should appear clearly on the invoice. Here are the basics.",
    sections=[
        ("The key point first", TAX_NOTE),
        ("What VAT is", "<p>VAT is a consumption tax. A VAT-registered business adds it to what it sells, collects it from the customer, and pays it over to the tax authority. The standard rate in Nigeria has been <b>7.5%</b>. Check the current rate and exemptions for your goods or services before you rely on this.</p>"),
        ("How to show VAT on an invoice", "<ul><li>List your items and the <b>subtotal</b> before VAT.</li><li>Add a separate line: <b>VAT (7.5%)</b> with the amount.</li><li>Show the <b>total including VAT</b> as the amount due.</li><li>If you are VAT-registered, put your <b>TIN or VAT number</b> on the invoice.</li></ul>"),
        ("A worked example", """<table class="ex"><tr><th>Description</th><th class="r">Amount</th></tr>
<tr><td>Brand design service</td><td class="r">₦200,000.00</td></tr>
<tr><td>Subtotal</td><td class="r">₦200,000.00</td></tr>
<tr><td>VAT (7.5%)</td><td class="r">₦15,000.00</td></tr>
<tr><td><b>Total due</b></td><td class="r"><b>₦215,000.00</b></td></tr></table><p>To get VAT: multiply the subtotal by 0.075. Here, 200,000 × 0.075 = 15,000. This is a sample calculation only, not tax advice.</p>"""),
        ("Prices with VAT already included", "<p>If your price already includes VAT, say so (&quot;VAT inclusive&quot;) so the customer does not think it will be added later. To find the VAT inside a total, divide the total by 1.075 to get the price before VAT, then subtract.</p>"),
        ("Keep it simple with software", "<p>Adding VAT by hand invites mistakes. In <a href=\"/invoice-app-nigeria/\">Aurum</a>, you switch VAT on for an invoice and it adds the line and total correctly.</p>"),
    ],
    faq=[("What is the VAT rate in Nigeria?", "It has been 7.5%. Check the current rate and any exemptions with the tax authority or an accountant, as rules can change."),
         ("Do small businesses have to charge VAT?", "It depends on your business and turnover, and the rules changed with the 2025 tax reforms. Ask an accountant."),
         ("Should VAT appear as its own line?", "Yes, if you charge it. Showing it separately makes the invoice clear and easier to account for.")],
    related=["how-to-write-an-invoice-in-nigeria", "invoice-template-nigeria", "invoice-app-nigeria"])

G11 = dict(
    slug="deposit-and-part-payment-invoice", nav="Deposits and part payments on invoices",
    title="Deposit and Part Payment Invoices: How to Handle Them",
    desc="How to take a deposit, invoice the balance and issue receipts for part payments, with a clear example for Nigerian businesses.",
    h1="Deposits and part payments: how to invoice them",
    intro="Deposits protect your cash flow, and part payments help customers afford larger purchases. The key is to keep one invoice as the single source of truth, and track every payment against it.",
    sections=[
        ("Why take a deposit", "<ul><li>It proves the customer is serious.</li><li>It covers your first costs, like materials or booking a slot.</li><li>It reduces no-shows and last-minute cancellations.</li></ul><p>For custom work, 30% to 50% upfront is common. Say so on your quotation, so it is expected from the start.</p>"),
        ("The simple way to track it", "<ol><li>Issue <b>one invoice</b> for the full amount.</li><li>When the deposit arrives, issue a <b>receipt</b> for the deposit and record it against the invoice.</li><li>Show <b>total, paid so far and balance due</b> on the invoice.</li><li>When the balance arrives, issue a <b>final receipt</b> and mark the invoice paid.</li></ol>"),
        ("Example", """<table class="ex"><tr><th>Item</th><th class="r">Amount</th></tr>
<tr><td>Event photography (full day)</td><td class="r">₦300,000</td></tr>
<tr><td>Total</td><td class="r">₦300,000</td></tr>
<tr><td>Deposit received (50%, 5 Nov)</td><td class="r">- ₦150,000</td></tr>
<tr><td><b>Balance due on 20 Nov</b></td><td class="r"><b>₦150,000</b></td></tr></table>"""),
        ("Write the rules down", script("Deposit terms", "A 50% deposit is required to confirm your booking. The balance is due 3 days before the event. The deposit is non-refundable if you cancel within 7 days of the event.") + "<p>Adjust the percentages and dates to suit your business, and make sure your refund rule is something you can honour.</p>"),
        ("Common mistakes", "<ul><li>Taking money with no receipt. Always issue one.</li><li>Making a new unrelated invoice for the balance. Keep one invoice and show payments against it.</li><li>Not stating the refund rule up front.</li></ul>"),
        ("Do it in one tap", "<p><a href=\"/invoice-app-nigeria/\">Aurum</a> lets you mark an invoice as part-paid, shows the balance left, and creates the matching receipt for each payment, so the numbers always agree.</p>"),
    ],
    faq=[("How much deposit should I ask for?", "Thirty to fifty percent is common for custom work. Larger or riskier jobs may need more."),
         ("Do I issue a receipt for a deposit?", "Yes. Issue a receipt for every payment, and show the balance still owed."),
         ("Can I refund a deposit?", "That is up to your terms. State your rule clearly before the customer pays.")],
    related=["receipt-template-nigeria", "how-to-get-paid-on-time-nigeria", "quotation-template-nigeria", "invoice-app-nigeria"])

G12 = dict(
    slug="delivery-note-vs-invoice", nav="Delivery note vs invoice",
    title="Delivery Note vs Invoice: What is the Difference?",
    desc="What a delivery note is, how it differs from an invoice, when to use each one, and what to include. Simple guide for Nigerian businesses.",
    h1="Delivery note vs invoice: what is the difference?",
    intro="A delivery note records <i>what was delivered</i>. An invoice requests <i>payment for it</i>. If you deliver goods, using both protects you from disputes about what was sent and what was owed.",
    sections=[
        ("What is a delivery note?", "<p>A delivery note travels with the goods. It lists the items and quantities delivered, and the person receiving them signs it. It usually has <b>no prices</b>, because its job is to confirm delivery, not to ask for money.</p>"),
        ("What is an invoice?", "<p>An invoice lists the items, prices and the amount due, with payment details. See <a href=\"/guides/how-to-write-an-invoice-in-nigeria/\">how to write an invoice</a>.</p>"),
        ("The main differences", "<ul><li><b>Purpose:</b> delivery note = proof of delivery. Invoice = request for payment.</li><li><b>Prices:</b> usually not on a delivery note. Always on an invoice.</li><li><b>Signature:</b> the receiver signs a delivery note. An invoice does not need one.</li><li><b>When:</b> a delivery note goes with the goods. An invoice is sent when payment is due.</li></ul>"),
        ("What to include on a delivery note", "<ul><li>The word <b>Delivery Note</b> and a number.</li><li>Your business details and the customer's name and address.</li><li>The date of delivery.</li><li>Each item and the <b>quantity delivered</b>.</li><li>A line for the receiver's <b>name and signature</b>.</li><li>A note of any damaged or missing items.</li></ul>"),
        ("When you need one", "<p>For orders of several items, B2B sales, deliveries through a rider or driver, or anything where &quot;I never received it&quot; could become an argument. A signed delivery note ends that argument.</p>"),
        ("One app for both", "<p><a href=\"/invoice-app-nigeria/\">Aurum</a> makes delivery notes, invoices, receipts and more in the same place, using the same customer details, so nothing is retyped.</p>"),
    ],
    faq=[("Does a delivery note show prices?", "Usually not. It confirms what was delivered. Prices belong on the invoice."),
         ("Can I use a delivery note instead of an invoice?", "No. A delivery note does not ask for payment. You still need an invoice."),
         ("Who signs a delivery note?", "The person who receives the goods signs it, so you have proof of delivery.")],
    related=["invoice-vs-receipt-vs-quotation", "how-to-write-an-invoice-in-nigeria", "purchase-order-explained", "invoice-app-nigeria"])

G13 = dict(
    slug="how-to-send-an-invoice-on-whatsapp", nav="How to send an invoice on WhatsApp",
    title="How to Send an Invoice on WhatsApp (Professionally)",
    desc="The best ways to send an invoice on WhatsApp in Nigeria: PDF, image or private link, with a message template and mistakes to avoid.",
    h1="How to send an invoice on WhatsApp the professional way",
    intro="Most Nigerian businesses send invoices on WhatsApp, but how you send it changes how it is received. Here are the options, a message you can copy, and what to avoid.",
    sections=[
        ("Three ways to send an invoice on WhatsApp", "<ol><li><b>A typed message.</b> Quick, but looks informal, easy to lose and hard to read for long lists. Best only for very small, one-off sales.</li><li><b>A PDF or image.</b> Looks like a real document and can be saved. Make sure it is clear on a phone screen.</li><li><b>A private link.</b> The customer taps a link and sees the invoice on a clean page, often with a way to pay. You can see when it has been opened.</li></ol>"),
        ("What to avoid", "<ul><li>Long lists of prices typed in a chat.</li><li>A blurry screenshot of a spreadsheet.</li><li>Putting account details in a message and nothing else. The invoice should contain them too.</li><li>Sending without a due date.</li></ul>"),
        ("A message you can copy", script("WhatsApp message", "Hello [Name], thank you for your order! 🙏 Please find invoice [INV-0042] for ₦[amount] attached [or: here: link]. Payment details are on the invoice. Kindly send proof of payment once done. Thank you for your business.")),
        ("Tips so it gets read", "<ul><li>Keep your message short and put the details in the document.</li><li>Send the invoice in the morning, not late at night.</li><li>Send it right after the order is agreed.</li><li>Save the customer to your contacts first, so your message is not marked unknown.</li></ul>"),
        ("Want to know when they open it?", "<p>A plain PDF cannot tell you. A private link can. <a href=\"/whatsapp-invoice/\">Aurum</a> turns your invoice into a wax-sealed private link, so you see the moment your customer opens it, and you can send a polite reminder in one tap if they go quiet.</p>"),
    ],
    faq=[("Is it okay to send an invoice on WhatsApp?", "Yes. It is the normal way for many Nigerian businesses. Use a clear PDF or a private link, and keep the details on the invoice itself."),
         ("Should I send a PDF or an image?", "PDF is best for a document that can be saved and printed. An image is fine for quick viewing. Make sure either is readable on a phone."),
         ("How do I know if my customer saw the invoice?", "WhatsApp read ticks only show the message was read, not the invoice. A private link shows when the invoice itself was opened.")],
    related=["payment-reminder-messages-nigeria", "invoicing-for-instagram-whatsapp-vendors", "invoice-template-nigeria", "whatsapp-invoice"])

G14 = dict(
    slug="credit-note-nigeria", nav="Credit note explained",
    title="What is a Credit Note? When and How to Issue One",
    desc="A credit note reduces what a customer owes, for returns, mistakes or discounts. How it works, what to include and an example.",
    h1="What is a credit note, and when do you issue one?",
    intro="A credit note is a document that <i>reduces</i> the amount a customer owes you, or gives them a credit towards a future purchase. You issue one when an invoice needs to be corrected or part of the sale is cancelled.",
    sections=[
        ("When to issue a credit note", "<ul><li>The customer <b>returned</b> goods.</li><li>You made a <b>pricing or quantity mistake</b> on the invoice.</li><li>You agreed a <b>discount</b> after sending the invoice.</li><li>A service was <b>not delivered</b>, or only partly.</li></ul>"),
        ("Why not just edit the invoice?", "<p>Once an invoice has been sent, changing it quietly causes confusion and damages your records. A credit note keeps the original invoice as it was and records the change openly, so both sides can follow what happened.</p>"),
        ("What to include", "<ul><li>The words <b>Credit Note</b> and its own number, such as CN-0001.</li><li>The <b>original invoice number</b> it refers to.</li><li>The date and customer details.</li><li>The items or amount being credited, and the <b>reason</b>.</li><li>The new balance, or whether it is a refund or credit for later.</li></ul>"),
        ("Example", """<table class="ex"><tr><th>Document</th><th class="r">Amount</th></tr>
<tr><td>Original invoice INV-0042</td><td class="r">₦120,000</td></tr>
<tr><td>Credit note CN-0003 (1 item returned)</td><td class="r">- ₦25,000</td></tr>
<tr><td><b>New amount due</b></td><td class="r"><b>₦95,000</b></td></tr></table>"""),
        ("Refund or credit?", "<p>Decide what the customer gets: money back, or a credit to use on their next order. Say which on the credit note, so there are no surprises. Keep your refund rule on your invoices, and make sure you honour it.</p>"),
        ("Make them in seconds", "<p><a href=\"/invoice-app-nigeria/\">Aurum</a> creates credit notes alongside invoices and receipts, linked to the original, so your records stay tidy.</p>"),
    ],
    faq=[("Is a credit note the same as a refund?", "Not exactly. A credit note is the document. The refund is money going back. You can also use a credit note to give a credit towards a future order."),
         ("Does a credit note need the original invoice number?", "Yes. Always refer to the invoice it corrects."),
         ("Can I issue a credit note after the customer has paid?", "Yes. It then shows what you owe them, which you can refund or apply to a future order.")],
    related=["how-to-write-an-invoice-in-nigeria", "invoice-vs-receipt-vs-quotation", "receipt-template-nigeria", "invoice-app-nigeria"])

G15 = dict(
    slug="purchase-order-explained", nav="Purchase order explained",
    title="Purchase Order (PO) Explained for Small Businesses",
    desc="What a purchase order is, who sends it, how it differs from an invoice, and what to include. Plain guide for Nigerian small businesses.",
    h1="Purchase orders explained for small businesses",
    intro="A purchase order (PO) is a document a <i>buyer</i> sends to a <i>seller</i> to order goods or services. If you supply companies, you will start receiving them. If you buy in bulk, you should start sending them.",
    sections=[
        ("What a purchase order does", "<p>A PO states exactly what the buyer wants, at what price and by when. Once the seller accepts, it acts as a record that both sides agreed the order. Later, the seller&#39;s invoice should match the PO.</p>"),
        ("Purchase order vs invoice", "<ul><li><b>Purchase order:</b> sent by the <b>buyer</b> before the sale, to place the order.</li><li><b>Invoice:</b> sent by the <b>seller</b> after, to request payment.</li></ul><p>Many companies will not pay an invoice unless it quotes a valid PO number.</p>"),
        ("What to include", "<ul><li>The words <b>Purchase Order</b> and a PO number.</li><li>The buyer&#39;s and seller&#39;s details.</li><li>Each item, quantity and agreed price.</li><li>Delivery address and date.</li><li>Payment terms, such as &quot;30 days after invoice&quot;.</li><li>An authorised name or signature.</li></ul>"),
        ("If you receive a PO", "<p>Check the items and prices match your quotation, then confirm the order in writing. Put the <b>PO number on your invoice</b>, so the buyer&#39;s accounts team can match it and pay faster.</p>"),
        ("If you send a PO", "<p>Number your POs in order, keep a copy, and check the supplier&#39;s invoice against it before you pay. It stops overcharging and gives you a clear paper trail.</p>"),
        ("All in one place", "<p><a href=\"/invoice-app-nigeria/\">Aurum</a> makes purchase orders, invoices, receipts, quotations, delivery notes and credit notes with the same customer and item details, so nothing is retyped.</p>"),
    ],
    faq=[("Who issues a purchase order, the buyer or the seller?", "The buyer. The seller replies with an invoice."),
         ("Do I need a purchase order for a small purchase?", "Not always, but it is good practice for larger or repeat orders, and companies often require them."),
         ("Why do companies ask for a PO number on invoices?", "So their accounts team can match your invoice to an approved order before paying.")],
    related=["delivery-note-vs-invoice", "invoice-vs-receipt-vs-quotation", "how-to-write-an-invoice-in-nigeria", "invoice-app-nigeria"])

GUIDES_B = [G9, G10, G11, G12, G13, G14, G15]
