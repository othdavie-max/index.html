"use client";
import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, MoreVertical } from "lucide-react";
import { Button, Modal } from "../../game/ui/kit";
import { track } from "./analytics";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __bip?: BIP | null } }

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);
const isIOS = () => /iphone|ipad|ipod/i.test(ua()) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => { try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true; } catch { return false; } };
const inFrame = () => { try { return window.top !== window; } catch { return true; } };

/** "Install app" button: one tap on Android and desktop Chrome, step-by-step guide on iPhone (Apple gives no install prompt). */
export function InstallButton({ className = "" }: { className?: string }) {
  const [bip, setBip] = useState<BIP | null>(null);
  const [done, setDone] = useState(false);
  const [guide, setGuide] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (isStandalone() || inFrame() || location.protocol === "file:") return;
    setShow(true); setBip(window.__bip ?? null);
    const on = (e: Event) => { e.preventDefault(); window.__bip = e as BIP; setBip(e as BIP); };
    const installed = () => { setDone(true); setShow(false); };
    window.addEventListener("beforeinstallprompt", on); window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", installed); };
  }, []);
  if (!show || done) return null;
  const ios = isIOS();
  const go = async () => {
    track("install/tap", true);
    if (bip) { try { await bip.prompt(); const r = await bip.userChoice; if (r.outcome === "accepted") setDone(true); window.__bip = null; setBip(null); } catch { setGuide(true); } }
    else setGuide(true);
  };
  return (
    <>
      <button className={`fx-install ${className}`} onClick={go}><Download size={18} aria-hidden /><span>Install app</span><i>free · works offline</i></button>
      {guide && (
        <Modal title="Install Aso Rock" onClose={() => setGuide(false)} footer={<Button variant="primary" onClick={() => setGuide(false)}>Got it</Button>}>
          {ios ? (
            <ol className="fx-guide">
              <li><span className="fx-guide-ic"><Share size={20} /></span><span>Open this page in <b>Safari</b> (not inside another app).</span></li>
              <li><span className="fx-guide-ic"><Share size={20} /></span><span>Tap the <b>Share</b> button at the bottom of the screen.</span></li>
              <li><span className="fx-guide-ic"><SquarePlus size={20} /></span><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>
              <li><span className="fx-guide-ic">✓</span><span>Tap <b>Add</b>. Aso Rock appears on your home screen and works with no internet.</span></li>
            </ol>
          ) : (
            <ol className="fx-guide">
              <li><span className="fx-guide-ic"><MoreVertical size={20} /></span><span>Tap the <b>⋮ menu</b> in your browser (top right).</span></li>
              <li><span className="fx-guide-ic"><SquarePlus size={20} /></span><span>Tap <b>Install app</b> or <b>Add to Home screen</b>.</span></li>
              <li><span className="fx-guide-ic">✓</span><span>Confirm. Aso Rock appears on your home screen and works with no internet.</span></li>
            </ol>
          )}
        </Modal>
      )}
    </>
  );
}
