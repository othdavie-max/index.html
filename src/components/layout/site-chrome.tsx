"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { StickyCTA } from "@/components/layout/sticky-cta";
import { ChatWidget } from "@/components/chat/chat-widget";
import { ChatLauncherMobile } from "@/components/chat/chat-launcher-mobile";
import { ConsentBanner } from "@/components/layout/consent-banner";
import { cn } from "@/lib/utils";

/** Public site chrome — hidden entirely on /admin, which has its own shell.
 * The floating WhatsApp/chat/book bar is also hidden on /book itself, so
 * nothing distracts from finishing the booking flow. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isBooking = pathname === "/book";
  const [chatOpen, setChatOpen] = useState(false);

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main id="main-content" className={cn("flex-1", !isBooking && "pb-16 sm:pb-0")}>
        {children}
      </main>
      <Footer />
      {!isBooking && (
        <>
          <MobileBottomBar />
          <StickyCTA onChatOpen={() => setChatOpen(true)} />
          <ChatLauncherMobile onOpen={() => setChatOpen(true)} />
          <ChatWidget open={chatOpen} onOpenChange={setChatOpen} />
        </>
      )}
      <ConsentBanner />
    </>
  );
}
