import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { blogPosts } from "@/data/blog-posts";

export function BlogPreview() {
  const latest = [...blogPosts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, 3);

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Blog & Guides" title="Advice worth" emphasis="reading." />
          <Button href="/blog" variant="secondary" size="sm">
            Visit the blog
          </Button>
        </div>

        <RevealGroup className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {latest.map((post) => (
            <RevealItem key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-navy-100 to-navy-100/40">
                  <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white">{post.category}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-navy-900 transition-colors group-hover:text-red-500">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">{post.excerpt}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {post.readingTimeMinutes} min read
                  </span>
                  <span className="flex items-center gap-1 font-medium text-red-500">
                    Read <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
