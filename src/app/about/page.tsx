import type { Metadata } from "next";
import { MapPin, Clock, Award, ShieldCheck, Users, HeartHandshake } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { FinalCta } from "@/components/home/final-cta";
import { siteSettings } from "@/data/site-settings";
import { team } from "@/data/team";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Baseline Educational Services is a study-abroad consultancy based in Abuja, helping Nigerian students get admissions, scholarships and visas honestly and clearly.",
  alternates: { canonical: "/about" },
};

const values = [
  { icon: Award, title: "Excellence", description: "We hold our advice, our documentation and our follow-through to a high standard, every time." },
  { icon: ShieldCheck, title: "Trust", description: "We tell you what's realistic, not what's easiest to hear. No guarantees we can't keep." },
  { icon: HeartHandshake, title: "Quality Services Delivery", description: "From your first message to your first week abroad, we stay responsive and thorough." },
  { icon: Users, title: "Positive Relationships", description: "We build long-term relationships with students, families and university partners alike." },
];

const whyChooseUs = [
  "One-on-one counselling tailored to your grades, budget and goals, not a generic checklist.",
  "Support across all six major destinations, so we recommend what fits you, not just one country.",
  "Document-by-document visa and application guidance, reviewed before you submit anything.",
  "A physical office in Abuja for students and parents who want to meet in person.",
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Baseline"
        title="Honest guidance for a"
        emphasis="life-changing decision."
        description="We're a study-abroad consultancy based in Abuja, built around one idea: give students and their families a clear, realistic plan, not just a sales pitch."
      />

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading eyebrow="Who We Are" title="Our" emphasis="profile." />
            <p className="mt-5 text-base leading-relaxed text-muted">
              Baseline Educational Services helps Nigerian students navigate admissions, scholarships and visas for
              universities in the UK, Ireland, Germany, Canada, the USA and Australia. We work with students at every
              stage, from Foundation programmes to PhDs, and with parents who want a trustworthy second opinion
              before committing.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Studying abroad is one of the biggest decisions a family makes. We treat it that way: with clear
              timelines, honest budgeting, and documentation that&apos;s checked before it&apos;s submitted, not after
              something goes wrong.
            </p>
          </div>
          <div>
            <SectionHeading eyebrow="Why Choose Us" title="What's" emphasis="different." />
            <ul className="mt-5 flex flex-col gap-4">
              {whyChooseUs.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted sm:text-base">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Our Values" title="What we" emphasis="stand for." align="center" className="mx-auto" />
          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <RevealItem key={v.title}>
                <div className="h-full rounded-2xl border border-ink-900/8 bg-white p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
                    <v.icon size={22} />
                  </div>
                  <h3 className="mt-4 font-display text-base text-ink-900">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{v.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {siteSettings.showTeam && (
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Our Team" title="Meet the" emphasis="counsellors." align="center" className="mx-auto" />
            <RevealGroup className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4">
              {team.map((member) => (
                <RevealItem key={member.slug}>
                  <div className="rounded-2xl border border-ink-900/8 bg-offwhite p-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 font-display text-lg text-ink-900">
                      {member.photoPlaceholder}
                    </div>
                    <p className="mt-3 font-display text-sm text-ink-900">{member.name}</p>
                    <p className="mt-0.5 text-xs text-gold-500">{member.role}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{member.bio}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading eyebrow="Our Office" title="Visit us in" emphasis="Abuja." />
            <div className="mt-6 flex flex-col gap-4 text-sm text-ink-900 sm:text-base">
              <p className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-gold-500" />
                {siteSettings.address}
              </p>
              <p className="flex items-start gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-gold-500" />
                {siteSettings.hours}
              </p>
            </div>
            <a
              href={siteSettings.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block text-sm font-semibold text-gold-500 underline-offset-4 hover:underline"
            >
              Get directions →
            </a>
          </div>
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-ink-900/8 bg-ink-100 text-sm text-muted">
            {/* PLACEHOLDER: embed a real Google Maps iframe or office photo gallery here */}
            Office photo / map embed placeholder
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
