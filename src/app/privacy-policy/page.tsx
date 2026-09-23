import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/page-hero";
import { siteSettings } from "@/data/site-settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Baseline Educational Services collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="bg-white py-16 sm:py-24">
        <div className="legal-content mx-auto max-w-3xl px-4 text-sm leading-relaxed text-ink-900 sm:px-6 sm:text-base lg:px-8">
          <p className="text-muted">Last updated: {new Date().toISOString().slice(0, 10)}. PLACEHOLDER: have this reviewed by a Nigerian data-protection lawyer before launch.</p>

          <h2 className="mt-8 font-display text-xl text-ink-900">1. Who we are</h2>
          <p>
            {siteSettings.companyName} (&quot;Baseline&quot;, &quot;we&quot;, &quot;us&quot;) is a study-abroad
            consultancy based at {siteSettings.address}. This policy explains how we collect, use, store and protect
            personal data in line with the Nigeria Data Protection Act (NDPA) 2023 and the Nigeria Data Protection
            Regulation.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">2. What we collect</h2>
          <p>Depending on how you use the site, we may collect:</p>
          <ul>
            <li>Contact details (name, email, phone/WhatsApp number)</li>
            <li>Academic information (grades, qualifications, English test scores)</li>
            <li>Application documents you upload (passport data page, transcripts, certificates, CVs, statements of purpose, reference letters)</li>
            <li>Consultation booking details</li>
            <li>Conversation history with our AI chat assistant (only if you consent)</li>
            <li>Usage data via analytics tools (if enabled), such as pages visited and button clicks</li>
          </ul>

          <h2 className="mt-8 font-display text-xl text-ink-900">3. Why we collect it</h2>
          <ul>
            <li>To provide career counselling, admission, visa and interview preparation services</li>
            <li>To respond to enquiries and follow up with relevant guidance</li>
            <li>To process your application and share required documents with universities on your behalf, with your consent</li>
            <li>To send updates you&apos;ve opted into (e.g. newsletter, intake reminders)</li>
            <li>To improve our website and services</li>
          </ul>

          <h2 className="mt-8 font-display text-xl text-ink-900">4. Legal basis and consent</h2>
          <p>
            We process your data based on your consent, our legitimate interest in providing the services you&apos;ve
            requested, and, where applicable, contractual necessity once you engage our services. You can withdraw
            consent at any time by contacting us.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">5. How we store and protect your data</h2>
          <p>
            Data is stored with access-controlled, encrypted infrastructure (Supabase, hosted on secure cloud
            infrastructure). Application documents are stored in a private storage bucket accessible only to
            authorised staff. We retain personal data only as long as necessary for the purpose it was collected, or
            as required by law.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">6. Sharing your data</h2>
          <p>
            We share your data with universities and institutions only as part of your application, and only with
            your consent. We do not sell your personal data. We may use service providers (email delivery, hosting,
            analytics) who process data on our behalf under appropriate safeguards.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">7. Your rights</h2>
          <p>Under the NDPA, you have the right to access, correct, delete, or request portability of your personal data, and to object to or restrict certain processing. To exercise these rights, contact us at {siteSettings.email}.</p>

          <h2 className="mt-8 font-display text-xl text-ink-900">8. Cookies</h2>
          <p>
            We use cookies for essential site functionality and, where you consent, analytics. See our{" "}
            <Link href="/cookie-policy">Cookie Notice</Link> for details.
          </p>

          <h2 className="mt-8 font-display text-xl text-ink-900">9. Contact us</h2>
          <p>
            Questions about this policy or your data can be sent to {siteSettings.email} or {siteSettings.phones[0]}.
          </p>
        </div>
      </section>
    </>
  );
}
