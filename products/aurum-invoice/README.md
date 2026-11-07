# Aurum Invoice Studio

Luxury invoices, receipts and quotations for Nigerian businesses. It's one HTML file with no build step, and it's free to host.

This folder is a separate product. It isn't part of the Baseline Educational Services website.

## What buyers get
- **Three documents in one tool:** Invoice, Receipt and Quotation, with automatic numbers (INV-0001, RCT-0001, QUO-0001).
- **Three designs:**
  - **Royal:** brand-colour band with gold foil.
  - **Atelier:** white, editorial.
  - **Noir:** black with a gold frame.
- **Brand colour:** six preset colours, or pick any custom colour.
- **Their own branding:** logo upload, business details, CAC/RC number, TIN, and bank details. These are saved on the device, so they type them once.
- **Automatic company seal** with their business name around the ring, plus a typed or uploaded signature.
- **Totals in ₦ (or $ / £):** discount (amount or %), delivery fee, VAT (7.5% by default), deposit paid and balance due.
- **Amount in words:** "Four Hundred and Seventy-Five Thousand Naira Only".
- **Status:** PAID and OVERDUE rubber stamps, and a part-paid status.
- **Saving and sending:**
  - Download as a PDF (A4).
  - Save as an image for WhatsApp. On Android it opens the share sheet straight away.
  - Send on WhatsApp opens a chat with the client, with the total, balance and bank details already written.
- **Saved documents list** to reopen past invoices.
- **Animation:** the invoice builds in on screen, totals count up, new items slide in, stamps land with a thud, and the gold foil shimmers. Animation turns off for people who have "reduce motion" switched on.

## Stopping people from sharing their licence
Each buyer gets a licence key like `AUR-7F3A-91C2-0BDE`. The first time they open the app, they enter the key, and it gets **locked to that phone or laptop**.
- One key works on **2 devices** (you can change this per buyer).
- If a buyer shares their key or link, their friend's device is refused once the 2 slots are used.
- You can **switch off a key** at any time, for example a refund or a key posted online. It stops working the next time the app is opened online.
- After 7 days without internet, the app asks to go online and re-check the licence.

Without a key, people can **try the demo**. It works fully, but every invoice carries an "AURUM DEMO" watermark. That's your free trial: they see how good it looks, then pay to remove the watermark.

**Limit:** this protection is strong enough to stop ordinary sharing between friends. A skilled programmer could still copy the file and remove the check, because the app runs in the browser. Version 2 (online accounts and live invoice links) moves the important parts onto a server and closes that gap.

## Set-up (about 15 minutes, free)

### 1. Create the licence database
1. Make a free account at supabase.com and create a new project.
2. Open **SQL Editor**, paste everything in `licences.sql`, and click **Run**.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

### 2. Connect the app
Open `index.html` and fill in the settings near the top of the script:

```js
const CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  BUY_LINK: "https://wa.me/234XXXXXXXXXX?text=I%20want%20to%20buy%20Aurum",
  OFFLINE_GRACE_DAYS: 7,
};
```

The anon key is designed to be public. The database only lets it call the licence check, so it can't read your buyers' list.

### 3. Put it online for free
Choose one:
- **Netlify Drop:** go to app.netlify.com/drop and drag this folder in. You get a link immediately.
- **Vercel or Cloudflare Pages:** connect the repo and set the root folder to `products/aurum-invoice`.

### 4. Sell a licence
When someone pays, open the Supabase SQL Editor and run:

```sql
select public.new_licence('Chioma Eze', 'chioma@example.com', '08031234567');
```

It returns their key. Send the key and the app link on WhatsApp.

### Everyday admin
These commands are at the bottom of `licences.sql`:
- **Block a shared key:** `update licences set active = false where key = '...';`
- **Buyer changed phone:** `delete from licence_devices where licence_key = '...';`
- **See who is using the app:** the report query.

## Pricing ideas
- **One-time licence:** ₦10,000–₦20,000.
- **Done-for-you set-up:** ₦25,000–₦50,000. You fill in their logo and details and send them the link.
- **Launch offer:** first 20 buyers at ₦7,500 in exchange for a testimonial or screenshot.

## Example details
The app opens with sample details (a fictional fashion house, "Adaeze Couture") so buyers see a finished invoice straight away. They tap **Start with my business** to clear it.
