import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Icon3DTile, type Icon3DName } from "@/components/ui/icon-3d";
import { services } from "@/data/services";

export function ServicesSection() {
  return (
    <section className="bg-offwhite py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Services"
          title="Support at every"
          emphasis="stage."
          description="From your first conversation to the day you land, our services cover the full journey, not just one part of it."
        />

        <RevealGroup className="no-scrollbar mt-12 flex snap-x gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {services.map((service) => (
            <RevealItem key={service.slug} className="w-[280px] shrink-0 snap-start lg:w-auto">
              <Link
                href={`/services/${service.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-ink-900/8 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_20px_40px_-15px_rgba(11,_37,_69,0.2)]"
              >
                <Icon3DTile name={service.icon as Icon3DName} size={36} tileSize={52} />
                <h3 className="mt-5 font-display text-lg text-ink-900">{service.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{service.shortDescription}</p>
                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-gold-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Learn more <ArrowRight size={14} />
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
