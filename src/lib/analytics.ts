// Thin wrapper around GA4 + Meta Pixel. No-ops when env vars are unset so
// the site works fully without analytics configured.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (GA_ID && window.gtag) window.gtag("event", name, params);
  if (META_PIXEL_ID && window.fbq) window.fbq("trackCustom", name, params);
}
