import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { TrustStrip } from "@/components/home/trust-strip";
import { DestinationShowcase } from "@/components/home/destination-showcase";
import { ServicesSection } from "@/components/home/services-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { ToolsTeaser } from "@/components/home/tools-teaser";
import { SuccessStoriesSection } from "@/components/home/success-stories-section";
import { StatsStrip } from "@/components/home/stats-strip";
import { TeamPreview } from "@/components/home/team-preview";
import { BlogPreview } from "@/components/home/blog-preview";
import { FaqPreview } from "@/components/home/faq-preview";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Study Abroad Consultants in Abuja, Nigeria",
  description:
    "Baseline Educational Services helps Nigerian students get admissions, scholarships and visas for the UK, Ireland, Germany, Canada, the USA and Australia. Book your free consultation.",
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
      <StatsStrip />
      <TeamPreview />
      <BlogPreview />
      <FaqPreview />
      <FinalCta />
    </>
  );
}
