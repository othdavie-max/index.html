# Trade-specific guides (invoice for photographers, caterers, ...) plus two practical how-tos.
# Each has its own example, deposit norms and problems, so no two pages repeat each other.
from content_a import script, callout

def ex(rows, total_label="Total", total="", dep=None):
    t = '<table class="ex"><tr><th>Description</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr>'
    for d, q, p, a in rows: t += f'<tr><td>{d}</td><td class="r">{q}</td><td class="r">{p}</td><td class="r">{a}</td></tr>'
    t += f'<tr><td colspan="3"><b>{total_label}</b></td><td class="r"><b>{total}</b></td></tr>'
    if dep: t += f'<tr><td colspan="3">Deposit received</td><td class="r">{dep[0]}</td></tr><tr><td colspan="3"><b>Balance due</b></td><td class="r"><b>{dep[1]}</b></td></tr>'
    return t + '</table><p><i>Sample figures to show the layout. Set your own prices.</i></p>'

def trade(slug, nav, title, desc, h1, intro, include, example, terms, problems, faq, related, tip):
    return dict(slug=slug, nav=nav, title=title, desc=desc, h1=h1, intro=intro, sections=[
        ("What to put on the invoice", include), ("A sample invoice", example), ("Deposit and payment terms", terms),
        ("Problems a clear invoice prevents", problems),
        ("Make it quick and look premium", f"<p>{tip} <a href=\"/invoice-app-nigeria/\">Aurum</a> keeps your logo, signature and bank details on every document, remembers your customers and prices, and sends the invoice as a private link your client opens like a gift. Pay once, no monthly fees.</p>")],
        faq=faq, related=related)

T1 = trade("invoice-for-photographers-nigeria", "Invoice for photographers in Nigeria",
    "Invoice for Photographers in Nigeria: What to Include",
    "How a photographer in Nigeria should invoice: coverage, extra hours, editing, prints, usage rights and deposits, with a sample invoice.",
    "How a photographer in Nigeria should write an invoice",
    "Photography clients often pay in stages and ask for extras on the day. A clear invoice protects your time and your pictures, and makes it easy to explain what each naira covers.",
    "<ul><li><b>The package:</b> hours of coverage, number of photographers, and the event or shoot date and location.</li><li><b>What is delivered:</b> number of edited photos, online gallery, prints or albums, and the delivery date.</li><li><b>Extras as separate lines:</b> extra hours, second shooter, travel, drone, rush editing.</li><li><b>Usage rights:</b> say whether the client can print and post the photos, and whether you can use them in your portfolio.</li><li><b>Your details:</b> business name, phone, bank account, and the invoice number and date.</li></ul>",
    ex([("Wedding coverage (8 hours)", "1", "₦250,000", "₦250,000"), ("Second photographer", "1", "₦60,000", "₦60,000"), ("Edited photos (300) + online gallery", "1", "₦40,000", "₦40,000"), ("Printed album (30 pages)", "1", "₦80,000", "₦80,000"), ("Travel (outside Lagos)", "1", "₦30,000", "₦30,000")], "Total", "₦460,000", ("₦230,000", "₦230,000")),
    "<p>Most photographers take a <b>50% deposit to hold the date</b>, because they turn other clients away. State it clearly: the date is only reserved once the deposit is paid. Put the balance due date <b>before</b> the event or on delivery, and say when edited photos will be released (many photographers release them only after full payment). Add your cancellation rule, such as the deposit not being refundable inside 14 days of the event. See <a href=\"/guides/deposit-and-part-payment-invoice/\">deposits and part payments</a>.</p>",
    "<ul><li><b>&quot;Can you stay a bit longer?&quot;</b> Your invoice lists the hours covered and the price of extra hours, so the answer is simple.</li><li><b>Arguments about photo numbers.</b> The invoice states how many edited photos are included.</li><li><b>Photos shared before payment.</b> Your terms say when they are released.</li><li><b>Date disputes.</b> The invoice shows the date, time and place that were agreed.</li></ul>",
    [("Should I invoice before or after the event?", "Send a deposit invoice when the client books, then an invoice for the balance before the event or on delivery."),
     ("Do I charge for editing separately?", "You can. Either include a set number of edited photos in the package or list editing as its own line."),
     ("How do I handle usage rights on an invoice?", "Add one short line saying how the photos may be used, and keep portfolio rights for yourself.")],
    ["quotation-template-nigeria", "deposit-and-part-payment-invoice", "payment-reminder-messages-nigeria", "invoice-app-nigeria"],
    "A photographer sends many similar invoices, so reuse your packages and prices instead of retyping them.")

