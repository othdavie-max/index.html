import { services } from "@/data/services";
import { destinations } from "@/data/destinations";
import { faqs } from "@/data/faqs";
import { siteSettings } from "@/data/site-settings";

/**
 * Compiled from the site's own published content so the assistant only
 * repeats what's already public — never invented Baseline-specific facts.
 */
export function buildKnowledgeBase() {
  const servicesBlock = services.map((s) => `- ${s.name}: ${s.shortDescription}`).join("\n");

  const destinationsBlock = destinations
    .map(
      (d) =>
        `- ${d.name}: ${d.summary} Typical intakes: ${d.intakes.join(", ")}. Post-study work: ${d.postStudyWork} (Estimates only, always confirm current rules.)`,
    )
    .join("\n");

  const faqsBlock = faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

  return `
COMPANY: ${siteSettings.companyName}, a study-abroad consultancy based in Abuja, Nigeria.
Address: ${siteSettings.address}
Hours: ${siteSettings.hours}
Services offered:
${servicesBlock}

Destinations covered (UK, Ireland, Germany, Canada, USA, Australia):
${destinationsBlock}

Frequently asked questions (use these as your primary source for costs, visas, admissions, English tests, scholarships, and working abroad):
${faqsBlock}

NOTE: Baseline's partner university list, exact fees, and success statistics are not published here because they have not been verified yet. Never state specific partner names, prices, or outcome rates. Direct the visitor to the Cost Calculator tool, the relevant service/destination page, or a human counsellor for anything not covered above.
`.trim();
}
