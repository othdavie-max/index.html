import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// `dark` is accepted so call sites don't need to change based on the
// section background; the logo art itself doesn't need to change.
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  void dark;
  return (
    <Link href="/" className={cn("inline-flex items-center", className)} aria-label="Baseline Educational Services, Home">
      <Image src="/logo.png" alt="Baseline Educational Services" width={500} height={204} priority className="h-10 w-auto" />
    </Link>
  );
}
