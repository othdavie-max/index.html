import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { siteSettings } from "@/data/site-settings";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description: "How Baseline Educational Services uses cookies and similar technologies.",
  alternates: { canonical: "/cookie-policy" },
};

const cookieTypes = [
  { name: "Essential", purpose: "Required for the site to function (e.g. remembering your cookie choice, security).", canDisable: false },
  { name: "Analytics", purpose: "Helps us understand how visitors use the site (Google Analytics), only loaded with your consent.", canDisable: true },
  { name: "Marketing", purpose: "Used to measure ad performance (Meta Pixel), only loaded with your consent.", canDisable: true },
];

export default function CookiePolicyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Cookie Notice" />
      <section className="bg-white py-16 sm:py-24">
        <div className="legal-content mx-auto max-w-3xl px-4 text-sm leading-relaxed text-navy-900 sm:px-6 sm:text-base lg:px-8">
          <p className="text-muted">Last updated: {new Date().toISOString().slice(0, 10)}.</p>
          <p>
            This site uses cookies and similar technologies to make the site work and, with your consent, to
            understand how it&apos;s used. You can accept or decline non-essential cookies via the banner shown on
            your first visit, in line with the Nigeria Data Protection Act (NDPA) 2023.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold text-navy-900">Types of cookies we use</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-navy-900/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-offwhite">
                <tr>
                  <th className="p-3 font-semibold text-navy-900">Type</th>
                  <th className="p-3 font-semibold text-navy-900">Purpose</th>
                  <th className="p-3 font-semibold text-navy-900">Can be disabled?</th>
                </tr>
              </thead>
              <tbody>
                {cookieTypes.map((c) => (
                  <tr key={c.name} className="border-t border-navy-900/10">
                    <td className="p-3 font-medium text-navy-900">{c.name}</td>
                    <td className="p-3 text-muted">{c.purpose}</td>
                    <td className="p-3 text-muted">{c.canDisable ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 font-display text-xl font-bold text-navy-900">Managing cookies</h2>
          <p>
            You can change your cookie preference at any time by clearing your browser&apos;s local storage for this
            site, or by adjusting your browser&apos;s cookie settings directly.
          </p>

          <h2 className="mt-8 font-display text-xl font-bold text-navy-900">Contact</h2>
          <p>Questions about this notice can be sent to {siteSettings.email}.</p>
        </div>
      </section>
    </>
  );
}
