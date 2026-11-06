import type { Metadata } from "next";
import { GameLoader } from "@/game/ui/GameLoader";

export const metadata: Metadata = {
  title: "Nigeria: The Road to Presidency — a political life simulation",
  description: "A single-player, offline-capable political life simulation across Nigeria's 36 states, the FCT and 774 local governments.",
  robots: { index: false },
};

export default function GamePage() {
  return <GameLoader />;
}
