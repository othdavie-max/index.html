import { slugify } from "@/lib/utils";

export interface HeadingEntry {
  id: string;
  text: string;
}

/** Injects id="" attributes into <h2> tags and returns them for a table of contents. */
export function extractHeadings(html: string): { html: string; headings: HeadingEntry[] } {
  const headings: HeadingEntry[] = [];
  const withIds = html.replace(/<h2>(.*?)<\/h2>/g, (_match, text: string) => {
    const id = slugify(text);
    headings.push({ id, text });
    return `<h2 id="${id}">${text}</h2>`;
  });
  return { html: withIds, headings };
}
