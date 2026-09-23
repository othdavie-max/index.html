import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { siteSettings } from "@/data/site-settings";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of the Baseline Educational Services website and services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Service" />
      <section className="bg-white py-16 sm:py-24">
        <div className="legal-content mx-auto max-w-3xl px-4 text-sm leading-relaxed text-ink-900 sm:px-6 sm:text-base lg:px-8">
          <p className="text-muted">Last updated: {new Date().toISOString().slice(0, 10)}. PLACEHOLDER: have this reviewed by a Nigerian lawyer before launch, especially the fee and refund sections.</p>

          <h2 className="mt-8 font-display text-xl text-ink-900">1. Acceptance of terms</h2>
          <p>
            By using this website or engaging {siteSettings.companyName}&apos;s services, you agree to these Terms of
            Service. If you do not agree, please do not use our website or services.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">2. Our services</h2>
          <p>
            We provide career counselling, admission services, English test preparation guidance, visa assistance and
            interview preparation for students seeking to study abroad. Our role is advisory and administrative. We
            do not control, and cannot guarantee, decisions made by universities, English test providers, or
            immigration authorities.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">3. No guaranteed outcomes</h2>
          <p>
            We do not and cannot guarantee admission, scholarships, or visa approval. Outcomes depend on factors
            outside our control, including your academic record, documentation, and the discretion of third-party
            institutions and authorities. Any tool on this site (Course Matcher, Cost Calculator, Timeline Planner,
            AI assistant) provides estimates and general guidance only, not a guarantee of any outcome.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">4. Fees</h2>
          <p>
            PLACEHOLDER: service fees, payment schedules and refund conditions will be confirmed in writing before
            you engage a paid service, and are not published on this site pending confirmation of current pricing.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">5. Your responsibilities</h2>
          <ul>
            <li>Provide accurate, truthful information and documents</li>
            <li>Meet deadlines we communicate to you for documents, payments and appointments</li>
            <li>Comply with the requirements of universities, test providers and immigration authorities</li>
          </ul>

          <h2 className="mt-8 font-display text-xl text-ink-900">6. Intellectual property</h2>
          <p>
            All content on this site (text, design, graphics, tools and code) is the property of{" "}
            {siteSettings.companyName} unless otherwise stated, and may not be reproduced without permission. This
            site also uses third-party icon and flag assets under MIT license — see{" "}
            <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noopener noreferrer">
              Fluent Emoji
            </a>{" "}
            (Copyright Microsoft Corporation) and{" "}
            <a href="https://github.com/HatScripts/circle-flags" target="_blank" rel="noopener noreferrer">
              circle-flags
            </a>{" "}
            (Copyright HatScripts). Full details in this repository&apos;s ATTRIBUTIONS.md.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">7. Limitation of liability</h2>
          <p>
            To the extent permitted by law, {siteSettings.companyName} is not liable for indirect or consequential
            losses arising from decisions made by universities, test providers, immigration authorities, or from
            reliance on estimates provided by our tools.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">8. Changes to these terms</h2>
          <p>We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.</p>

          <h2 className="mt-8 font-display text-xl text-ink-900">9. Contact</h2>
          <p>Questions about these terms can be sent to {siteSettings.email}.</p>
        </div>
      </section>
    </>
  );
}
