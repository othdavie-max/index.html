import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Icon3DTile, type Icon3DName } from "@/components/ui/icon-3d";
import { services } from "@/data/services";
import { cn } from "@/lib/utils";

// Bento layout: Admission Services and Visa Assistance are the two core
// services, so they get the larger tiles; Interview Preparation closes the
// grid as a full-width wide card.
const SPAN: Record<string, string> = {
  "admission-services": "lg:col-span-2 lg:row-span-2",
  "visa-assistance": "lg:col-span-2",
  "interview-preparation": "lg:col-span-3",
};

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

        <RevealGroup className="no-scrollbar mt-12 grid grid-cols-1 gap-5 sm:flex sm:snap-x sm:gap-5 sm:overflow-x-auto sm:pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {services.map((service) => {
            const isLarge = service.slug === "admission-services";
            const isWide = service.slug === "interview-preparation";
            return (
              <RevealItem key={service.slug} className={cn("sm:w-[280px] sm:shrink-0 sm:snap-start lg:w-auto", SPAN[service.slug])}>
                <Link
                  href={`/services/${service.slug}`}
                  className={cn(
                    "group flex h-full flex-col rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover",
                    isWide && "lg:flex-row lg:items-center lg:gap-6",
                  )}
                >
                  <Icon3DTile name={service.icon as Icon3DName} size={isLarge ? 44 : 36} tileSize={isLarge ? 64 : 52} />
                  <div className={cn(isWide && "lg:flex-1")}>
                    <h3 className={cn("mt-5 font-display text-ink-900", isLarge ? "text-h3" : "text-lg", isWide && "lg:mt-0")}>
                      {service.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {isLarge ? service.description : service.shortDescription}
                    </p>
                    {isLarge && (
                      <ul className="mt-4 hidden flex-col gap-2 sm:flex">
                        {service.highlights.slice(0, 2).map((h) => (
                          <li key={h} className="flex items-start gap-2 text-sm text-ink-900">
                            <Check size={15} className="mt-0.5 shrink-0 text-gold-500" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-gold-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Learn more <ArrowRight size={14} />
                  </span>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
