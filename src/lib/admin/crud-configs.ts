import type { CrudConfig } from "@/lib/admin/field-types";

export const testimonialsConfig: CrudConfig = {
  table: "testimonials",
  title: "Testimonials",
  description: "Student stories shown on the homepage and Success Stories page.",
  orderBy: "created_at",
  fields: [
    { key: "name", label: "Student Name", type: "text", required: true },
    { key: "course", label: "Course", type: "text" },
    { key: "university", label: "University", type: "text" },
    { key: "country", label: "Country Code", type: "select", options: ["uk", "ireland", "germany", "canada", "usa", "australia"], required: true },
    { key: "quote", label: "Quote", type: "textarea" },
    { key: "video_url", label: "Video Embed URL", type: "text", helpText: "YouTube/Vimeo embed URL, optional" },
    { key: "photo_url", label: "Photo URL", type: "text" },
    { key: "visa_approved", label: "Visa Approved", type: "boolean", helpText: "Show 'Visa Approved' badge" },
    { key: "consent_given", label: "Consent Given", type: "boolean", helpText: "Confirmed the student consented to this being public" },
    { key: "published", label: "Published", type: "boolean", helpText: "Visible on the live site" },
  ],
  listColumns: ["name", "country", "visa_approved", "published"],
  hasPublished: true,
};

export const partnersConfig: CrudConfig = {
  table: "partners",
  title: "Partners",
  description: "Partner universities shown on the Partners page.",
  orderBy: "name",
  fields: [
    { key: "slug", label: "Slug", type: "text", required: true, helpText: "URL-friendly, e.g. example-university-uk" },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "country", label: "Country Code", type: "select", options: ["uk", "ireland", "germany", "canada", "usa", "australia"], required: true },
    { key: "logo_url", label: "Logo URL", type: "text" },
    { key: "overview", label: "Overview", type: "textarea" },
    { key: "popular_courses", label: "Popular Courses", type: "string-array" },
    { key: "intakes", label: "Intakes", type: "string-array" },
    { key: "published", label: "Published", type: "boolean" },
  ],
  listColumns: ["name", "country", "published"],
  hasPublished: true,
};

export const teamConfig: CrudConfig = {
  table: "team_members",
  title: "Team",
  description: "Counsellor profiles shown on the About page.",
  orderBy: "sort_order",
  fields: [
    { key: "slug", label: "Slug", type: "text", required: true },
    { key: "name", label: "Name", type: "text", required: true },
    { key: "role", label: "Role", type: "text" },
    { key: "bio", label: "Bio", type: "textarea" },
    { key: "photo_url", label: "Photo URL", type: "text" },
    { key: "sort_order", label: "Sort Order", type: "number" },
    { key: "published", label: "Published", type: "boolean" },
  ],
  listColumns: ["name", "role", "sort_order", "published"],
  hasPublished: true,
};

export const faqsConfig: CrudConfig = {
  table: "faqs",
  title: "FAQs",
  description: "Questions shown on the FAQ page and homepage preview.",
  orderBy: "sort_order",
  fields: [
    { key: "category", label: "Category", type: "select", options: ["Costs", "Visas", "Admissions", "English Tests", "Scholarships", "Working Abroad"], required: true },
    { key: "question", label: "Question", type: "text", required: true },
    { key: "answer", label: "Answer", type: "textarea", required: true },
    { key: "sort_order", label: "Sort Order", type: "number" },
    { key: "published", label: "Published", type: "boolean" },
  ],
  listColumns: ["category", "question", "published"],
  hasPublished: true,
};

export const blogConfig: CrudConfig = {
  table: "blog_posts",
  title: "Blog Posts",
  description: "Articles shown on the Blog.",
  orderBy: "published_at",
  fields: [
    { key: "slug", label: "Slug", type: "text", required: true },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
    { key: "content_html", label: "Content", type: "richtext" },
    { key: "category", label: "Category", type: "text" },
    { key: "author", label: "Author", type: "text" },
    { key: "reading_time_minutes", label: "Reading Time (min)", type: "number" },
    { key: "cover_url", label: "Cover Image URL", type: "text" },
    { key: "seo_title", label: "SEO Title", type: "text" },
    { key: "seo_description", label: "SEO Description", type: "textarea" },
    { key: "published", label: "Published", type: "boolean" },
  ],
  listColumns: ["title", "category", "published"],
  hasPublished: true,
};

