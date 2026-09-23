import type { Metadata } from "next";
import Link from "next/link";
import { Compass, GraduationCap, BookOpenCheck, FileCheck2, MessagesSquare, ArrowRight, type LucideIcon } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { FinalCta } from "@/components/home/final-cta";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Our Services",
  description: "Career counselling, admission services, English test preparation, visa assistance and interview preparation for Nigerian students studying abroad.",
  alternates: { canonical: "/services" },
};

const icons: Record<string, LucideIcon> = { Compass, GraduationCap, BookOpenCheck, FileCheck2, MessagesSquare };

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
            {services.map((service, i) => {
              const Icon = icons[service.icon];
              return (
                <RevealItem key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="group flex flex-col gap-6 rounded-2xl border border-ink-900/8 bg-offwhite p-7 transition-all duration-300 hover:border-gold-500/30 hover:shadow-[0_20px_40px_-15px_rgba(11, 37, 69,0.15)] sm:flex-row sm:items-center"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-white">
                      {Icon && <Icon size={24} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gold-500">0{i + 1}</p>
                      <h2 className="mt-1 font-display text-xl text-ink-900">{service.name}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
                    </div>
                    <ArrowRight className="hidden shrink-0 text-ink-900 transition-transform duration-300 group-hover:translate-x-1 sm:block" />
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
