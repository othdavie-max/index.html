import { siteSettings } from "@/data/site-settings";
import { trackEvent } from "@/lib/analytics";

export function buildWhatsAppLink(message: string, number: string = siteSettings.whatsappNumber) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

export function openWhatsApp(message: string, source: string) {
  trackEvent("whatsapp_click", { source });
  window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
}
