import type { Metadata } from "next";
import { FixLoader } from "@/fixit/ui/FixLoader";

export const metadata: Metadata = {
  title: "Nigeria: Can You Fix It? — a presidential strategy simulation",
  description: "You are the President. Fix the naira, food prices, fuel, power and security in a fictional, internally consistent Nigeria. Offline-capable and single-player.",
  robots: { index: false },
};

export default function FixPage() {
  return <FixLoader />;
}
