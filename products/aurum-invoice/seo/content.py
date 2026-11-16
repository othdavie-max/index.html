"""All SEO page content. Edit text here, run build_seo.py, deploy."""
from content_a import GUIDES_A, script, callout
from content_b import GUIDES_B
from content_c import GBEST, ABOUT
from content_d import GUIDES_D
from content_e import REVIEWS

SITE_NAME = "Aurum Invoice Studio"
GUIDES = GUIDES_A + GUIDES_B + [GBEST] + GUIDES_D

HUB = dict(
    title="Invoicing Guides and Templates for Nigerian Businesses",
    desc="Free invoice, receipt and quotation templates, WhatsApp payment reminder messages and plain-language guides for small businesses in Nigeria.",
    h1="Invoicing guides and templates for Nigerian businesses",
    intro="Practical, plain-language help for getting paid: how to write an invoice, templates you can copy, what to say when a customer is late, and how to look professional when you sell on WhatsApp and Instagram.")

def product(slug, nav, title, desc, h1, intro, sections, faq, related):
    return dict(slug=slug, nav=nav, title=title, desc=desc, h1=h1, intro=intro, sections=sections, faq=faq, related=related)

FEATURES = "<ul><li><b>All six documents:</b> invoices, receipts, quotations, delivery notes, credit notes and purchase orders.</li><li><b>Your branding:</b> your logo, signature, stamp and bank details already on every document.</li><li><b>A private link your client opens as an experience:</b> a wax-sealed envelope, a gift box or an invitation card, instead of a plain PDF.</li><li><b>Know when it is opened:</b> you see the moment your client opens it, so you know when to follow up.</li><li><b>One-tap receipts:</b> turn a paid invoice into a receipt, and the balance updates itself.</li><li><b>See who owes you:</b> and send a polite WhatsApp reminder in one tap.</li><li><b>Works on your phone:</b> installs like an app, works without data, light and dark mode.</li><li><b>Pay once:</b> no monthly fees.</li></ul>"

P1 = product("invoice-app-nigeria", "Invoice app for Nigerian businesses",
    "Invoice App for Nigerian Businesses | Aurum Invoice Studio",
    "Make invoices, receipts and quotations on your phone, with your logo and bank details. Your clients open them as an experience. Pay once, no monthly fees.",
    "The invoice app for Nigerian businesses that want to look premium",
    "Most small businesses send invoices as a typed message or a plain PDF. Aurum Invoice Studio turns your invoice into a private link, sealed with your brand, that gives your client an experience, and tells you when they do. Made for the way Nigerians do business: WhatsApp, bank transfer and your phone.",
    [("Why an invoice app instead of Word or Excel?", "<p>Templates are fine for a few invoices. As you grow, the retyping, renumbering and chasing eats your time. An invoice app fills in your details automatically, remembers your customers and prices, keeps a record of everything, and helps you follow up on late payment.</p><p>It also changes how your business looks. A clean, branded document, delivered as a private link, signals that you are organised and serious, which helps customers trust you and pay faster.</p>"),
     ("What you get with Aurum", FEATURES),
     ("Made for Nigeria", "<ul><li>Amounts in naira, with the amount in words.</li><li>Every Nigerian bank in a list, from GTBank to OPay and Moniepoint.</li><li>Built around WhatsApp: send the link, the PDF or an image.</li><li>Fields for your CAC (RC) number and TIN.</li><li>VAT and delivery lines when you need them.</li></ul>"),
     ("How it works", "<ol><li><b>Set up your business once:</b> logo, name, bank details, signature.</li><li><b>Make an invoice in under a minute:</b> pick or type the client, add what you sold, choose how it opens.</li><li><b>Send the private link</b> on WhatsApp.</li><li><b>See when it is opened,</b> then turn it into a receipt in one tap when you are paid.</li></ol>"),
     ("Who it is for", "<p>Fashion designers, caterers, event planners, photographers, freelancers, consultants, contractors, online sellers and anyone who sends customers a price and wants to be paid. If you have ever typed &quot;this one is ₦50,000, that one is ₦150,000, account number below&quot; into a chat, this is for you. Read more in <a href=\"/guides/invoicing-for-instagram-whatsapp-vendors/\">invoicing for Instagram and WhatsApp sellers</a>.</p>"),
     ("What customers say", '<div data-reviews data-limit="4"></div><p><a href="/reviews/">Read all reviews or write one</a></p>'),
     ("Plans", "<p><b>Signature</b> covers your business on 2 devices, with every document and design. <b>Prestige</b> adds your own web address with no Aurum name, phone alerts when a client opens or pays, a monthly report, team view, your logo in the wax seal and two businesses. See current prices on the <a href=\"/#pricing\">pricing section</a>. Both are one-time payments.</p>")],
    [("Is Aurum free?", "There is a free demo with sample data so you can see how it works. Using it for your own business needs a licence, which is a one-time payment with no monthly fees."),
     ("Does it work on my phone?", "Yes. It installs like an app from your browser on Android and iPhone, and works without data once installed."),
     ("Do my clients need to download anything?", "No. They open your link in their phone browser. No app and no account."),
     ("Can I make receipts and quotations too?", "Yes. Aurum makes invoices, receipts, quotations, delivery notes, credit notes and purchase orders."),
     ("Is there a monthly fee?", "No. You pay once.")],
    ["how-to-write-an-invoice-in-nigeria", "invoice-template-nigeria", "whatsapp-invoice", "receipt-maker-nigeria"])