T2 = trade("invoice-for-caterers-and-event-planners-nigeria", "Invoice for caterers and event planners",
    "Invoice for Caterers and Event Planners in Nigeria",
    "How caterers and event planners in Nigeria should invoice: per-head pricing, deposits, extras, cancellation terms and a sample invoice.",
    "How caterers and event planners in Nigeria should invoice",
    "Food and event jobs cost real money before the day arrives: ingredients, hiring, transport. Your invoice should show what you are providing, how many people it is for, and when you must be paid.",
    "<ul><li><b>The event:</b> name, date, time and venue.</li><li><b>Headcount:</b> the number of guests the price is based on, and the cut-off date for changing it.</li><li><b>Menu or package:</b> per-head price, with the menu items summarised or attached.</li><li><b>Extras as separate lines:</b> chairs and tables, decoration, cake, service staff, drinks, rentals, transport.</li><li><b>Delivery and setup time</b> and who is responsible for the venue.</li></ul>",
    ex([("Jollof rice, grilled chicken and sides (per head)", "150", "₦6,000", "₦900,000"), ("Small chops (per head)", "150", "₦2,500", "₦375,000"), ("Service staff (6 people)", "6", "₦15,000", "₦90,000"), ("Chairs and table setup", "1", "₦120,000", "₦120,000"), ("Transport", "1", "₦25,000", "₦25,000")], "Total", "₦1,510,000", ("₦755,000", "₦755,000")),
    "<p>Take a <b>deposit of 50% when the booking is confirmed</b>, since you buy food and book staff early. A common arrangement is the balance <b>3 to 7 days before the event</b>. State the <b>final headcount date</b>: after it, guest numbers can go up but not down. Put your cancellation rule on the invoice, for example what happens to the deposit if the event is cancelled within a week. Our guide on <a href=\"/guides/how-to-get-paid-on-time-nigeria/\">getting paid on time</a> applies strongly to events, where late payment is common.</p>",
    "<ul><li><b>Guest numbers creeping up.</b> The invoice states the headcount the price is for and the deadline to change it.</li><li><b>&quot;I thought chairs were included.&quot;</b> Every extra is its own line.</li><li><b>Being paid after the event.</b> The balance is due beforehand, in writing.</li><li><b>Disputes about the menu.</b> The invoice lists what was agreed.</li></ul>",
    [("How much deposit should a caterer ask for?", "Fifty percent is common, so your ingredient and staff costs are covered before the event."),
     ("Should the balance be paid before the event?", "Yes, ideally a few days before. It removes the risk of chasing a happy but busy host afterwards."),
     ("How do I price per head on an invoice?", "Show the price per person, the number of guests and the total, so changes in numbers are easy to adjust.")],
    ["quotation-template-nigeria", "deposit-and-part-payment-invoice", "how-to-get-paid-on-time-nigeria", "invoice-app-nigeria"],
    "Event work needs a quotation, then an invoice, then receipts for each payment.")

T3 = trade("invoice-for-fashion-designers-and-tailors-nigeria", "Invoice for fashion designers and tailors",
    "Invoice for Fashion Designers and Tailors in Nigeria",
    "How fashion designers and tailors in Nigeria should invoice: bespoke pricing, fabric, deposits, fittings, aso-ebi orders and a sample invoice.",
    "How fashion designers and tailors in Nigeria should invoice",
    "Custom clothing means your work starts before the client sees anything. Fabric is bought, measurements are taken, and one wrong detail can cost a whole outfit. A clear invoice records what was ordered and what was paid.",
    "<ul><li><b>Each outfit as its own line,</b> with a short description (style, colour, fabric).</li><li><b>Fabric and materials:</b> say if the client supplies it or you do, and the cost if you do.</li><li><b>Measurements and fittings:</b> note the date taken and the number of fittings included.</li><li><b>Delivery date</b> and any rush fee.</li><li><b>Alterations policy:</b> how many free adjustments, and what costs extra.</li></ul>",
    ex([("Bespoke lace gown, hand-beaded bodice", "1", "₦385,000", "₦385,000"), ("Aso-ebi outfit (bride&#39;s family)", "3", "₦25,000", "₦75,000"), ("Gele tying", "2", "₦15,000", "₦30,000"), ("Rush fee (2 weeks)", "1", "₦20,000", "₦20,000")], "Total", "₦510,000", ("₦200,000", "₦310,000")),
    "<p>Ask for a <b>50% deposit before cutting any fabric</b>, and the balance <b>before collection</b>, not after. Note that the order is made to the client&#39;s measurements, so the deposit is non-refundable once work starts. For group orders such as aso-ebi, take each person&#39;s deposit separately and list names and sizes. See our guide on <a href=\"/guides/deposit-and-part-payment-invoice/\">deposits and part payments</a>.</p>",
    "<ul><li><b>Clients who ghost after fabric is bought.</b> The deposit covers your cost.</li><li><b>&quot;That is not the style I wanted.&quot;</b> The invoice records the description agreed.</li><li><b>Last-minute rush.</b> The delivery date and rush fee are in writing.</li><li><b>Collection without full payment.</b> The balance is due before the outfit leaves.</li></ul>",
    [("Should a tailor charge for fabric on the invoice?", "If you supply it, list it as its own line. If the client supplies it, say so, so there is no confusion later."),
     ("How do I invoice a group order like aso-ebi?", "Make one invoice per person or one combined invoice with a line for each person, and take deposits separately."),
     ("Can I refuse refunds on custom clothing?", "Many designers do, because the item is made to measure. State it clearly on the invoice before the client pays.")],
    ["quotation-template-nigeria", "deposit-and-part-payment-invoice", "receipt-template-nigeria", "invoice-app-nigeria"],
    "Designers send a lot of orders with similar items, so saving your prices saves hours.")

