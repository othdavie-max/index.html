import type { Guide } from "@/types";

// PLACEHOLDER: fileUrl points nowhere real yet. Upload actual PDFs to
// Supabase Storage (public-assets bucket) or /public and update these
// before launch — see README checklist.
export const guides: Guide[] = [
  {
    slug: "uk-visa-document-checklist",
    title: "UK Visa Document Checklist",
    description: "Every document you need for a UK student visa application, in one printable checklist.",
    fileUrl: "/guides/PLACEHOLDER-uk-visa-checklist.pdf",
    pageCount: 3,
  },
  {
    slug: "scholarship-application-starter-kit",
    title: "Scholarship Application Starter Kit",
    description: "A step-by-step guide to finding and applying for scholarships as a Nigerian student.",
    fileUrl: "/guides/PLACEHOLDER-scholarship-starter-kit.pdf",
    pageCount: 6,
  },
  {
    slug: "sop-writing-guide",
    title: "Statement of Purpose Writing Guide",
    description: "A practical framework for writing a statement of purpose that stands out, with dos and don'ts.",
    fileUrl: "/guides/PLACEHOLDER-sop-writing-guide.pdf",
    pageCount: 5,
  },
];

export const getGuide = (slug: string) => guides.find((g) => g.slug === slug);
