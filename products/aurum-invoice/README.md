# Aurum Invoice Studio

Luxury invoices, receipts and quotations for Nigerian businesses, delivered as a sealed envelope by link.

This folder is a separate product. It isn't part of the Baseline Educational Services website. The whole app is one file, `index.html`, with no build step.

## What buyers get

**First-run welcome.** A short setup that asks for:
- Business name and tagline
- Their craft (fashion, beauty, events, food, real estate, photo, tech, logistics, retail)
- Brand colour and logo
- WhatsApp number and bank details

It ends with a ceremony where their own wax seal is pressed.

**Creating a document takes four chapters, with very little typing:**
1. **Client:** Invoice, Receipt or Quotation. Saved clients appear as you type. An optional "valid until" date is a one-tap chip (No expiry, 3 days, 1 week, 2 weeks, 30 days, or pick a date).
2. **Items:** saved items and industry suggestions appear as you type. Quantity uses +/− buttons, and prices format with commas. Discount (5%, 10%, 15%, amount) and delivery fee (₦2,000, ₦3,500, ₦5,000, other) are one-tap chips, plus a VAT switch.
3. **Payment:** status chips, deposit chips (30%, 50%, 70%), payment method for receipts, and ready-made notes.
4. **Send:** private link, WhatsApp, PDF, image.

**"My house" settings:** identity, bank (searchable list of Nigerian banks and fintechs), Paystack public key, design (Royal, Atelier or Noir in any colour), signature and plan.

## Each document has its own setup
| | Invoice | Receipt | Quotation |
|---|---|---|---|
| Chapter I | Client (+ optional pay-by and expiry dates) | Who paid you? | Who is the quote for? |
| Chapter II | Items, discount, delivery, VAT | **Quick receipt** (amount + "being payment for") or itemised | Items, discount, delivery, VAT |
| Chapter III | Payment status, deposit, bank | Method, transaction reference, date paid, balance still owed | Price valid for, deposit to begin (%), delivery timeline |
| On the document | Status, pay-by/expiry, bank box | Classic "Received from … the sum of … being payment for …" line, Amount received, Received by signature, PAID stamp | Valid until, timeline, deposit in naira, "To accept, pay the deposit to", Accepted by / Signature / Date block |

## Six documents
Invoice, Receipt and Quotation, plus Delivery note, Credit note and Purchase order. Each has its own steps and layout.
- **Delivery note:** quantities only, rider/vehicle, delivery address, and a "Received in good condition by" block.
- **Credit note:** reason, how it's settled (store credit or refund), and the invoice it's against.
- **Purchase order:** supplier, deliver-by date, your delivery address, and a "Supplier acknowledgement" block.

Start a delivery note or credit note from an invoice in one tap.

## Overview (the money dashboard)
Opens from **Overview** in the top bar:
- Received this month, owed to you, invoices this month, open quotations.
- A six-month chart of money received.
- **Who owes you:** each unpaid invoice with **Remind** (Gentle / Due today / Overdue WhatsApp messages) and **Got paid** (issues the receipt).
- **Repeat invoices:** switch on "Repeat every month" when sending, and the invoice is ready each month with one tap.
- **Top clients** and **VAT collected** per month.
- **CSV export** for Excel or Google Sheets, e.g. for your accountant.

## Other touches
- **Item photos:** add a photo to any item. It shows on the document and the client page.
- **Client page language:** English, Pidgin, Yorùbá, Igbo or Hausa greetings, with "Thank you" in the same language.
- **Prepared by:** each device can carry a name (e.g. a sales assistant), shown on the documents it prepares.

## Cloud backup (needs Supabase connected)
Each licence has one backup of its documents, clients, saved items and settings, shared by all its devices.
- A new phone restores everything and skips the welcome.
- Saving checks a version number, so two devices can't overwrite each other's newer work. They merge instead.
- The top bar shows **Backed up / Saving… / Offline · will retry**.

## Referrals
- Every buyer gets a referral code (e.g. REF-7F3A21), shown in My house → Refer a friend, with a WhatsApp share button.
- When someone buys with a code, create their licence with `select public.new_licence('Name', 'email', 'phone', 2, 'signature', 'REF-7F3A21');`.
- See who referred whom with the query at the bottom of `licences.sql`.
- Set the friend's discount wording in `CONFIG.REFERRAL_OFFER`, and honour it on Selar.

## Install on a phone
Aurum is an installable app (manifest, icons and offline support via `sw.js`). Buyers install it from My house → "Aurum on your home screen", or from the browser menu. It then opens full screen with its own icon and works without data.

**Note:** offline support only works when the app is served from a real web address (Netlify etc.), not opened as a file.

## The sales page
`landing.html` sells Aurum, using real screenshots of the product (in `landing/`). Set your Selar link, WhatsApp number and prices in its `CONFIG` at the bottom. When you host the folder, put the sales page on your main address and point "Try it free" at the app, e.g. rename `landing.html` to your home page and keep the app at `index.html` in a subfolder, or set `APP_LINK`.

