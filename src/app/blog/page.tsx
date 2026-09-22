import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { BlogExplorer } from "@/components/blog/blog-explorer";
import { blogPosts } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog & Guides",
  description: "Practical, honest advice on studying abroad from Nigeria — visas, costs, English tests, and more.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const featured = [...blogPosts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))[0];

  return (
    <>
      <PageHero eyebrow="Blog" title="Advice worth" emphasis="reading." description="Practical, honest guidance — not recycled listicles." />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href={`/blog/${featured.slug}`} className="group mb-14 grid grid-cols-1 gap-6 rounded-3xl border border-ink-900/8 bg-offwhite p-6 sm:p-8 lg:grid-cols-2">
            <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700 lg:aspect-auto">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">Featured</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-gold-500">{featured.category}</span>
              <h2 className="mt-2 font-display text-2xl text-ink-900 transition-colors group-hover:text-gold-500">{featured.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{featured.excerpt}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {featured.readingTimeMinutes} min read
                </span>
                <span className="flex items-center gap-1 font-medium text-gold-500">
                  Read the article <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </Link>

          <BlogExplorer excludeSlug={featured.slug} />
        </div>
      </section>
    </>
  );
}
