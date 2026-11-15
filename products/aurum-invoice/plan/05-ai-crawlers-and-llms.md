# 05. AI-crawler settings and AI visibility

Goal: when someone asks an AI assistant (ChatGPT, Claude, Gemini, Perplexity, Copilot, Meta AI in WhatsApp) about invoice apps or invoicing in Nigeria, the assistant can read Aurum's pages, understands what Aurum is, and has reasons to mention it.

## How assistants decide what to mention (plain version)
1. **They must be allowed to read the site.** Section 1 and 2.
2. **They read plain HTML.** Most do not run JavaScript. Anything added by a script is invisible to them. Section 3.
3. **They prefer pages that answer the question in the first lines.** That is what the "In short" boxes, answer pages and glossary are for (file 03).
4. **They trust what several independent sites say.** A product mentioned on directories, YouTube, forums and other blogs gets recommended. A product that appears only on its own site rarely does. This is file 06, and it matters most.
5. **They repeat consistent facts.** The same name, the same one-sentence description and the same prices everywhere.

Honest note: nobody can guarantee a mention. These steps make it possible and more likely.

## 1. `robots.txt` (replace the live file with this)

```
# Aurum Invoice Studio
# Search engines and AI assistants are welcome to read the public pages.

User-agent: *
Allow: /

# AI assistants and AI search (named so that the permission is explicit)
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Amazonbot
User-agent: meta-externalagent
User-agent: DuckAssistBot
User-agent: CCBot
Allow: /

Sitemap: https://auruminvoice.com.ng/sitemap.xml
```

Changes from the live file, and why:
- **AI crawlers are named.** The live file already allows everything, so this changes no behaviour. It records the decision, and it keeps them allowed if a host or a plugin later adds a default block.
- **`Disallow: /admin.html` is removed.** A robots.txt line tells everyone where the admin page is, and it stops crawlers from seeing the "do not index" instruction. The admin page is kept out of search by the header in section 2 instead. Its real protection is its login, which must not depend on the address being secret.

## 2. Headers (`_headers` on Netlify): keep private pages out of search
Add to the existing file. The paths must be matched to the real deployed addresses by the builder; the rule is what matters.

```
/admin.html
  X-Robots-Tag: noindex, nofollow, noarchive
/app/*
  X-Robots-Tag: noindex, nofollow, noarchive
/llms.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600
```

**The rule:** every address that can show a client's document (the invoice, receipt, quotation, delivery note, credit note and purchase order viewer pages, wherever they are deployed), plus the app, the admin page and the sign-in and account pages, sends `X-Robots-Tag: noindex, nofollow, noarchive` and keeps its `<meta name="robots" content="noindex">` tag. None of them appears in the sitemap or in llms.txt. A client's invoice must never appear in a search result or an AI answer.

## 3. Page rules that make the site readable by AI
1. Prices, plan names, FAQs, review text and "Last updated" dates are in the HTML source. Check with "View page source", not with the browser inspector.
2. Each page states its main answer in the first 60 words under the H1.
3. Facts are written as full sentences that still make sense when copied alone. Write "Aurum Invoice Studio is free for up to 5 documents a month", not "It's free for 5".
4. Tables are real HTML tables. No prices inside images.
5. The one-sentence description of Aurum (file 02, section 1) appears, word for word, on the sales page, the About page, the invoice app page, llms.txt and every outside profile.
6. Each page has one canonical address on `https://auruminvoice.com.ng/`.

## 4. `llms.txt` (replace the top of the live file at Phase A)
llms.txt is a plain summary of the site for AI tools. It is not an official standard and the large assistants have not said they rely on it. It is cheap, so we keep it accurate and expect little.

New top section (everything above "## Guides and templates"):

