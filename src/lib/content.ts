import { createClient } from "@/lib/supabase/server";

/**
 * Generic content-fetch helper: reads a published, admin-editable table from
 * Supabase when it's configured, otherwise returns the local seed data so
 * every page still renders in local dev / previews without a database.
 */
export async function getPublishedRows<T>(
  table: string,
  localFallback: T[],
  orderBy?: string,
): Promise<T[]> {
  const supabase = await createClient();
  if (!supabase) return localFallback;

  let query = supabase.from(table).select("*").eq("published", true);
  if (orderBy) query = query.order(orderBy, { ascending: true });
  const { data, error } = await query;

  if (error || !data || data.length === 0) return localFallback;
  return data as T[];
}

export async function getSingletonRow<T>(table: string, localFallback: T): Promise<T> {
  const supabase = await createClient();
  if (!supabase) return localFallback;

  const { data, error } = await supabase.from(table).select("*").limit(1).maybeSingle();
  if (error || !data) return localFallback;
  return data as T;
}
