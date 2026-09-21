export type FieldType = "text" | "textarea" | "richtext" | "number" | "boolean" | "select" | "string-array";

// Only the loosely-typed content tables — CrudPage is a generic editor for
// these, never for leads/bookings/applications/profiles/site_settings,
// which have their own strict types and dedicated admin pages.
export type ContentTable =
  | "testimonials"
  | "partners"
  | "team_members"
  | "faqs"
  | "blog_posts"
  | "guides"
  | "destination_content"
  | "cost_items"
  | "exchange_rates"
  | "timeline_milestones";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  helpText?: string;
}

export interface CrudConfig {
  table: ContentTable;
  title: string;
  description: string;
  fields: FieldSchema[];
  listColumns: string[];
  orderBy?: string;
  hasPublished?: boolean;
}
