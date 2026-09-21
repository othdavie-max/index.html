import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Compass, GraduationCap, BookOpenCheck, FileCheck2, MessagesSquare, type LucideIcon } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { FinalCta } from "@/components/home/final-cta";
import { services } from "@/data/services";

const icons: Record<string, LucideIcon> = { Compass, GraduationCap, BookOpenCheck, FileCheck2, MessagesSquare };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: service.name,
    description: service.shortDescription,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const Icon = icons[service.icon];

  return (
    <>
      <PageHero eyebrow="Service" title={service.name} description={service.description}>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/book" size="lg" magnetic>
            Book a Free Consultation
          </Button>
        </div>
      </PageHero>

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            {Icon && <Icon size={28} />}
          </div>

          <RevealGroup className="mt-10 flex flex-col gap-4">
            {service.highlights.map((h) => (
              <RevealItem key={h}>
                <div className="flex items-start gap-3 rounded-xl border border-navy-900/8 bg-offwhite p-4">
                  <Check size={18} className="mt-0.5 shrink-0 text-red-500" />
                  <p className="text-sm text-navy-900 sm:text-base">{h}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
