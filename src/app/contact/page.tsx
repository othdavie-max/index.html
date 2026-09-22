import type { Metadata } from "next";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { ContactForm } from "@/components/contact/contact-form";
import { siteSettings } from "@/data/site-settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Baseline Educational Services — visit our Abuja office, call, WhatsApp, or send us a message.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk about your" emphasis="next step." description="Reach us by phone, WhatsApp, email, or in person — or send a message below." />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-ink-900/8 bg-offwhite p-6 sm:p-8">
            <ContactForm />
          </div>

          <div className="flex flex-col gap-6">
            <ContactRow icon={MapPin} label="Office" value={siteSettings.address} href={siteSettings.mapUrl} />
            <ContactRow icon={Phone} label="Phone" value={siteSettings.phones.join(" · ")} href={`tel:${siteSettings.phones[0].replace(/\s/g, "")}`} />
            <ContactRow icon={Mail} label="Email" value={siteSettings.email} href={`mailto:${siteSettings.email}`} />
            <ContactRow icon={Clock} label="Hours" value={siteSettings.hours} />

            <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border border-ink-900/8 bg-ink-100 text-sm text-muted">
              {/* PLACEHOLDER: embed real Google Maps iframe */}
              Map embed placeholder
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-4 rounded-2xl border border-ink-900/8 bg-white p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-sm font-medium text-ink-900 sm:text-base">{value}</p>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}
