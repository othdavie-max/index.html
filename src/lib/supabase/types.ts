// Hand-written types mirroring supabase/schema.sql. If the schema changes,
// regenerate with `supabase gen types typescript` and replace this file.
//
// IMPORTANT: keep every Row/Insert/Update below as an inline object literal
// — referencing a named `interface`/`type` here (even one that's
// structurally identical) breaks postgrest-js's generic inference and
// silently collapses every table's Insert/Update to `never`. Verified by
// bisecting: swapping a literal for a named interface alone reproduces the
// break across ALL tables, not just the one changed.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type LooseTable = Table<Record<string, unknown>, Record<string, unknown>>;

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: string; full_name: string | null; role: "admin" | "editor"; created_at: string },
        { id: string; full_name?: string | null; role?: "admin" | "editor" }
      >;
      leads: Table<
        {
          id: string;
          created_at: string;
          name: string;
          phone: string;
          email: string | null;
          source: string;
          status: "New" | "Contacted" | "In progress" | "Converted" | "Closed";
          notes: string | null;
          payload: Json;
        },
        {
          name: string;
          phone: string;
          email?: string | null;
          source: string;
          status?: "New" | "Contacted" | "In progress" | "Converted" | "Closed";
          notes?: string | null;
          payload?: Json;
        },
        {
          id?: string;
          created_at?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          source?: string;
          status?: "New" | "Contacted" | "In progress" | "Converted" | "Closed";
          notes?: string | null;
          payload?: Json;
        }
      >;
      bookings: Table<
        {
          id: string;
          created_at: string;
          name: string;
          phone: string;
          email: string;
          consultation_type: "video-call" | "phone-call" | "in-person";
          scheduled_date: string;
          scheduled_time: string;
          destination: string | null;
          level: string | null;
          message: string | null;
          status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No-show";
        },
        {
          name: string;
          phone: string;
          email: string;
          consultation_type: "video-call" | "phone-call" | "in-person";
          scheduled_date: string;
          scheduled_time: string;
          destination?: string | null;
          level?: string | null;
          message?: string | null;
          status?: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No-show";
        },
        {
          id?: string;
          created_at?: string;
          name?: string;
          phone?: string;
          email?: string;
          consultation_type?: "video-call" | "phone-call" | "in-person";
          scheduled_date?: string;
          scheduled_time?: string;
          destination?: string | null;
          level?: string | null;
          message?: string | null;
          status?: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No-show";
        }
      >;
      applications: Table<
        {
          id: string;
          created_at: string;
          reference_id: string;
          full_name: string;
          email: string;
          phone: string;
          level: "foundation" | "undergraduate" | "masters" | "phd";
          destination_countries: string[];
          course_of_interest: string | null;
          intake: string | null;
          academic_background: Json;
          english_test: Json;
          documents: Json;
          status: string;
          consent: boolean;
        },
        {
          reference_id: string;
          full_name: string;
          email: string;
          phone: string;
          level: "foundation" | "undergraduate" | "masters" | "phd";
          destination_countries: string[];
          course_of_interest?: string | null;
          intake?: string | null;
          academic_background?: Json;
          english_test?: Json;
          documents?: Json;
          status?: string;
          consent: boolean;
        },
        {
          id?: string;
          created_at?: string;
          reference_id?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          level?: "foundation" | "undergraduate" | "masters" | "phd";
          destination_countries?: string[];
          course_of_interest?: string | null;
          intake?: string | null;
          academic_background?: Json;
          english_test?: Json;
          documents?: Json;
          status?: string;
          consent?: boolean;
        }
      >;
      testimonials: LooseTable;
      partners: LooseTable;
      team_members: LooseTable;
      faqs: LooseTable;
      blog_posts: LooseTable;
      guides: LooseTable;
      destination_content: LooseTable;
      cost_items: LooseTable;
      exchange_rates: LooseTable;
      timeline_milestones: LooseTable;
      site_settings: Table<
        { id: number; data: Json; updated_at: string },
        { id?: number; data: Json },
        { data?: Json; updated_at?: string }
      >;
      chat_conversations: LooseTable;
      guide_downloads: LooseTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
