import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { ShareButtons } from "@/components/blog/share-buttons";
import { FinalCta } from "@/components/home/final-cta";
import { blogPosts, getBlogPost } from "@/data/blog-posts";
import { extractHeadings } from "@/lib/blog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.baselineeducationalservices.com";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", publishedTime: post.publishedAt, authors: [post.author] },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const { html, headings } = extractHeadings(post.contentHtml);
  const related = blogPosts.filter((p) => p.category === post.category && p.slug !== post.slug).slice(0, 3);
  const url = `${siteUrl}/blog/${post.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription,
    author: { "@type": "Organization", name: post.author },
    datePublished: post.publishedAt,
    mainEntityOfPage: url,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 2, name: post.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <PageHero eyebrow={post.category} title={post.title} className="py-16 sm:py-20">
        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-white/60">
          <span>{post.author}</span>
          <span>·</span>
          <span>{new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {post.readingTimeMinutes} min read
          </span>
        </div>
      </PageHero>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_200px] lg:px-8">
          <article>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted">{post.excerpt}</p>
            </div>
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />

            <div className="mt-10 flex items-center justify-between border-t border-navy-900/8 pt-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Share this article</span>
              <ShareButtons url={url} title={post.title} />
            </div>

            <div className="mt-10 rounded-2xl bg-navy-900 p-6 text-center sm:p-8">
              <p className="font-display text-lg font-bold text-white">Ready to talk it through?</p>
              <p className="mt-1 text-sm text-white/60">Book a free consultation with a Baseline counsellor.</p>
              <Link href="/book" className="mt-4 inline-block rounded-full bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600">
                Book a Free Consultation
              </Link>
            </div>
          </article>

          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
                <nav className="mt-3 flex flex-col gap-2 border-l border-navy-900/10 pl-3">
                  {headings.map((h) => (
                    <a key={h.id} href={`#${h.id}`} className="text-xs text-muted hover:text-red-500">
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-offwhite py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Related articles</p>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
              {related.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group block rounded-2xl border border-navy-900/8 bg-white p-5">
                  <h3 className="font-display text-base font-bold text-navy-900 transition-colors group-hover:text-red-500">{p.title}</h3>
                  <p className="mt-2 text-xs text-muted line-clamp-2">{p.excerpt}</p>
                  <span className="mt-3 flex items-center gap-1 text-xs font-medium text-red-500">
                    Read <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCta />
    </>
  );
}