T4 = trade("invoice-for-makeup-artists-and-beauty-businesses-nigeria", "Invoice for makeup artists and beauty businesses",
    "Invoice for Makeup Artists and Beauty Businesses in Nigeria",
    "How makeup artists, hair stylists and beauty businesses in Nigeria should invoice: bridal packages, trials, travel fees, deposits and a sample invoice.",
    "How makeup artists and beauty businesses in Nigeria should invoice",
    "Beauty bookings depend on a fixed time slot, so a no-show costs you the whole day. A clear invoice and a deposit protect your calendar.",
    "<ul><li><b>The service and the date and time,</b> including the start time and the location.</li><li><b>Number of people:</b> bride, bridesmaids, mothers, and the price for each.</li><li><b>Trial session</b> as its own line, and whether it is included.</li><li><b>Travel or call-out fee</b> if you go to the client.</li><li><b>Products and extras:</b> lashes, hair pieces, touch-up kit.</li></ul>",
    ex([("Bridal makeup", "1", "₦120,000", "₦120,000"), ("Bridesmaid makeup", "4", "₦35,000", "₦140,000"), ("Makeup trial", "1", "₦30,000", "₦30,000"), ("Travel (Island to Mainland)", "1", "₦25,000", "₦25,000")], "Total", "₦315,000", ("₦100,000", "₦215,000")),
    "<p>Take a <b>deposit to secure the date</b>, often 30% to 50%, and say it is non-refundable but can be moved once with notice. Put your <b>late arrival and cancellation rules</b> in writing, for example how much notice you need to reschedule. For events, ask for the balance on or before the day. See <a href=\"/guides/how-to-get-paid-on-time-nigeria/\">how to get paid on time</a>.</p>",
    "<ul><li><b>Last-minute cancellations.</b> The deposit and cancellation rule are agreed in advance.</li><li><b>&quot;Can you add two more people?&quot;</b> Each additional person has a price.</li><li><b>Travel disputes.</b> The travel fee is a separate, agreed line.</li></ul>",
    [("Should I charge a deposit for makeup bookings?", "Yes. It secures your time slot and reduces no-shows."),
     ("How do I price a group booking?", "List each service per person, or a package price with the number of people, so adding someone is easy."),
     ("Can I charge for a trial?", "Yes. Many artists list the trial as a separate line, or credit it against the booking if the client confirms.")],
    ["deposit-and-part-payment-invoice", "payment-reminder-messages-nigeria", "invoicing-for-instagram-whatsapp-vendors", "invoice-app-nigeria"],
    "A clean, branded invoice also makes a beauty brand look established.")

