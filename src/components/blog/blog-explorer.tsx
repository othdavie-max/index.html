"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { blogPosts } from "@/data/blog-posts";

const categories = ["All", ...Array.from(new Set(blogPosts.map((p) => p.category)))];

export function BlogExplorer({ excludeSlug }: { excludeSlug?: string }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return blogPosts
      .filter((p) => p.slug !== excludeSlug)
      .filter((p) => category === "All" || p.category === category)
      .filter((p) => query.trim() === "" || p.title.toLowerCase().includes(query.toLowerCase()) || p.excerpt.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  }, [category, query, excludeSlug]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === c ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-900 hover:bg-navy-900/15"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="w-full rounded-full border border-navy-900/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500"
          />
        </div>
      </div>

      <RevealGroup className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {filtered.map((post) => (
          <RevealItem key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group block">
              <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-navy-100 to-navy-100/40">
                <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white">{post.category}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900 transition-colors group-hover:text-red-500">{post.title}</h3>
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
        {filtered.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted">No articles match your search yet.</p>}
      </RevealGroup>
    </div>
  );
}
