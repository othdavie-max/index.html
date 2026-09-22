import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { FacebookIcon, InstagramIcon, XIcon } from "@/components/ui/social-icons";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { footerNav } from "@/data/nav";
import { siteSettings } from "@/data/site-settings";

export function Footer() {
  return (
    <footer className="bg-ink-950 text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Nigeria-based study-abroad consultancy helping students get admissions, scholarships and visas for
              universities in the UK, Ireland, Germany, Canada, the USA and Australia.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-sm">
              <a href={siteSettings.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-white">
                <MapPin size={16} className="mt-0.5 shrink-0 text-gold-500" />
                {siteSettings.address}
              </a>
              <a href={`mailto:${siteSettings.email}`} className="flex items-center gap-2.5 hover:text-white">
                <Mail size={16} className="shrink-0 text-gold-500" />
                {siteSettings.email}
              </a>
              <a href={`tel:${siteSettings.phones[0].replace(/\s/g, "")}`} className="flex items-center gap-2.5 hover:text-white">
                <Phone size={16} className="shrink-0 text-gold-500" />
                {siteSettings.phones[0]}
              </a>
            </div>
            <div className="mt-6 flex gap-3">
              <a href={siteSettings.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full bg-white/5 p-2.5 hover:bg-white/15">
                <FacebookIcon size={16} />
              </a>
              <a href={siteSettings.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="rounded-full bg-white/5 p-2.5 hover:bg-white/15">
                <XIcon size={16} />
              </a>
              <a href={siteSettings.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full bg-white/5 p-2.5 hover:bg-white/15">
                <InstagramIcon size={16} />
              </a>
            </div>
          </div>

          <FooterCol title="Company" links={footerNav.company} />
          <FooterCol title="Services" links={footerNav.services} />
          <FooterCol title="Destinations" links={footerNav.destinations} />

          <div className="col-span-2 md:col-span-1">
            <h3 className="font-display text-sm text-white">Stay updated</h3>
            <p className="mt-3 text-sm text-white/60">Intakes, scholarships and deadlines — straight to your inbox.</p>
            <div className="mt-4">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteSettings.companyName}. All rights reserved.</p>
          <div className="flex gap-5">
            {footerNav.legal.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
            <h3 className="font-display text-sm text-white">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-white/60 hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
