# Handover from the long chat (15 Nov 2026)

Read WORKFLOW.md first, then this file.

## Where things stand
- Product: Aurum Invoice Studio, a luxury invoice/receipt/quotation PWA for Nigerian businesses. Live at https://auruminvoice.com.ng (Netlify, drag-and-drop zip). Old address auruminvoicestudio.netlify.app still works.
- Source: single-file app built from parts kept in the session scratchpad (build.py, package.sh, build_landing.py); the built outputs are in `products/aurum-invoice/` (`index.html` app, `landing.html` sales page, SEO pages in `seo/`). If the scratchpad is gone, edit the built files directly.
- Backend: Supabase project ymmxhjfcfaawrebxoxbu (Edge Functions `paystack`, `notify`, `free-signup`; set verify_jwt false after each deploy). Reached through Composio.
- Free plan today: email link for 3 documents/month (to be replaced by real accounts and 5/month).
- Opening animation: the classic CSS envelope is the default. The Blender 3D videos exist but are switched off (user prefers the CSS one, wants a more detailed version later).
- Phone-safety: html `data-fx` levels; Mali GPUs (Infinix Note 30) default to level 8. Do not undo this.

## Open items
- Search Console: property https://auruminvoice.com.ng/ is added (unverified). Verification file google37356b1ccf2db02e.html is live on the new domain; the owner must click Verify, then the sitemap (33 URLs) can be submitted.
- Netlify: auruminvoice.com.ng should be set as the Primary domain.
- Backend still has the old netlify address in `paystack` and `free-signup`; redeploy or set Supabase secret SITE_URL=https://auruminvoice.com.ng.
- Gmail app password was pasted in chat earlier; the owner should rotate it.
- Existing buyers (one-time purchases) must keep access when subscriptions arrive.

## What the owner wants (summary)
Subscriptions (Free/Starter/Pro, Business coming soon), email + Google registration, five luxury invoice designs, six openings, tracking and reminders, saved items, later a public storefront, and very strong SEO (Google, plus being recommended by AI assistants). Backlinks are a to-do list for the owner (profiles, directories, answers, partnerships); never buy or fake links.

## SEO and AI-visibility plan (done, 15 Nov 2026)
The plan is in `products/aurum-invoice/plan/` (start with its README). It is a plan only; nothing in it is built. Next in the phase order: the master plan (Fable, high), then accounts and billing design. Items marked `[BILLING]` in the plan wait for the billing file; items marked `[VERIFY]` wait for an accountant's check. The builder must not switch the live "Pay once" wording until subscriptions launch.