T5 = trade("invoice-for-freelancers-and-consultants-nigeria", "Invoice for freelancers and consultants",
    "Invoice for Freelancers and Consultants in Nigeria",
    "How freelancers and consultants in Nigeria should invoice: hourly or project pricing, milestones, retainers and late payment, with a sample invoice.",
    "How freelancers and consultants in Nigeria should invoice",
    "When you sell your time and skill, the invoice is the product&#39;s receipt. It needs to show what was done, how it was priced, and when you expect payment, especially with companies that pay through an accounts team.",
    "<ul><li><b>The project and the period</b> it covers.</li><li><b>How you price:</b> per hour, per day, per deliverable or a monthly retainer.</li><li><b>A clear description of each deliverable,</b> not just &quot;services&quot;.</li><li><b>Expenses</b> as separate lines, with receipts if they ask.</li><li><b>The client&#39;s company name and any purchase order number,</b> because accounts teams often need it to pay.</li><li><b>Payment terms:</b> due in 7, 14 or 30 days, and your late fee if you have one.</li></ul>",
    ex([("Brand strategy workshop (2 days)", "2", "₦150,000", "₦300,000"), ("Strategy report", "1", "₦100,000", "₦100,000"), ("Monthly advisory retainer (October)", "1", "₦80,000", "₦80,000"), ("Transport", "1", "₦15,000", "₦15,000")], "Total", "₦495,000"),
    "<p>For project work, split payment into <b>milestones</b>: for example 40% to start, 30% at the first draft and 30% on delivery. For retainers, invoice on the same date each month and say what the retainer covers. Companies often pay on 14 to 30 day terms, so state it and send the invoice <b>the same day</b> the work is accepted. Late payment is easier to chase when the terms are on the invoice. See our <a href=\"/guides/payment-reminder-messages-nigeria/\">payment reminder messages</a>.</p>",
    "<ul><li><b>Scope creep.</b> The invoice lists what was agreed, so extra work is a new line.</li><li><b>Slow company payments.</b> The PO number, terms and a clear contact help their accounts team process it.</li><li><b>&quot;We did not agree on that price.&quot;</b> A quotation first, then an invoice that matches it.</li></ul>",
    [("Should I charge hourly or per project?", "Per project or per deliverable is easier for clients to approve. Hourly suits open-ended or unpredictable work."),
     ("How do I invoice a retainer?", "Invoice on the same date each month, describe what the retainer covers, and keep one running invoice number sequence."),
     ("Do I need a client's PO number?", "Many companies require it before they can pay. Ask for it when you take the job.")],
    ["quotation-template-nigeria", "how-to-get-paid-on-time-nigeria", "invoice-template-nigeria", "invoice-app-nigeria"],
    "Freelancers invoice often and from anywhere, so a phone-first tool matters.")

T6 = trade("invoice-for-graphic-designers-and-creatives-nigeria", "Invoice for graphic designers and creatives",
    "Invoice for Graphic Designers and Creatives in Nigeria",
    "How graphic designers, video editors and creatives in Nigeria should invoice: scope, revisions, file ownership and deposits, with a sample invoice.",
    "How graphic designers and creatives in Nigeria should invoice",
    "Creative work is easy to argue about, because &quot;one more small change&quot; costs real time. A good invoice records the scope, the number of revisions and when the client gets the final files.",
    "<ul><li><b>The deliverables:</b> logo, flyers, social pack, video edit, with sizes or formats.</li><li><b>Number of concepts and revisions included.</b> After that, each round costs extra.</li><li><b>Turnaround time</b> and the date the draft is due.</li><li><b>File ownership:</b> when the client gets the full-resolution and source files.</li><li><b>Extras:</b> rush fee, stock photos, fonts, printing.</li></ul>",
    ex([("Logo design (3 concepts, 2 revisions)", "1", "₦120,000", "₦120,000"), ("Brand guideline (6 pages)", "1", "₦60,000", "₦60,000"), ("Social media pack (12 templates)", "1", "₦70,000", "₦70,000"), ("Extra revision round", "1", "₦15,000", "₦15,000")], "Total", "₦265,000", ("₦132,500", "₦132,500")),
    "<p>Take <b>50% before you start</b> and the balance <b>before sending final files</b>. Say clearly that source files are released on full payment. If the client asks for more revisions than agreed, send a short invoice for the extra round, so it never feels like an argument. Our <a href=\"/guides/quotation-template-nigeria/\">quotation template</a> helps you agree the scope first.</p>",
    "<ul><li><b>Endless revisions.</b> The invoice states how many are included.</li><li><b>Files used without payment.</b> They are only released after the balance is paid.</li><li><b>Scope disputes.</b> The deliverables are listed in writing.</li></ul>",
    [("How many revisions should I include?", "Two or three rounds is common. After that, charge per round."),
     ("When should I release the final files?", "After the full payment is confirmed in your own bank account."),
     ("Should I invoice before or after the work?", "Take a deposit before you start, and invoice the balance when the draft is approved or before the final files go out.")],
    ["quotation-template-nigeria", "deposit-and-part-payment-invoice", "invoice-for-freelancers-and-consultants-nigeria", "invoice-app-nigeria"],
    "Creatives who look professional on paper get paid like professionals.")

