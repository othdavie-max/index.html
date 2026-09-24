import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon3D } from "@/components/ui/icon-3d";
import { OtherDestinationsChips } from "@/components/destinations/other-destinations-chips";

export function AnywhereElseBanner() {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-ink-950 p-6 sm:p-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-5">
          <Icon3D name="globe-europe-africa" size={64} alt="" className="hidden shrink-0 sm:block" />
          <div>
            <h3 className="font-display text-h3 font-bold text-white">Anywhere else in the world</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
              Netherlands, France, Malaysia, the UAE, South Africa, Ghana and beyond. If you want to study there,
              we&apos;ll help.
            </p>
            <Link
              href="/destinations/other"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-500 transition-transform duration-300 hover:translate-x-1"
            >
              Talk to us <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="lg:w-[420px] lg:shrink-0">
          <OtherDestinationsChips dark />
        </div>
      </div>
    </div>
  );
}
