import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { MapPin, Clock } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem, Reveal } from "@/components/ui/reveal";
import { Icon3D, Icon3DTile } from "@/components/ui/icon-3d";
import { GoogleMapEmbed } from "@/components/ui/google-map-embed";
import { FinalCta } from "@/components/home/final-cta";
import { siteSettings } from "@/data/site-settings";
import {
  aboutHero,
  ourStory,
  founderInfo,
  whoWeAre,
  howWeWork,
  whyChooseUs,
  ourPromise,
  ourValues,
  credentials,
  visitUs,
  aboutCta,
} from "@/data/about-content";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Baseline Educational Services is an Abuja-based study-abroad consultancy helping Nigerian students secure admissions, scholarships and visas for universities anywhere in the world, honestly and clearly.",
  alternates: { canonical: "/about" },
};

function publicFileExists(relativePath: string) {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", relativePath));
  } catch {
    return false;
  }
}

export default function AboutPage() {
  const showFounderLine = Boolean(founderInfo.founderName && founderInfo.foundedYear);
  const showFounderPhoto = Boolean(founderInfo.founderPhoto) && publicFileExists(founderInfo.founderPhoto.replace(/^\//, ""));
  const officePhotoPath = "images/office.jpg";
  const showOfficePhoto = publicFileExists(officePhotoPath);

  return (
    <>
      <PageHero eyebrow={aboutHero.eyebrow} title={aboutHero.title} emphasis={aboutHero.emphasis} description={aboutHero.description} />

      {/* Our Story */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 lg:items-center">
          <Reveal>
            <SectionHeading eyebrow={ourStory.eyebrow} title={ourStory.heading} emphasis={ourStory.emphasis} />
            <div className="mt-5 flex flex-col gap-4">
              {ourStory.paragraphs.map((p) => (
                <p key={p} className="text-base leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </div>
            {showFounderLine && (
              <p className="mt-5 text-sm font-medium text-ink-900">
                Founded in {founderInfo.foundedYear} by {founderInfo.founderName}
                {founderInfo.founderTitle ? `, ${founderInfo.founderTitle}` : ""}.
              </p>
            )}
          </Reveal>
          {showFounderPhoto && (
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image src={founderInfo.founderPhoto} alt={founderInfo.founderName} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Who We Are */}
      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={whoWeAre.eyebrow} title={whoWeAre.heading} emphasis={whoWeAre.emphasis} align="center" className="mx-auto" />
          <div className="mt-6 flex flex-col gap-4">
            {whoWeAre.paragraphs.map((p) => (
              <p key={p} className="text-base leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How We Work" title="Five steps." emphasis="No surprises." align="center" className="mx-auto" />

          {/* Horizontal stepper on desktop, vertical timeline on mobile */}
          <RevealGroup className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {howWeWork.map((step, i) => (
              <RevealItem key={step.title}>
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
                    <Icon3DTile name={step.icon} size={36} tileSize={52} />
                    <span className="font-display text-xs font-semibold uppercase tracking-widest text-gold-500">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Why Families Choose Us */}
      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why Choose Us" title="What's" emphasis="different." align="center" className="mx-auto" />
          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseUs.map((item) => (
              <RevealItem key={item.title}>
                <div className="h-full rounded-2xl border border-ink-900/8 bg-white p-6 text-center">
                  <Icon3DTile name={item.icon} size={36} tileSize={52} className="mx-auto" />
                  <h3 className="mt-4 font-display text-base text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Our Promise */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow={ourPromise.eyebrow} title={ourPromise.heading} emphasis={ourPromise.emphasis} align="center" className="mx-auto" />
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-ink-900/8 bg-offwhite p-7">
              <h3 className="font-display text-lg text-ink-900">We will always:</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {ourPromise.always.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted sm:text-base">
                    <Icon3D name="check-mark-button" size={22} alt="" className="mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-900/8 bg-offwhite p-7">
              <h3 className="font-display text-lg text-ink-900">We will never:</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {ourPromise.never.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted sm:text-base">
                    <Icon3D name="cross-mark" size={22} alt="" className="mt-0.5 shrink-0 opacity-60 grayscale" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Our Values" title="What we" emphasis="stand for." align="center" className="mx-auto" />
          <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ourValues.map((v) => (
              <RevealItem key={v.title}>
                <div className="h-full rounded-2xl border border-ink-900/8 bg-white p-6 text-center">
                  <Icon3DTile name={v.icon} size={36} tileSize={52} className="mx-auto" />
                  <h3 className="mt-4 font-display text-base text-ink-900">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{v.description}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Credentials — hidden entirely while empty */}
      {credentials.length > 0 && (
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Credentials" title="Qualified to" emphasis="guide you." align="center" className="mx-auto" />
            <RevealGroup className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {credentials.map((c) => (
                <RevealItem key={c.title}>
                  <div className="h-full rounded-2xl border border-ink-900/8 bg-offwhite p-6">
                    {c.logo && (
                      <div className="relative mb-4 h-10 w-24">
                        <Image src={c.logo} alt="" fill sizes="96px" className="object-contain object-left" />
                      </div>
                    )}
                    <h3 className="font-display text-base text-ink-900">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted">{c.detail}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* Visit Us */}
      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading eyebrow={visitUs.eyebrow} title={visitUs.heading} emphasis={visitUs.emphasis} />
            <p className="mt-4 text-base leading-relaxed text-muted">{visitUs.body}</p>
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
          <div className="flex flex-col gap-4">
            <GoogleMapEmbed address={siteSettings.address} />
            {showOfficePhoto && (
              <div className="relative aspect-video overflow-hidden rounded-2xl">
                <Image src={`/${officePhotoPath}`} alt="Baseline Educational Services office in Abuja" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>

      <FinalCta heading={aboutCta.heading} body={aboutCta.body} />
    </>
  );
}