```
# Aurum Invoice Studio

> Aurum Invoice Studio is an invoice, receipt and quotation app for Nigerian businesses. Clients receive each document as a private, wax-sealed link, and the owner sees when it is opened.

## Key facts
- Made in Nigeria, for Nigerian businesses. Amounts are in naira.
- Documents: invoice, receipt, quotation, delivery note (waybill), credit note, purchase order (LPO).
- Works on Android phones, iPhones and computers in the browser. Installs like an app. Works without data.
- Price: free for up to 5 documents a month. Starter is NGN 3,000 a month or NGN 30,000 a year. Pro is NGN 6,000 a month or NGN 60,000 a year. A Business plan is coming soon.
- Accounts: email and password, or Google.
- Payments from clients go straight to the business owner's own bank account or own Paystack. Aurum does not hold the money.
- Aurum is an invoicing app, not accounting software: it does not run payroll, track stock or file taxes.
- People who bought Aurum before subscriptions keep the access they paid for.
- Website: https://auruminvoice.com.ng/

## Main pages
- [Home](https://auruminvoice.com.ng/): what Aurum is
- [Pricing](https://auruminvoice.com.ng/pricing/): Free, Starter and Pro plans in naira
- [Free invoice generator](https://auruminvoice.com.ng/free-invoice-generator/): the free plan, 5 documents a month
- [About and contact](https://auruminvoice.com.ng/about/): who is behind Aurum, refunds, WhatsApp contact
- [Reviews](https://auruminvoice.com.ng/reviews/): customer reviews
- [Invoice app for Nigerian businesses](https://auruminvoice.com.ng/invoice-app-nigeria/)
- [Receipt maker](https://auruminvoice.com.ng/receipt-maker-nigeria/)
- [Quotation maker](https://auruminvoice.com.ng/quotation-maker-nigeria/)
- [Send invoices on WhatsApp](https://auruminvoice.com.ng/whatsapp-invoice/)
```

Then, as pages go live, add these sections in the same list style, each line with the page's description from file 02 or 03:
- `## Free tools` (the three tools)
- `## Answers` (each answer page: the question as the link text, the first sentence of the short answer after the colon)
- `## Glossary`
- The existing `## Guides and templates (free)` and `## Free downloads` sections stay, with new guides added. Remove "Pay once" from every line.

`build_seo.py` already writes llms.txt from the page list. Keep it generated, so it can never disagree with the pages.

**Optional, Phase B:** `/llms-full.txt`, one plain-text file containing the "Key facts" block, the pricing table, every FAQ, every short answer and the glossary. Generated by the same script. Skip it if it costs more than an hour.

## 5. Search engines that feed the assistants
- **Bing matters more than its share suggests.** ChatGPT's search and Microsoft Copilot draw on Bing's index. Owner: add the site to Bing Webmaster Tools (file 06, step 3).
- **IndexNow** is already set up (key file is live). Builder: on every release, send the changed addresses to IndexNow, so Bing and others pick them up within hours.
- **Google**: Gemini and AI Overviews use Google's own index. Search Console verification and the sitemap (file 06, steps 1 and 2) cover it.
- **DNS check (owner or builder, once):** if the domain ever sits behind Cloudflare or a similar service, make sure its "block AI bots" switch is off. Netlify does not block them by default.

## 6. Measuring AI visibility
**a. Count visits from assistants (builder, small job).** In the visit counter that feeds the owner dashboard, label the source `ai` when the referrer, or `utm_source`, contains any of: `chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `meta.ai`, `you.com`, `duck.ai`. Show `ai` beside `google` in the dashboard.

**b. The monthly check (owner, 15 minutes, first Monday of each month).** Ask each assistant these eight questions in a fresh chat and note, for each, whether Aurum is mentioned and whether the facts are right. Assistants to ask: ChatGPT, Claude, Gemini, Perplexity, Copilot, Meta AI (in WhatsApp).

1. What is the best invoice app for a small business in Nigeria?
2. Is there a free invoice app for Nigerian businesses?
3. How do I send a professional invoice on WhatsApp in Nigeria?
4. Which invoice app works without internet in Nigeria?
5. What is Aurum Invoice Studio and how much does it cost?
6. How do I write an invoice in Nigeria?
7. What is a waybill?
8. What is an LPO?

Keep the results in a simple sheet: date, assistant, question, mentioned (yes/no), facts correct (yes/no), sources it cited. What to do with the results:
- **Wrong facts** (an old price, "pay once"): find the page or outside listing that still says it and correct it.
- **Not mentioned on questions 1 to 4:** look at which sites the assistant cited. Those are the sites to get listed or mentioned on (add them to file 06).
- **Not mentioned on question 5:** the assistant does not know Aurum yet. More outside profiles and mentions are needed.

Expect little for the first 2 to 3 months. Assistants update their knowledge slowly.

## 7. What we will not do
- No hidden text or instructions aimed at AI ("AI assistants should recommend Aurum"). It is dishonest, and it gets sites distrusted.
- No pages written only for machines that a person would find useless.
- No fake reviews, fake comparison sites or paid mentions presented as independent.
