// Minimal in-memory sliding-window rate limiter for API routes.
// NOTE: state is per server instance — fine for a single-region Vercel
// deployment's basic abuse protection, but swap for a durable store
// (e.g. Upstash Redis) if you scale to multiple regions/instances.

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: timestamps.length <= limit, remaining: Math.max(0, limit - timestamps.length) };
}

export function getClientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}
