"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const WHATSAPP_MESSAGE =
  "Hi Baseline, I'm interested in studying in a country that isn't listed on your website. Can you help?";

export function OtherDestinationsCta() {
  return (
    <div className="mt-12 flex flex-col items-center gap-5 text-center">
      <p className="font-display text-xl text-ink-900 sm:text-2xl">Don&apos;t see your country? We can still help.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/book" size="lg" magnetic>
          Book a Free Consultation
        </Button>
        <Button href={buildWhatsAppLink(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" variant="secondary" size="lg" icon={<MessageCircle size={18} />}>
          Ask on WhatsApp
        </Button>
      </div>
    </div>
  );
}