export const guidesConfig: CrudConfig = {
  table: "guides",
  title: "Guides",
  description: "Free downloadable guides on the Guides page.",
  orderBy: "title",
  fields: [
    { key: "slug", label: "Slug", type: "text", required: true },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "file_url", label: "PDF File URL", type: "text", required: true },
    { key: "page_count", label: "Page Count", type: "number" },
    { key: "published", label: "Published", type: "boolean" },
  ],
  listColumns: ["title", "page_count", "published"],
  hasPublished: true,
};

export const exchangeRatesConfig: CrudConfig = {
  table: "exchange_rates",
  title: "Exchange Rates",
  description: "NGN rates used by the Cost Calculator. Update regularly.",
  orderBy: "currency_code",
  fields: [
    { key: "currency_code", label: "Currency Code", type: "text", required: true, helpText: "e.g. GBP, EUR, USD" },
    { key: "rate_to_ngn", label: "Rate to NGN", type: "number", required: true, helpText: "NGN per 1 unit of this currency" },
  ],
  listColumns: ["currency_code", "rate_to_ngn"],
};

export const costItemsConfig: CrudConfig = {
  table: "cost_items",
  title: "Cost Calculator Data",
  description: "Itemised cost estimates used by the Cost Calculator tool.",
  orderBy: "country_code",
  fields: [
    { key: "country_code", label: "Country Code", type: "select", options: ["uk", "ireland", "germany", "canada", "usa", "australia"], required: true },
    { key: "level", label: "Level", type: "text", required: true },
    { key: "course_type", label: "Course Type", type: "select", options: ["standard", "premium"], required: true },
    { key: "city_tier", label: "City Tier", type: "select", options: ["standard", "major-city"], required: true },
    { key: "item_name", label: "Item Name", type: "text", required: true, helpText: "e.g. Tuition, Accommodation, Food" },
    { key: "amount", label: "Amount", type: "number", required: true },
    { key: "currency", label: "Currency", type: "text", required: true },
  ],
  listColumns: ["country_code", "item_name", "amount", "currency"],
};

export const timelineMilestonesConfig: CrudConfig = {
  table: "timeline_milestones",
  title: "Timeline Milestones",
  description: "Milestone offsets used by the Timeline Planner tool.",
  orderBy: "sort_order",
  fields: [
    { key: "country_code", label: "Country Code", type: "select", options: ["uk", "ireland", "germany", "canada", "usa", "australia"], required: true },
    { key: "level", label: "Level", type: "text", required: true },
    { key: "milestone", label: "Milestone", type: "text", required: true },
    { key: "offset_days_before_intake", label: "Days Before Intake", type: "number", required: true },
    { key: "sort_order", label: "Sort Order", type: "number" },
  ],
  listColumns: ["country_code", "milestone", "offset_days_before_intake"],
};

export const destinationContentConfig: CrudConfig = {
  table: "destination_content",
  title: "Destinations",
  description: "Editable copy for each country's overview (tuition/living cost figures shown on the site).",
  orderBy: "country_code",
  fields: [
    { key: "country_code", label: "Country Code", type: "select", options: ["uk", "ireland", "germany", "canada", "usa", "australia"], required: true },
    { key: "hero_copy", label: "Hero Copy", type: "textarea" },
    { key: "tuition_min", label: "Tuition Min (NGN/yr)", type: "number" },
    { key: "tuition_max", label: "Tuition Max (NGN/yr)", type: "number" },
    { key: "living_min", label: "Living Cost Min (NGN/yr)", type: "number" },
    { key: "living_max", label: "Living Cost Max (NGN/yr)", type: "number" },
    { key: "intakes", label: "Intakes", type: "string-array" },
    { key: "post_study_work", label: "Post-Study Work", type: "textarea" },
    { key: "top_courses", label: "Top Courses", type: "string-array" },
    { key: "visa_notes", label: "Visa Notes", type: "textarea" },
    { key: "currency", label: "Local Currency Code", type: "text" },
  ],
  listColumns: ["country_code", "currency"],
};
