import type { Metadata, Viewport } from "next";
import NaijaLife from "@/game/naija-life/NaijaLife";
import PwaInstall from "@/game/naija-life/PwaInstall";

export const metadata: Metadata = {
  title: { absolute: "Naija Life" },
  description: "Live a whole Nigerian life: hustle, travel between states, build houses, survive NEPA, dodge kidnappers, become President, and leave a family legacy.",
  robots: { index: false, follow: false },
  manifest: "/naija-life/manifest.webmanifest",
  icons: { icon: "/naija-life/icon-192.png", apple: "/naija-life/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Naija Life", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#008751",
  viewportFit: "cover",
};

export default function NaijaLifePage() {
  return (
    <>
      <NaijaLife />
      <PwaInstall />
    </>
  );
}
