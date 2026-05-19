import { kv, KV_KEYS } from "@/lib/kv"

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number
}

/**
 * Sliding window rate limit using Vercel KV INCR + EXPIRE.
 * Default: 60 requests per minute per IP.
 */
export async function rateLimit(
  ip: string,
  limit = 60,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const key = KV_KEYS.ratelimit(ip)
  const count = await kv.incr(key)
  if (count === 1) {
    await kv.expire(key, windowSeconds)
  }
  const ttl = await kv.ttl(key)
  const retryAfter = ttl > 0 ? ttl : windowSeconds
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter,
  }
}
