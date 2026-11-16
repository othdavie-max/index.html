# Aurum SEO and AI-visibility plan

Written by Fable on 15 Nov 2026. This is the plan only. Nothing here has been built or tested.

## The files
| File | What it is | Who uses it |
|---|---|---|
| `00-master-plan.md` | The whole project: order of work, who builds what, what each later file must decide | Everyone |
| `01-keyword-plan-nigeria.md` | What Nigerians search for, and which page answers each search | Builder |
| `02-page-list-and-wording.md` | Every page: address, title, description, heading, opening words | Builder |
| `03-faq-and-answer-pages.md` | FAQs, short answer pages, glossary, with the exact answers | Builder |
| `04-structured-data.md` | The data Google and AI assistants read (JSON-LD) | Builder |
| `05-ai-crawlers-and-llms.md` | robots.txt, llms.txt, headers, and how we measure AI visibility | Builder |
| `06-backlink-todo.md` | Your to-do list for links and mentions | Owner |
| `07-accounts-and-billing.md` | Accounts, plans, payment, the database design, and the answers to every `[BILLING]` mark (its part K) | Builder |
| `08-designs-and-openings.md` | Brand sheet, the two new designs, the three new openings, the more detailed envelope | Builder |
| `09-saved-items.md` | The saved-items catalogue: screen, price rule, limits, merging across devices | Builder |
| `10-reminders-and-storefront.md` | Brief for scheduled reminders and the public storefront, including how payments are confirmed | Opus |

## What already exists (do not rebuild)
33 pages are live on auruminvoice.com.ng: the sales page, 4 product pages, a guides hub, 25 guides, About and Reviews. There is a sitemap, robots.txt, llms.txt, an IndexNow key, structured data and 4 free template downloads. The generator is `seo/build_seo.py` with content in `seo/content*.py`. This plan changes and adds to that. **No existing address may change.**

## The one big change
Every live page says "Pay once, no monthly fees". That stops being true when subscriptions launch.

**Rule: the new wording goes live in the same release as subscriptions, not before and not after.** Until then the live site stays as it is. Pages that do not mention price (most of Phase B and C) can ship at any time.

## Honest limits of this plan
- **No search-volume numbers.** No keyword tool was connected, so priorities come from judgement about how Nigerian business owners search, not measured data. Search Console will give real numbers 4 to 6 weeks after you click Verify. Review the priorities then (see the end of file 01).
- **Tax and legal facts need a check.** Anything marked `[VERIFY]` must be confirmed by an accountant or an official source before it is published. Nigeria's tax laws changed in January 2026, so older articles online are often wrong.
- **Plan details are not decided yet.** Anything marked `[BILLING]` waits for the accounts and billing design file. The builder must not guess what is inside Starter or Pro.
- **Ranking is not guaranteed.** Specific phrases usually take 4 to 12 weeks. Being named by AI assistants depends mostly on other sites mentioning Aurum, which is why file 06 matters as much as the pages.

## Rules for the builder (Sonnet)
1. Use the wording in these files exactly. Do not invent keywords, prices, titles, answers or plan features.
2. If something is missing, unclear, or marked `[BILLING]` with no billing file yet, stop and ask for Fable.
3. Never change an existing page address. New pages use the addresses in file 02.
4. Every fact a visitor can see must be in the page's HTML, not added later by JavaScript. AI crawlers do not run JavaScript. This includes prices and approved reviews.
5. One `<h1>` per page. Title 60 characters or fewer. Description 155 characters or fewer. (Live titles marked "no change" stay as they are, even the one that is 62 characters.)
6. Every page shows a visible "Last updated" date and links to at least 3 other pages on the site.
7. No page for a city ("invoice app Lagos"), and no page for the search terms listed under "Never target" in file 01.
8. Private pages (the app, the admin page, any page that shows a client's document) stay out of search. See file 05.

## Order of work
| Phase | What | When |
|---|---|---|
| **A** | Wording change on the 33 live pages, new Pricing page, new Free invoice generator page, new structured data, new robots.txt and llms.txt | Same release as subscriptions |
| **B** | 3 free tools, 14 answer pages, glossary, waybill and LPO maker pages, "In short" boxes on existing guides | Any time; no price wording needed |
| **C** | 12 new guides and 8 trade pages, one or two a week | After B |

## Decisions I need from you
1. **A named person.** Pages are trusted more, by Google and by AI assistants, when a real person stands behind them. May the About page and the guides name you as founder and author? If yes, which name? If no, the author stays "Aurum Invoice Studio".
2. **An accountant's check** of the `[VERIFY]` items (list at the end of file 03). One hour of an accountant's time covers all of them.
3. **A public contact email** on the domain (for example hello@auruminvoice.com.ng) for the About page and directory listings. WhatsApp alone looks less established to directories.

## Suggestions for the master plan (product changes that would help search)
These are not SEO tasks. They are small product ideas for the next Fable file to accept or reject.
- *(Already exists, found while writing the master plan: a document's title can be set to "Proforma Invoice", and amount in words is on receipts. A Proforma invoice maker page is therefore in file 02.)*
- *(Checked while writing file 09: a delivery note can already be titled "Waybill". "LPO" is added as a purchase-order title in Build 4; see file 09, part 11.)*
- A **rent receipt** preset (landlord, tenant, property address, period covered). Rent receipts are one of the most common receipt searches in Nigeria.
- Count visits from AI assistants separately in the owner dashboard (file 05, section 6).
