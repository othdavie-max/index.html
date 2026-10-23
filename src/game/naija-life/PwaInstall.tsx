"use client";

import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "naija-life-install-dismissed";

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

const dismissedRecently = () => {
  try {
    const t = Number(localStorage.getItem(KEY) ?? 0);
    return Date.now() - t < 7 * 24 * 3600 * 1000;
  } catch {
    return false;
  }
};

/** Registers the service worker and offers "install" on Android and iPhone. */
export default function PwaInstall() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/naija-life-sw.js", { scope: "/naija-life" }).catch(() => {});
    }
    if (standalone() || dismissedRecently()) return;
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    setIos(isIos);
    setInApp(/FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|Snapchat|CriOS|FxiOS/i.test(ua) && isIos);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); setShow(true); };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos) setShow(true);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const hide = () => {
    setShow(false);
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage unavailable */ }
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-md rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-slate-200" role="dialog" aria-label="Install Naija Life">
      <div className="flex items-start gap-3">
        <img src="/naija-life/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 text-[13px] leading-snug text-slate-700">
          <div className="text-[15px] font-extrabold text-[#0b2a6b]">Install Naija Life</div>
          {evt ? "Add it to your home screen to play like a real app, even offline." : inApp ? "Open this link in Safari first, then tap Share and Add to Home Screen." : ios ? "Tap the Share button, then Add to Home Screen." : "Open your browser menu and choose Install app or Add to Home screen."}
        </div>
        <button type="button" onClick={hide} aria-label="Close" className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-600">✕</button>
      </div>
      {evt && (
        <button
          type="button"
          onClick={async () => { await evt.prompt(); await evt.userChoice.catch(() => null); setEvt(null); hide(); }}
          className="mt-3 w-full rounded-full bg-[#008751] py-2.5 text-[15px] font-extrabold text-white active:opacity-90"
        >
          Install app
        </button>
      )}
    </div>
  );
}