T7 = trade("invoice-for-contractors-and-artisans-nigeria", "Invoice for contractors and artisans",
    "Invoice for Contractors and Artisans in Nigeria",
    "How contractors, builders, electricians and other artisans in Nigeria should invoice: labour, materials, stage payments and a sample invoice.",
    "How contractors and artisans in Nigeria should invoice",
    "Building and repair jobs involve materials, labour and unexpected extras. An invoice that separates them, and bills in stages, avoids most arguments on site.",
    "<ul><li><b>The job and the site address,</b> with a short description of the work.</li><li><b>Labour and materials as separate sections.</b> Clients trust it more.</li><li><b>Quantities and unit prices for materials</b> (cement, pipes, cables, paint).</li><li><b>Variations:</b> any extra work added after the first quote, as its own line.</li><li><b>Stage or completion dates</b> and the payment due at each stage.</li></ul>",
    ex([("Materials: cables, sockets, breakers", "1", "₦180,000", "₦180,000"), ("Labour: rewiring (3 rooms)", "3", "₦45,000", "₦135,000"), ("Materials: paint and sealant", "1", "₦60,000", "₦60,000"), ("Labour: painting", "1", "₦90,000", "₦90,000"), ("Variation: extra socket points", "5", "₦8,000", "₦40,000")], "Total", "₦505,000", ("₦250,000", "₦255,000")),
    "<p>Bill in <b>stages</b> tied to progress: for example 50% to mobilise and buy materials, 30% when half the work is done, and 20% on completion and inspection. A mobilisation deposit is normal, because you must buy materials. Write down who pays for any damage or change of plan. See <a href=\"/guides/deposit-and-part-payment-invoice/\">deposits and part payments</a>.</p>",
    "<ul><li><b>&quot;I thought materials were included.&quot;</b> They are listed and priced.</li><li><b>Extra work disputes.</b> Every variation is its own line, agreed before you do it.</li><li><b>Payment after the client is happy.</b> Stages make payment follow progress.</li></ul>",
    [("Should I separate labour and materials?", "Yes. It is clearer, and clients can see where the money goes."),
     ("How do I charge for extra work?", "Agree it first, then add it as a separate line so the original price stays clear."),
     ("When should I ask for the final payment?", "On completion or after the client inspects the work. State this on the invoice.")],
    ["quotation-template-nigeria", "deposit-and-part-payment-invoice", "how-to-get-paid-on-time-nigeria", "invoice-app-nigeria"],
    "A written, itemised invoice is the best protection on any job site.")

G_NUM = dict(
    slug="invoice-number-format-nigeria", nav="How to number your invoices",
    title="Invoice Numbers: How to Number Your Invoices",
    desc="How to number invoices so they stay organised: simple formats, year-based numbers, what not to do, and examples for small businesses.",
    h1="How to number your invoices (simple formats that work)",
    intro="Every invoice needs its own number. It lets you and your customer refer to the same document, and it keeps your records in order. Here are simple formats, and the mistakes to avoid.",
    sections=[
        ("Why invoice numbers matter", "<ul><li>You and your customer can refer to the exact invoice (&quot;please pay invoice 0042&quot;).</li><li>You can see at a glance how many you have sent.</li><li>A clean sequence makes accounting and tax time easier.</li><li>It prevents duplicates, which cause payment confusion.</li></ul>"),
        ("Simple formats you can use", "<ul><li><b>Plain running number:</b> 0001, 0002, 0003. The simplest option.</li><li><b>Prefix + number:</b> INV-0001, INV-0002. The prefix tells you it is an invoice.</li><li><b>Year + number:</b> INV-2026-001. The sequence restarts each year, and the year is clear.</li><li><b>Client code + number:</b> ADA-001 for a regular client. Useful for retainers.</li></ul><p>Use a different prefix for each document type, such as <b>QUO-</b> for quotations, <b>RCT-</b> for receipts, <b>CN-</b> for credit notes and <b>PO-</b> for purchase orders.</p>"),
        ("Rules to follow", "<ol><li><b>Never reuse a number,</b> even if you cancel an invoice. Issue a <a href=\"/guides/credit-note-nigeria/\">credit note</a> instead.</li><li><b>Keep the sequence in order,</b> without gaps you cannot explain.</li><li><b>Do not start at 1</b> if you want to look established. Starting at 0101 or 1001 is fine, as long as you are consistent.</li><li><b>Put the number clearly at the top</b> of every invoice.</li><li><b>Match receipts to invoices.</b> A receipt should name the invoice number it pays.</li></ol>"),
        ("Common mistakes", "<ul><li>Using the date as the only number. Two invoices on the same day then clash.</li><li>Changing the format halfway through the year.</li><li>Different numbering in different places (a notebook and a phone).</li><li>Deleting an invoice and reusing its number.</li></ul>"),
        ("Let the app count for you", "<p>If you number by hand, mistakes are easy. <a href=\"/invoice-app-nigeria/\">Aurum</a> numbers every invoice, receipt and quotation for you in the right sequence, so you never repeat or skip one.</p>"),
    ],
    faq=[("What should an invoice number look like?", "Any clear, unique running number. INV-0001 or INV-2026-001 are common and easy to read."),
         ("Do invoice numbers have to start at 1?", "No. You can start at any number, as long as you continue in order."),
         ("What if I made a mistake on an invoice?", "Issue a credit note for the wrong invoice, then a new invoice with the next number. Do not reuse the old number.")],
    related=["how-to-write-an-invoice-in-nigeria", "credit-note-nigeria", "invoice-template-nigeria", "invoice-app-nigeria"])

