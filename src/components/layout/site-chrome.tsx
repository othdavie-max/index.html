"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { ChatWidget } from "@/components/chat/chat-widget";
import { ConsentBanner } from "@/components/layout/consent-banner";

/** Public site chrome — hidden entirely on /admin, which has its own shell. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 pb-16 sm:pb-0">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
      <MobileBottomBar />
      <ConsentBanner />
    </>
  );
}