## One tap from one document to the next
**Quotation → Invoice:**
- Tap **Make invoice** on a quotation's Send step or in the saved list, or tap the quotation chip when starting an invoice.
- Items, client, discount and deposit note carry over, and the invoice shows "Quotation ref.".

**Invoice → Receipt:**
- Tap **Issue receipt** on an invoice's Send step or in the saved list, or tap the invoice chip ("INV-0042 · ₦325,000 due") when starting a receipt.
- The receipt is pre-filled with the amount still owed and "being payment for Invoice INV-0042 (…)".
- Change the amount for a part payment, and the balance outstanding updates itself.
- **The invoice keeps itself up to date.** Each receipt adds to what's been paid, so the invoice shows "Part-paid · ₦125,000 left", then **Paid** once it's settled.

## Customise (separately for invoices, receipts and quotations)
Open it from **Customise** above the preview, the Send chapter, or My house → Documents. A small live preview sits at the top of the panel.
- **Title:** e.g. Invoice, Proforma Invoice, Sales Invoice, Bill; Receipt, Payment Receipt; Quotation, Estimate, Proposal; or their own.
- **Watermark:**
  - Off, their monogram, their business name, or text (PAID, ORIGINAL, COPY, CONFIDENTIAL, DRAFT or their own words).
  - Strength: subtle, medium or strong.
- **Show or hide:** logo, tagline, item numbers, amount in words, bank/payment box, seal, signature, note, thank-you line, QR code.
- **Footer line and terms & conditions,** with ready-made terms to tap.
- **Design, colour and paper:** ivory or bright white.

**Faster filling:** every saved document has **Copy** (start a new one with the same client and items) and quotations have **Make invoice** (convert in one tap).

## Opening styles (chosen per invoice in the Send chapter)
- **Wax-seal envelope:** the seal cracks along the flap edge. The top half lifts away with the flap, the bottom half stays on the envelope, and the letter slides out.
- **Gift box:** a satin bow unties, the ribbons slip off, the lid lifts, and the invoice rises out glowing.
- **Invitation card:** a black card with a gold frame lifts towards the client and turns over to reveal the amount.
- **Straight to invoice:** no animation, for clients in a hurry.

## Valid until (optional)
Invoices don't need a pay-by date. The business can set an optional **Valid until** date. If it passes and the invoice is still unpaid:
- The document shows an **EXPIRED** stamp.
- The client's link shows "This invoice has expired" with a **Request a new invoice** button that opens WhatsApp to the business.

## The private link (the signature feature)
When the client opens the link:
1. A black paper envelope with a gold-foil lining appears under drifting gold dust, sealed with the business's own wax seal. The seal is generated from their name and colour, with an embossed gilded monogram.
2. The client taps the seal. It cracks along a jagged line and the halves fall with gravity, scattering crumbs. The phone gives a small vibration where supported.
3. The flap swings open in 3D, the letter slides out of the pocket, and it moves towards the reader.
4. A personal page follows:
   - "Dear Chief Mrs. Adebayo," with the amount counting up in gold and a due-date countdown.
   - A three-step guide that lights up step by step: review → pay → let us know.
5. **Payment:**
   - **Paystack button** (when the business adds its public key): card, transfer or USSD inside the page.
   - **Bank transfer** with a one-tap Copy button for the account number.
6. **Thank-you card:** after paying, or tapping "I've paid", the client gets an animated card with gold leaf falling. They can save it, and it has a button to send proof on WhatsApp.
7. The official PDF is ready to download. A green "Verified document" check confirms it's genuine, and the PDF carries a QR code that opens the verified copy.

**Business owners see activity in "Sent & saved":** "Opened 2×", "Paid via Paystack", "Client says paid", and "Quote accepted".

## Plans

| | Free trial | Signature | Prestige |
|---|---|---|---|
| Full studio | ✓ | ✓ | ✓ |
| Corner "DEMO" ribbon | ✓ | — | — |
| Short verified links, QR codes, open tracking | — | ✓ | ✓ |
| Devices | this one | 2 | 3 |
| Own web address (e.g. invoice.theirbrand.ng) | — | — | ✓ |
| No Aurum branding on the client page | — | — | ✓ |

Trial links still work, but the invoice travels inside the link itself, so they're long and unverified.

## One buyer, one licence: how sharing is stopped
1. **Device lock.** A key works on 2 devices (3 for Prestige). A friend's phone is refused.
2. **Business lock.** The first business name that sends with a key is locked to it. If a friend somehow got in, they couldn't send invoices under their own business name. You can unlock it if a buyer genuinely rebrands.
3. **Switch-off.** Turn off any key, and its links stop working too.

