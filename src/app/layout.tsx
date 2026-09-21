import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { CursorFollower } from "@/components/layout/cursor-follower";
import { ConsentBanner } from "@/components/layout/consent-banner";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { SmoothScrollProvider } from "@/components/layout/smooth-scroll-provider";
import { PageTransition } from "@/components/layout/page-transition";
import { ToastProvider } from "@/components/ui/toast";
import { GA_ID, META_PIXEL_ID } from "@/lib/analytics";
import { siteSettings } from "@/data/site-settings";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["italic"], weight: ["400", "500"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.baselineeducationalservices.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteSettings.companyName} | Study Abroad Consultants in Abuja, Nigeria`,
    template: `%s | ${siteSettings.shortName}`,
  },
  description:
    "Baseline Educational Services helps Nigerian students get admissions, scholarships and visas for universities in the UK, Ireland, Germany, Canada, the USA and Australia. Book a free consultation in Abuja.",
  keywords: [
    "study abroad consultants in Abuja",
    "study abroad Nigeria",
    "UK student visa Nigeria",
    "Canada study visa Nigeria",
    "study abroad consultancy Abuja",
  ],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: siteSettings.companyName,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A1F44",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: siteSettings.companyName,
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  address: {
    "@type": "PostalAddress",
    streetAddress: siteSettings.address,
    addressLocality: "Abuja",
    addressCountry: "NG",
  },
  contactPoint: siteSettings.phones.map((phone) => ({
    "@type": "ContactPoint",
    telephone: phone,
    contactType: "customer service",
    areaServed: "NG",
  })),
  email: siteSettings.email,
  sameAs: Object.values(siteSettings.socials),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
        {META_PIXEL_ID && (
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');`}
          </Script>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <SmoothScrollProvider>
            <LoadingScreen />
            <CursorFollower />
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-full focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white">
              Skip to content
            </a>
            <Header />
            <main id="main-content" className="flex-1 pb-16 sm:pb-0">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
            <WhatsAppButton />
            <MobileBottomBar />
            <ConsentBanner />
          </SmoothScrollProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