P2 = product("receipt-maker-nigeria", "Receipt maker for Nigerian businesses",
    "Receipt Maker for Nigerian Businesses | Aurum Invoice Studio",
    "Make professional payment receipts on your phone in one tap, with your logo and a Paid stamp. Turn any paid invoice into a receipt. Pay once.",
    "A receipt maker that turns a paid invoice into a receipt in one tap",
    "A receipt is proof that your customer paid. With Aurum, you issue one in seconds from the invoice itself, with your logo, signature and a clear &quot;Paid&quot; mark, and the balance updates by itself.",
    [("Why customers want a proper receipt", "<p>Customers and companies keep receipts as proof for their own records, for returns, and for accounts. A clean, branded receipt builds trust and gets saved, instead of a screenshot in a chat that disappears.</p>"),
     ("How receipts work in Aurum", "<ol><li>Open the invoice that was paid.</li><li>Tap <b>Issue receipt</b> and confirm the amount and payment method.</li><li>The receipt is made with your logo, signature and a Paid mark, and the <b>invoice balance updates itself</b>.</li><li>Send it as a PDF, an image or a private link.</li></ol>"),
     ("Part payments and deposits", "<p>If a customer pays in stages, issue a receipt for each payment. Aurum shows what is paid and what is left, so the numbers always agree. See <a href=\"/guides/deposit-and-part-payment-invoice/\">deposits and part payments</a>.</p>"),
     ("A thank-you they will want to screenshot", "<p>When a client pays, they can also receive a thank-you card from your business. It is a small touch that makes people remember you.</p>"),
     ("What a receipt should contain", "<p>Receipt number, date, who paid, the amount (also in words), what it was for, the payment method and any balance left. Full checklist in our <a href=\"/guides/receipt-template-nigeria/\">receipt template guide</a>.</p>"),
     ("Everything else in the same app", FEATURES)],
    [("Can I turn an invoice into a receipt?", "Yes, in one tap, with no retyping. The invoice updates itself."),
     ("Can I issue a receipt for a part payment?", "Yes. Aurum shows the balance still owed after each payment."),
     ("Does it work on my phone?", "Yes. It installs like an app and works without data."),
     ("Is there a monthly fee?", "No. You pay once.")],
    ["receipt-template-nigeria", "deposit-and-part-payment-invoice", "invoice-app-nigeria"])

