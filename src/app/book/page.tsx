import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/page-hero";
import { BookingTool } from "@/components/booking/booking-tool";

export const metadata: Metadata = {
  title: "Book a Free Consultation",
  description: "Book a free, no-pressure consultation with a Baseline counsellor, by video call, phone, or in person in Abuja.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Consultation"
        title="Let's plan your"
        emphasis="next step."
        description="Pick a time that works for you, Monday to Saturday, 9AM to 5PM (WAT). No pressure, no cost."
      />
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <BookingTool />
          </Suspense>
        </div>
      </section>
    </>
  );
}
