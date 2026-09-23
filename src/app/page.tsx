import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { DestinationShowcase } from "@/components/home/destination-showcase";
import { ServicesSection } from "@/components/home/services-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { ToolsTeaser } from "@/components/home/tools-teaser";
import { SuccessStoriesSection } from "@/components/home/success-stories-section";
import { TeamPreview } from "@/components/home/team-preview";
import { BlogPreview } from "@/components/home/blog-preview";
import { FaqPreview } from "@/components/home/faq-preview";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Study Abroad Consultants in Abuja, Nigeria",
  description:
    "Baseline Educational Services in Abuja helps Nigerian students secure admissions, scholarships and visas for universities worldwide, from the UK, Canada and the USA to Europe, Asia and Africa. Book a free consultation.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <DestinationShowcase />
      <ServicesSection />
      <HowItWorks />
      <ToolsTeaser />
      <SuccessStoriesSection />
      <TeamPreview />
      <BlogPreview />
      <FaqPreview />
      <FinalCta />
    </>
  );
}