G_LATE = dict(
    slug="late-payment-fee-and-payment-terms", nav="Payment terms and late fees",
    title="Payment Terms and Late Fees: What to Put on Your Invoice",
    desc="How to set payment terms, due dates and a late fee on your invoice, with wording you can copy, so customers pay on time.",
    h1="Payment terms and late fees: what to put on your invoice",
    intro="Payment terms are the rules for how and when you get paid. Written on the invoice, they make late payment less likely, and give you something to point to when it happens. Here is wording you can copy.",
    sections=[
        ("What payment terms are", "<p>Payment terms say <b>when the money is due</b>, <b>how to pay</b> and <b>what happens if it is late</b>. They are short, and they sit near the bottom of every invoice.</p>"),
        ("Common terms to choose from", "<ul><li><b>Due on receipt:</b> pay as soon as you get the invoice. Good for small jobs and online sales.</li><li><b>Due in 7 days:</b> for short jobs.</li><li><b>Due in 14 or 30 days:</b> common for company customers and larger work.</li><li><b>Deposit plus balance:</b> a share upfront, the rest on a date or on delivery.</li></ul>"),
        ("Wording you can copy", script("Standard terms", "Payment is due within 14 days of the invoice date. Please pay to the account above and send proof of payment.") + script("Deposit terms", "A 50% deposit confirms your order. The balance is due before delivery.") + script("Late fee", "Invoices unpaid after the due date may attract a late fee of [2]% per month on the outstanding balance.")),
        ("About late fees", "<p>A late fee is only fair, and only holds in practice, if the customer <b>knew about it before</b> the job started. Put it on your quotation and invoice from the start. Many small businesses never charge it, and use it as a reason for customers to pay on time. Keep the rate reasonable, and if you are unsure about enforcing it, ask a lawyer.</p>"),
        ("Make the terms work", "<ul><li>Put the due date as a real date, not only &quot;14 days&quot;.</li><li>Send the invoice immediately.</li><li>Remind politely before and after the due date. See <a href=\"/guides/payment-reminder-messages-nigeria/\">payment reminder messages</a>.</li><li>Keep terms short. Nobody reads a long paragraph.</li></ul>"),
        ("Save your terms once", "<p>Retyping terms on every invoice wastes time. <a href=\"/invoice-app-nigeria/\">Aurum</a> lets you save your notes and terms once, so they appear on every document, and tap one to add it.</p>"),
    ],
    faq=[("What payment terms should I use?", "Due on receipt for small or online jobs, 7 days for short work, and 14 or 30 days for company customers. Use a deposit for custom or large jobs."),
         ("Can I charge interest on late payment?", "Only if you told the customer in advance, ideally on the quotation and invoice. Ask a lawyer if you are unsure."),
         ("Where do payment terms go?", "Near the bottom of the invoice, close to your account details.")],
    related=["how-to-get-paid-on-time-nigeria", "payment-reminder-messages-nigeria", "deposit-and-part-payment-invoice", "invoice-app-nigeria"])

GUIDES_D = [T1, T2, T3, T4, T5, T6, T7, G_NUM, G_LATE]
