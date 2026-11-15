# 04. Structured data (JSON-LD)

Structured data is a hidden block that tells Google, Bing and AI assistants plainly what a page is. The live pages already have it. This file says what changes and what the new pages need.

## Rules
1. One `<script type="application/ld+json">` per page, holding one `@graph`.
2. Mark up only what a visitor can see on that page. No hidden FAQs, no invented ratings.
3. Same `@id` for the same thing on every page (below), so machines see one organisation and one app, not thirty-three.
4. Prices in structured data must equal the prices in the visible text. When a price changes, both change in the same release.
5. Dates as `YYYY-MM-DD`. `dateModified` changes only when the content really changed.

## What to expect (honest)
- **FAQ markup no longer shows drop-down FAQs on Google** for ordinary business sites (Google limited that in 2023). It stays because it costs nothing and helps machines read the answers.
- **Star ratings** can show for the app only when real, approved reviews are visible on the page.
- Structured data helps machines understand the site. It does not lift rankings by itself.

## 1. On every page (the shared part)

```json
{
  "@type": "Organization",
  "@id": "https://auruminvoice.com.ng/#org",
  "name": "Aurum Invoice Studio",
  "url": "https://auruminvoice.com.ng/",
  "logo": "https://auruminvoice.com.ng/icons/icon-512.png",
  "description": "Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses.",
  "areaServed": { "@type": "Country", "name": "Nigeria" },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "areaServed": "NG",
    "availableLanguage": ["en"],
    "url": "https://auruminvoice.com.ng/about/"
  },
  "sameAs": [
    "https://www.instagram.com/auruminvoice",
    "https://www.facebook.com/profile.php?id=1527108630475190"
  ]
}
```
```json
{
  "@type": "WebSite",
  "@id": "https://auruminvoice.com.ng/#site",
  "url": "https://auruminvoice.com.ng/",
  "name": "Aurum Invoice Studio",
  "inLanguage": "en-NG",
  "publisher": { "@id": "https://auruminvoice.com.ng/#org" }
}
```

- Add `"email"` to `contactPoint` when the owner has a domain email (README decision 3).
- Add `"founder": {"@type":"Person","name":"..."}` only if the owner agrees to be named (README decision 1).
- Add each new profile to `sameAs` as the owner creates it (YouTube, TikTok, LinkedIn, X, Crunchbase). Only real, live profiles.

## 2. Sales page (`/`), Phase A
Replace the current `SoftwareApplication` block and its eight dated one-time offers with this. The app now has an `@id` so other pages can point to it.

```json
{
  "@type": "SoftwareApplication",
  "@id": "https://auruminvoice.com.ng/#app",
  "name": "Aurum Invoice Studio",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Invoicing",
  "operatingSystem": "Android, iOS, Web",
  "inLanguage": "en-NG",
  "url": "https://auruminvoice.com.ng/",
  "description": "Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses. Clients receive each document as a private, wax-sealed link, and the owner sees when it is opened.",
  "image": "https://auruminvoice.com.ng/app/og/sales.jpg",
  "featureList": [
    "Invoices, receipts and quotations",
    "Delivery notes (waybills), credit notes and purchase orders (LPOs)",
    "Private wax-sealed link for each document",
    "Shows when the client opens the document",
    "Works without data",
    "WhatsApp payment reminders"
  ],
  "publisher": { "@id": "https://auruminvoice.com.ng/#org" },
  "offers": [
    { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "NGN",
      "description": "5 documents a month",
      "availability": "https://schema.org/InStock", "url": "https://auruminvoice.com.ng/pricing/" },
    { "@type": "Offer", "name": "Starter (monthly)", "price": "3000", "priceCurrency": "NGN",
      "priceSpecification": { "@type": "UnitPriceSpecification", "price": "3000", "priceCurrency": "NGN", "billingDuration": "P1M" },
      "availability": "https://schema.org/InStock", "url": "https://auruminvoice.com.ng/pricing/" },
    { "@type": "Offer", "name": "Starter (yearly)", "price": "30000", "priceCurrency": "NGN",
      "priceSpecification": { "@type": "UnitPriceSpecification", "price": "30000", "priceCurrency": "NGN", "billingDuration": "P1Y" },
      "availability": "https://schema.org/InStock", "url": "https://auruminvoice.com.ng/pricing/" },
    { "@type": "Offer", "name": "Pro (monthly)", "price": "6000", "priceCurrency": "NGN",
      "priceSpecification": { "@type": "UnitPriceSpecification", "price": "6000", "priceCurrency": "NGN", "billingDuration": "P1M" },
      "availability": "https://schema.org/InStock", "url": "https://auruminvoice.com.ng/pricing/" },
    { "@type": "Offer", "name": "Pro (yearly)", "price": "60000", "priceCurrency": "NGN",
      "priceSpecification": { "@type": "UnitPriceSpecification", "price": "60000", "priceCurrency": "NGN", "billingDuration": "P1Y" },
      "availability": "https://schema.org/InStock", "url": "https://auruminvoice.com.ng/pricing/" }
  ]
}
```

- **No offer for Business.** It has no price yet.
- **`featureList`** lists only what works on the day of release. "WhatsApp payment reminders" means the one-tap reminder messages that exist today.
- **Plus** a `FAQPage` block holding the 11 questions from file 03, section 1, word for word.
- **Ratings:** add `aggregateRating` to the app only when at least 5 approved reviews are shown on the page in HTML. `ratingValue` and `reviewCount` are worked out from those approved reviews at build time. Never typed in by hand, never rounded up.