P3 = product("quotation-maker-nigeria", "Quotation maker for Nigerian businesses",
    "Quotation Maker for Nigerian Businesses | Aurum Invoice Studio",
    "Make professional price quotations on your phone with a valid-until date and deposit. When accepted, turn it into an invoice in one tap. Pay once.",
    "A quotation maker that becomes an invoice in one tap",
    "Win more customers with a clear, professional price quote, then turn it into an invoice the moment they say yes, with nothing retyped.",
    [("What a good quotation does", "<p>It tells the customer exactly what they will pay and when. It sets a deposit, a timeline and a valid-until date, which prevents price arguments later. See our <a href=\"/guides/quotation-template-nigeria/\">quotation template</a>.</p>"),
     ("How it works in Aurum", "<ol><li>Choose <b>New quotation</b> and pick or type the client.</li><li>Add each item and price. Aurum totals it and writes the amount in words.</li><li>Set the <b>valid-until date</b> and the deposit needed to start.</li><li>Send it as a private link, PDF or image.</li><li>When the client accepts, tap <b>Make invoice</b>. The items carry over exactly.</li></ol>"),
     ("A quotation that looks premium", "<p>Your logo, your colours, your signature and a space for the client to accept. A premium-looking quote signals a premium service, and makes it easier to say yes.</p>"),
     ("Quotation, estimate, proforma", "<p>Not sure which you need? Read <a href=\"/guides/invoice-vs-receipt-vs-quotation/\">invoice vs receipt vs quotation</a> and <a href=\"/guides/proforma-invoice-nigeria/\">proforma invoices</a>.</p>"),
     ("Everything else in the same app", FEATURES)],
    [("Can I turn a quotation into an invoice?", "Yes, in one tap. The items and prices carry over."),
     ("Can I set an expiry date on a quote?", "Yes. You can add a valid-until date and a deposit to start."),
     ("Does it work on my phone?", "Yes. It installs like an app and works without data."),
     ("Is there a monthly fee?", "No. You pay once.")],
    ["quotation-template-nigeria", "proforma-invoice-nigeria", "invoice-app-nigeria"])

P4 = product("whatsapp-invoice", "Send invoices on WhatsApp with a private link",
    "Send Invoices on WhatsApp the Professional Way | Aurum",
    "Stop typing prices in WhatsApp chats. Send a private, wax-sealed invoice link, see when it is opened and remind clients in one tap. Pay once.",
    "Send your invoice on WhatsApp the way a premium brand would",
    "Typing prices into a chat looks informal, and you never know if the customer saw it. Aurum turns your invoice into a private link sealed with your brand, and tells you when they open it.",
    [("What is wrong with typing prices in a chat?", "<ul><li>It looks informal, and easy to doubt.</li><li>It gets lost in the scroll.</li><li>There is no proper record for either of you.</li><li>You cannot tell if the customer actually saw it.</li></ul>"),
     ("How the private link works", "<ol><li>You make the invoice in Aurum.</li><li>You pick how it opens: a wax-sealed envelope, a gift box or an invitation card.</li><li>You send the link on WhatsApp.</li><li>Your client taps it, breaks the seal, and sees exactly what to pay.</li><li><b>You see the moment they open it.</b> No more &quot;did you see my message?&quot;.</li></ol>"),
     ("Polite reminders in one tap", "<p>See who still owes you and send a courteous WhatsApp reminder with the invoice link already inside. See our <a href=\"/guides/payment-reminder-messages-nigeria/\">reminder message scripts</a> for ideas.</p>"),
     ("Prefer a PDF or image?", "<p>You can also download any document as a PDF or an image and send it the usual way. Read more in <a href=\"/guides/how-to-send-an-invoice-on-whatsapp/\">how to send an invoice on WhatsApp</a>.</p>"),
     ("Everything else in the same app", FEATURES)],
    [("Do my clients need an account?", "No. They open your link in their phone browser. No app and no account."),
     ("Can I see if the invoice was opened?", "Yes. You see when your client opens the private link."),
     ("Can I still send a PDF?", "Yes. You can download a PDF or an image of any document."),
     ("Is there a monthly fee?", "No. You pay once.")],
    ["how-to-send-an-invoice-on-whatsapp", "payment-reminder-messages-nigeria", "invoice-app-nigeria"])

PRODUCTS = [P1, P2, P3, P4]
