import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Icon3DTile, type Icon3DName } from "@/components/ui/icon-3d";
import { FinalCta } from "@/components/home/final-cta";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Our Services",
  description: "Career counselling, admission services, English test preparation, visa assistance and interview preparation for Nigerian students studying abroad, wherever they're headed.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Support at every"
        emphasis="stage."
        description="From your first conversation to the day you land, our services cover the full study-abroad journey."
      />

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 gap-6">
            {services.map((service, i) => (
              <RevealItem key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex flex-col gap-6 rounded-2xl border border-ink-900/8 bg-offwhite p-7 transition-all duration-300 hover:border-gold-500/30 hover:shadow-hover sm:flex-row sm:items-center"
                >
                  <Icon3DTile name={service.icon as Icon3DName} size={40} tileSize={56} className="shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">0{i + 1}</p>
                    <h2 className="mt-1 font-display text-xl text-ink-900">{service.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
                  </div>
                  <ArrowRight className="hidden shrink-0 text-ink-900 transition-transform duration-300 group-hover:translate-x-1 sm:block" />
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
