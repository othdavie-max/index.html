import type { Metadata } from "next";
import NaijaLife from "@/game/naija-life/NaijaLife";

export const metadata: Metadata = {
  title: "Naija Life: a Nigerian life simulator",
  description: "Live a whole Nigerian life: hustle, travel between states, build houses, survive NEPA, dodge kidnappers, become President, and leave a family legacy.",
  robots: { index: false, follow: false },
};

export default function NaijaLifePage() {
  return <NaijaLife />;
}
