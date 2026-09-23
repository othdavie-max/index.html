"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { primaryNav } from "@/data/nav";
import { destinations } from "@/data/destinations";
import { openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const SOLID_THRESHOLD = 80;
const HIDE_DELTA = 6;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > SOLID_THRESHOLD);
      const delta = y - lastY.current;
      if (y < SOLID_THRESHOLD) setHidden(false);
      else if (delta > HIDE_DELTA) setHidden(true);
      else if (delta < -HIDE_DELTA) setHidden(false);
      lastY.current = y;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setMobileOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;

  // The mobile sheet and search overlay render as siblings of <header>, not
  // descendants — the scroll-hide transform below establishes a CSS
  // containing block, which would otherwise clip their `fixed inset-0`
  // positioning to the header's own box instead of the viewport.
  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          transparent ? "bg-transparent" : "bg-white/95 shadow-[0_1px_12px_rgba(11,37,69,0.08)] backdrop-blur-lg",
          hidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8",
          scrolled ? "h-16" : "h-20",
        )}
      >
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" onMouseLeave={() => setOpenMenu(null)}>
          {primaryNav.map((item) => (
            <div key={item.href} className="relative" onMouseEnter={() => item.children && setOpenMenu(item.label)}>
              <Link
                href={item.href}
                aria-haspopup={item.children ? "true" : undefined}
                aria-expanded={item.children ? openMenu === item.label : undefined}
                className={cn(
                  "relative flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors hover:text-gold-500",
                  transparent ? "text-white" : "text-ink-900",
                  pathname === item.href && "text-gold-500",
                )}
              >
                {item.label}
                {item.children && <ChevronDown size={14} className="opacity-50" />}
                {pathname === item.href && (
                  <motion.span layoutId="nav-underline" className="absolute -bottom-1 left-3 right-3 h-[2px] bg-gold-500" />
                )}
              </Link>

              <AnimatePresence>
                {item.children && openMenu === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 top-full pt-2"
                  >
                    {item.label === "Destinations" ? (
                      <div className="w-[420px] rounded-2xl border border-ink-900/8 bg-white p-4 shadow-xl">
                        <div className="grid grid-cols-2 gap-1">
                          {destinations.map((d) => (
                            <Link
                              key={d.slug}
                              href={`/destinations/${d.slug}`}
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink-100"
                            >
                              <Flag code={d.flagCode} size={20} alt="" />
                              <span className="text-sm font-medium text-ink-900">{d.name}</span>
                            </Link>
                          ))}
                        </div>
                        <Link
                          href="/destinations/other"
                          className="mt-1 flex items-center gap-2.5 rounded-xl border-t border-ink-900/8 px-3 py-3 text-sm font-semibold text-gold-500 hover:bg-ink-100"
                        >
                          Anywhere else in the world →
                        </Link>
                      </div>
                    ) : (
                      <div className="w-80 rounded-2xl border border-ink-900/8 bg-white p-3 shadow-xl">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block rounded-xl px-4 py-3 transition-colors hover:bg-ink-100"
                          >
                            <p className="text-sm font-semibold text-ink-900">{child.label}</p>
                            {child.description && <p className="mt-0.5 text-xs text-muted">{child.description}</p>}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search the site"
            className={cn(
              "rounded-full p-2.5 transition-colors",
              transparent ? "text-white hover:bg-white/10" : "text-ink-900 hover:bg-ink-900/5",
            )}
          >
            <Search size={18} />
          </button>
          <Button href="/book" size="sm" variant="primary" magnetic className="ml-1">
            Book a Free Consultation
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search the site"
            className={cn("rounded-full p-2", transparent ? "text-white" : "text-ink-900")}
          >
            <Search size={20} />
          </button>
          <button
            type="button"
            className={cn("rounded-full p-2", transparent ? "text-white" : "text-ink-900")}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[95] flex flex-col bg-white lg:hidden"
          >
            <div className="flex h-20 shrink-0 items-center justify-between px-4 sm:px-6">
              <Logo />
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-ink-900">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
              <nav className="flex flex-col gap-1">
                {primaryNav.map((item) => (
                  <div key={item.href} className="border-b border-ink-900/8 py-1">
                    {item.children ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setMobileOpenGroup((g) => (g === item.label ? null : item.label))}
                          aria-expanded={mobileOpenGroup === item.label}
                          className="flex min-h-[48px] w-full items-center justify-between px-1 py-3 text-left text-base font-semibold text-ink-900"
                        >
                          {item.label}
                          <ChevronDown
                            size={18}
                            className={cn("transition-transform duration-200", mobileOpenGroup === item.label && "rotate-180")}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {mobileOpenGroup === item.label && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-0.5 pb-2 pl-3">
                                {item.label === "Destinations" ? (
                                  <>
                                    {destinations.map((d) => (
                                      <Link
                                        key={d.slug}
                                        href={`/destinations/${d.slug}`}
                                        className="flex min-h-[48px] items-center gap-2.5 rounded-lg px-2 text-sm text-muted"
                                      >
                                        <Flag code={d.flagCode} size={18} alt="" />
                                        {d.name}
                                      </Link>
                                    ))}
                                    <Link href="/destinations/other" className="flex min-h-[48px] items-center rounded-lg px-2 text-sm font-medium text-gold-500">
                                      Anywhere else in the world →
                                    </Link>
                                  </>
                                ) : (
                                  item.children.map((child) => (
                                    <Link key={child.href} href={child.href} className="flex min-h-[48px] items-center rounded-lg px-2 text-sm text-muted">
                                      {child.label}
                                    </Link>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link href={item.href} className="flex min-h-[48px] items-center px-1 py-3 text-base font-semibold text-ink-900">
                        {item.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-ink-900/8 px-4 py-4 sm:px-6">
              <Button
                onClick={() => openWhatsApp("Hi Baseline, I'd like to speak with a counsellor about studying abroad.", "mobile-menu")}
                variant="secondary"
                icon={<WhatsAppIcon size={18} />}
                className="min-h-[48px] justify-center"
              >
                Chat on WhatsApp
              </Button>
              <Button href="/book" className="min-h-[48px] justify-center">
                Book a Free Consultation
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
