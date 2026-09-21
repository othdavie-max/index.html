import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-navy-950 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <Compass size={28} />
      </div>
      <p className="mt-6 font-display text-6xl font-bold text-white">404</p>
      <h1 className="mt-3 font-display text-xl font-bold text-white sm:text-2xl">Looks like you&apos;ve wandered off the map.</h1>
      <p className="mt-3 max-w-md text-sm text-white/60 sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back on track.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/">Back to Home</Button>
        <Button href="/tools/course-matcher" variant="outline-light">
          Take the Course Matcher
        </Button>
      </div>
    </div>
  );
}
