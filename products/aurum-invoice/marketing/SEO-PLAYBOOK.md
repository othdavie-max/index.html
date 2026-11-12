# Aurum SEO playbook

What is already built: 21 pages (4 product pages, 15 guides, a guides hub, your sales page), a sitemap, a robots file, structured data (so Google can show your FAQs and your product details), and "do not index" tags on the private app pages.

Everything below is what only you can do. Start with Part 1 today. It takes about 20 minutes and is what makes Google notice the site.

## Part 1. Tell Google and Bing you exist (do this after you deploy the new zip)

### Google Search Console (free)
1. Go to search.google.com/search-console and sign in with your Google account.
2. Click **Add property**, choose **URL prefix**, and enter `https://auruminvoicestudio.netlify.app/`.
3. Verify ownership. Choose **HTML tag** and copy the `<meta name="google-site-verification" ...>` line it shows. Send it to me and I will put it in the site, then you deploy and click Verify. (Or choose the Google Analytics or Tag Manager methods if you use those.)
4. Open **Sitemaps** in the left menu, type `sitemap.xml` and click **Submit**.
5. Open **URL inspection**, paste `https://auruminvoicestudio.netlify.app/`, and click **Request indexing**. Do the same for `/guides/` and `/invoice-app-nigeria/`.

### Bing Webmaster Tools (free, 5 minutes)
Go to bing.com/webmasters, sign in, and choose **Import from Google Search Console**. It copies everything across. Bing also powers other search engines and AI assistants.

## Part 2. What to expect
- Google usually takes **a few days to a few weeks** to index new pages.
- Ranking for specific phrases ("invoice template Nigeria", "payment reminder message") usually takes **4 to 12 weeks**. Ranking for the single word "invoice" is not realistic.
- Check Search Console weekly: **Performance** shows which searches show your site. Look at queries where you appear on page 2 or 3. Those are the guides to improve first.

## Part 3. Off-site work (this is what lifts rankings the most)
Google ranks a site higher when other trusted sites link to it. All of these are free:

1. **YouTube.** Upload both ad videos to a YouTube channel called "Aurum Invoice Studio". Title the first one "Stop sending plain invoices | Aurum Invoice Studio" and the second "Invoice app for Nigerian businesses | How Aurum works". Put your website link in the first line of the description. YouTube videos often appear on Google's first page.
2. **Instagram, TikTok and Facebook bios.** Put `https://auruminvoicestudio.netlify.app/` in every bio.
3. **Turn each guide into a post.** A guide like "Payment reminder messages" is a ready-made carousel or short video. Post it and link to the guide.
4. **Nairaland, Reddit (r/Nigeria, r/smallbusiness) and Facebook groups for Nigerian business owners.** Answer real questions about invoices and late payment. Link to a guide only when it truly answers the question. Do not spam. Posts that only advertise get removed.
5. **LinkedIn and X.** Share a guide each week.
6. **Directories.** List the app on AlternativeTo, Product Hunt and Nigerian startup and tech directories. Each listing is a link back to you.
7. **Ask happy customers** to mention you, or to leave a genuine review. Never buy reviews or links. It can get the whole site penalised.

## Part 4. Keep adding pages (the long game)
Each new guide is another chance to show up on Google. Aim for **one new guide a week**. Ideas that people search for:
- "How to write an invoice for a freelancer in Nigeria"
- "Invoice for a photographer / caterer / event planner / tailor" (one page per trade)
- "Invoice for a graphic designer in Nigeria"
- "How to price your services in Nigeria"
- "Terms and conditions for small business invoices"
- "How to write a business receipt for cash payments"
- "What to do when a customer will not pay"
- "How to start a small business in Lagos" (a wide net that leads to your tools)
- "Invoice number format: how to number your invoices"
- "Late payment fee: how to add one to an invoice"
Tell me the topic and I will write and publish it in the same style.

## Part 5. Do these three upgrades when you can
1. **Buy your own domain** (about N10,000 to N20,000 a year), such as `aurum-invoice.com` or a `.ng` name. Google trusts a name you own more than a `netlify.app` address, and it looks more serious. Tell me before you buy and I will move everything across, including the Paystack return address.
2. **Prices change by themselves.** The sales page, the checkout, the database and the data Google reads all follow the same calendar: Black Friday until 30 Nov, End of Year until 30 Dec, New Year until 10 Jan, then the normal prices. Nothing to update by hand.
3. **Collect real reviews.** When you have genuine customers who agree, ask them for a short review and a name. I can add review markup, which can show stars on Google. Never invent reviews.

## Part 6. What not to do
- Do not buy backlinks or "SEO packages" from strangers.
- Do not copy other people's guides. Google ignores or penalises copied content.
- Do not stuff the same phrase into every sentence. The pages are written to read naturally.
- Do not change page addresses once Google has found them.
- Keep the private app pages out of Google. They are already marked "do not index" so that clients' invoices never appear in search.

## Reading your SEO numbers
Every guide and product page now counts visits and button clicks in your owner dashboard (admin page), under the same stats as the sales page.
- Pages show as `seo/g/<guide name>` (guides) or `seo/<page name>` (product pages).
- Visitors who came from Google are labelled **google** as their source, and the label follows them to the sales page, so you can see how many Google visitors tapped "Get Aurum" or paid.
- The Meta Pixel is also on these pages, so you can run a cheap ad aimed only at people who read a guide and did not buy. Ask me to set it up once a few hundred people have visited.