**Limit:** someone skilled in coding could copy the file and use it in trial mode without the ribbon. They still wouldn't get verified links, short links, tracking or the business lock, because those live on your server.

## What it costs you (you can start at ₦0)
| Service | Cost | Notes |
|---|---|---|
| Netlify or Cloudflare Pages (hosting) | Free | Plenty for thousands of buyers. |
| Supabase (licences and links) | Free | 500 MB database. **A free project pauses after about a week with no activity.** Once buyers use it daily it stays awake. If it ever pauses, you click "Restore" in Supabase. |
| Paystack | Free for you | Each business uses **their own** Paystack account. Paystack charges *them* a per-payment fee, not you. |
| Custom web address (Prestige) | Paid by the buyer | The buyer buys their own domain (roughly ₦10k–₦20k/year from a registrar). You connect it in Netlify for free. |
| Selar | Takes a cut of each sale | Check Selar's current fee. Nothing to pay upfront. |
| Fonts, QR code and image libraries | Free | Loaded from free public CDNs. |

## Set-up (about 15 minutes)

### 1. Create the database
1. Make a free account at supabase.com and create a new project.
2. Open **SQL Editor**, paste everything in `licences.sql`, and click **Run**. It's safe to run again after updates.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

### 2. Connect the app
Fill in the settings near the top of the script in `index.html`:
```js
const CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  BUY_LINK: "https://selar.co/your-product",
  SELLER_WHATSAPP: "2348031234567",
  OFFLINE_GRACE_DAYS: 7,
};
```
The anon key is designed to be public. The database only lets it call the licence and link functions, so it can't read your buyer list or create keys.

### 3. Put it online
Drag this folder onto app.netlify.com/drop, or connect the repo to Netlify or Cloudflare Pages with `products/aurum-invoice` as the folder.

### 4. Sell on Selar
Selling is manual for now:
1. Set your Selar product to deliver a short note: *"Thank you! Send your Selar receipt to us on WhatsApp to receive your personal licence key."*
2. When a buyer messages you, run this in the Supabase SQL Editor:
   ```sql
   select public.new_licence('Chioma Eze', 'chioma@example.com', '08031234567');
   -- Prestige: select public.new_licence('Chioma Eze', 'chioma@example.com', '08031234567', 3, 'prestige');
   ```
3. Send them the key and the app link.

Check whether Selar can deliver a unique code per buyer automatically. If it can, you can upload a batch of keys and skip step 2.

### 4b. Online checkout with Paystack (instead of selling by hand)

Buyers pay on Paystack's own payment page (card, transfer or USSD), come back to the sales page, and their licence key appears on the screen straight away. (The Paystack popup was dropped because some phone browsers show it as a blank white screen.)

1. Run the whole of `licences.sql` in the Supabase SQL editor (it includes the checkout tables).
2. Deploy `functions/paystack/index.ts` as an Edge Function named `paystack`, with JWT verification **off** (Paystack cannot send a login). Every payment is re-checked with Paystack anyway. Redeploying switches JWT verification back on, so turn it off again each time. Set `SITE_URL` in the function to your website address.
3. In Supabase, Edge Functions, Secrets, add `PAYSTACK_LIVE_SECRET_KEY` and `PAYSTACK_TEST_SECRET_KEY`. These stay in Supabase only.
4. In Paystack, Settings, API Keys & Webhooks, set both the test and the live webhook URL to
   `https://<your-project>.supabase.co/functions/v1/paystack`
5. Put the two **public** keys in `CONFIG` in `landing.html`.
6. Switch it on: `update app_config set value = 'test' where key = 'paystack_mode';` (pretend money, the key it gives is switched off), then `'live'` for real money. While it is `'off'`, the buy buttons open WhatsApp instead.

Prices are decided in the database (`price_kobo`), not in the browser, and the Black Friday price ends by itself on the date in `promo_ends`. Keys made this way are created fresh, so they never touch the 200 pre-made keys.

### 5. Prestige: connect their own web address
In Netlify, open **Domain management → Add a domain alias**, enter the buyer's address (e.g. `invoice.theirbrand.ng`), and give them the DNS record Netlify shows. Once it's live, the buyer opens the app from their own address, and every link they send uses it automatically. Then upgrade their key:
```sql
update licences set plan = 'prestige', max_devices = 3 where key = 'AUR-XXXX-XXXX-XXXX';
```

### Everyday admin
These commands are at the bottom of `licences.sql`:
- **Block a shared key:** `update licences set active = false where key = '...';`
- **Buyer changed phone:** `delete from licence_devices where licence_key = '...';`
- **Buyer rebranded:** `update licences set business_name = null where key = '...';`

## Pricing ideas
- **Signature:** ₦15,000–₦25,000 one-time.
- **Prestige:** ₦50,000+ one-time, plus the buyer's own domain.
- **Launch offer:** the first 20 buyers at a discount in exchange for a testimonial video of their client opening the envelope.