```json
"aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "12", "bestRating": "5" }
```
*(The numbers above show the shape only.)*

## 3. Pricing page (`/pricing/`)
`WebPage` + `BreadcrumbList` + `FAQPage` (file 03, section 2, only the questions that have answers). Point at the app instead of repeating the offers:

```json
{
  "@type": "WebPage",
  "@id": "https://auruminvoice.com.ng/pricing/#page",
  "url": "https://auruminvoice.com.ng/pricing/",
  "name": "Aurum Invoice Studio Pricing: Free, Starter and Pro",
  "isPartOf": { "@id": "https://auruminvoice.com.ng/#site" },
  "about": { "@id": "https://auruminvoice.com.ng/#app" },
  "dateModified": "2026-11-15"
}
```

## 4. Product pages
`/invoice-app-nigeria/`, `/receipt-maker-nigeria/`, `/quotation-maker-nigeria/`, `/whatsapp-invoice/`, `/free-invoice-generator/`, `/delivery-note-maker/`, `/purchase-order-maker/`

Keep the present pattern: `WebPage` + `BreadcrumbList` + `FAQPage`. Add `"about": {"@id": "https://auruminvoice.com.ng/#app"}` to the `WebPage`. Do not repeat the offers here.

## 5. Guides (live and new)
Keep `Article` + `BreadcrumbList` + `FAQPage`. Make sure every `Article` has all of these:

```json
{
  "@type": "Article",
  "headline": "Free Invoice Template for Nigeria (Copy and Use)",
  "description": "...same as the meta description...",
  "image": "https://auruminvoice.com.ng/og/...jpg",
  "datePublished": "2026-10-01",
  "dateModified": "2026-11-15",
  "inLanguage": "en-NG",
  "author": { "@id": "https://auruminvoice.com.ng/#org" },
  "publisher": { "@id": "https://auruminvoice.com.ng/#org" },
  "mainEntityOfPage": "https://auruminvoice.com.ng/guides/invoice-template-nigeria/"
}
```
- If the owner agrees to be named, `author` becomes `{"@type":"Person","name":"...","url":"https://auruminvoice.com.ng/about/"}` and the same name shows on the page.
- `datePublished` is the real first publish date of each guide. Do not reset it.

## 6. Answer pages (`/answers/...`)
`WebPage` + `BreadcrumbList` (Home > Answers > the question) + a `FAQPage` with exactly one question: the page's question and its short answer, word for word.

```json
{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is a waybill?",
    "acceptedAnswer": { "@type": "Answer", "text": "In Nigeria, a waybill is the note that travels with goods being delivered. ..." }
  }]
}
```
The hub `/answers/` is a `CollectionPage`, like the guides hub.

## 7. Glossary (`/glossary/`)
```json
{
  "@type": "DefinedTermSet",
  "@id": "https://auruminvoice.com.ng/glossary/#terms",
  "name": "Invoice and receipt terms used in Nigeria",
  "inLanguage": "en-NG",
  "hasDefinedTerm": [
    { "@type": "DefinedTerm", "name": "Waybill",
      "description": "The note that travels with goods being delivered, listing what was sent and who should receive it. The Nigerian name for a delivery note.",
      "url": "https://auruminvoice.com.ng/glossary/#waybill" }
  ]
}
```
One `DefinedTerm` per row of the glossary table in file 03, plus `WebPage` and `BreadcrumbList`.

## 8. Free tools (`/tools/...`)
```json
{
  "@type": "WebApplication",
  "name": "Nigeria VAT calculator",
  "url": "https://auruminvoice.com.ng/tools/vat-calculator-nigeria/",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript",
  "inLanguage": "en-NG",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "NGN" },
  "publisher": { "@id": "https://auruminvoice.com.ng/#org" }
}
```
Same shape for the other two (`"applicationCategory": "BusinessApplication"`), plus `BreadcrumbList`. The hub `/tools/` is a `CollectionPage`.

## 9. About and Reviews
- `/about/`: change `WebPage` to `AboutPage`. Keep the FAQ.
- `/reviews/`: keep as it is. Approved reviews must be in the HTML at build time (README rule 4). Each shown review may be marked up as a `Review` of `{"@id": "https://auruminvoice.com.ng/#app"}` with the reviewer's displayed name, the rating and the date. Only approved, real reviews.

## 10. Videos (when the YouTube channel exists)
On any page that embeds one of the videos, add a `VideoObject` with `name`, `description`, `thumbnailUrl`, `uploadDate` and `embedUrl`, taken from the real YouTube video.

## 11. Not used, on purpose
- `HowTo`: Google no longer shows it.
- `LocalBusiness`: only with a real public address. A made-up address can get a listing removed.
- `Product` for the app: `SoftwareApplication` is the right type.
- `QAPage`: it is for pages where users post answers.

## 12. Checks for the builder before each release
1. Every changed page passes Google's Rich Results Test and the Schema.org validator with no errors.
2. The prices in the `offers` match the visible prices on `/` and `/pricing/`.
3. Every FAQ in the data appears on the page with the same words.
4. No block mentions "Signature", "Prestige", "licence" or a one-time price after Phase A.
