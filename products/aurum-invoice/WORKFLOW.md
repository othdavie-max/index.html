# How we work (read this first in every new chat)

The owner is on the Claude $20 plan and wants to spend as few tokens as possible. Fable 5.2 expires on 16 Nov 2026 at 7 pm.
Models: Fable 5.2 (`claude-fable-5-2`), Opus 5.5 (`claude-opus-5-5`), Sonnet 5.5 (`claude-sonnet-5-5`), Haiku 5.5 (`claude-haiku-5-5`).

## Roles
- **Fable = the professional.** Plans, decides, writes files (keyword plan, page wording, billing rules, database design). It does NOT build or test.
- **Sonnet = the builder.** Builds exactly what the Fable files say. It does not invent keywords, prices, wording or billing rules.
- **Opus = last.** Hard backend work (reminders, storefront payments) and a review of billing.
- **Haiku = small jobs.** Clean-up, captions, final checks.

## The switching rule
The model working must STOP and tell the owner in plain words:
1. which model to switch to, and the effort (low / medium / high / xhigh; never max),
2. what to ask it, in one pasteable message,
3. when to switch back.

Stop and ask for Fable when: a spec is missing or unclear, a build hits a problem that needs a decision (billing, security, SEO wording, database), or something contradicts a Fable file. Stop after the zip is ready and say which model is next. Do not keep going on a different model's job.

## Decisions already made
- Plans: Free (5 documents/month), Starter ₦3,000/month or ₦30,000/year, Pro ₦6,000/month or ₦60,000/year, Business "coming soon" with a Request button. No lifetime or one-time purchase for new buyers; existing buyers keep access.
- Headline stays: "Your business is premium. Your invoice should be too."
- Keep the app working offline. Everything must run on free services. Accounts by email/password and Google.
- Saved items (catalogue) first; public storefront with automatic invoice and payment later.
- Domain: auruminvoice.com.ng. One zip at the end of each phase; the owner tests before the next phase. Plain language, calm tone, be honest about what cannot be done.

## Phase order
0 Clean-up (Haiku, low) → SEO plan (Fable, high) → master plan (Fable, high) → accounts and billing design (Fable, high/xhigh) → brand, invoice designs, openings, saved items (Sonnet, medium/high) → reminders and storefront payments (Opus, high) → test and launch (Sonnet medium, Haiku low).
Fable files go in `products/aurum-invoice/plan/`.

## Updates (16 Nov 2026)
- All Fable files are written: `plan/00-master-plan.md` to `plan/10-reminders-and-storefront.md`. The order of work, step by step, is in `plan/00-master-plan.md`, section 3. Follow that table.
- Once Fable is no longer available, "stop and ask for Fable" means **Opus at high effort**.
- Decisions the plan files are waiting on are listed at the end of each file ("Decisions I need from you"). A builder must not treat an unanswered decision as a yes; the files say what to do meanwhile.
