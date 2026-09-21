"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const WorldMap = dynamic(() => import("@/components/destinations/world-map").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-3xl" />,
});

export function WorldMapLoader() {
  return <WorldMap />;
}
