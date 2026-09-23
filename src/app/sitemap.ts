import type { MetadataRoute } from "next";
import { destinations } from "@/data/destinations";
import { services } from "@/data/services";
import { partners } from "@/data/partners";
import { blogPosts } from "@/data/blog-posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.baselineeducationalservices.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/services",
    "/destinations",
    "/destinations/other",
    "/partners",
    "/tools",
    "/tools/course-matcher",
    "/tools/cost-calculator",
    "/tools/timeline-planner",
    "/apply",
    "/book",
    "/success-stories",
    "/blog",
    "/guides",
    "/faq",
    "/contact",
    "/privacy-policy",
    "/terms",
    "/cookie-policy",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  const serviceRoutes = services.map((s) => ({ url: `${siteUrl}/services/${s.slug}`, lastModified: new Date() }));
  const destinationRoutes = destinations.map((d) => ({ url: `${siteUrl}/destinations/${d.slug}`, lastModified: new Date() }));
  const partnerRoutes = partners.map((p) => ({ url: `${siteUrl}/partners/${p.slug}`, lastModified: new Date() }));
  const blogRoutes = blogPosts.map((p) => ({ url: `${siteUrl}/blog/${p.slug}`, lastModified: new Date(p.publishedAt) }));

  return [...staticRoutes, ...serviceRoutes, ...destinationRoutes, ...partnerRoutes, ...blogRoutes];
}
