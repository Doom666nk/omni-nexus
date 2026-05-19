/**
 * lib/engine/ratelimit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rate limiter glissant pour l'API OMNI-SOUL.
 * Implémente un algorithme sliding window log via KV.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { kv } from "@/lib/kv"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Nombre de requêtes autorisées dans la fenêtre */
  limit: number
  /** Durée de la fenêtre en secondes */
  window_s: number
  /** Identifiant du tier (pour logs) */
  tier?: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number       // timestamp UNIX (secondes)
  retryAfter?: number // secondes à attendre si bloqué
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  api_default:    { limit: 30,  window_s: 60,   tier: "default"  },
  api_soul:       { limit: 10,  window_s: 60,   tier: "soul"     },
  api_stream:     { limit: 5,   window_s: 60,   tier: "stream"   },
  api_auth:       { limit: 5,   window_s: 300,  tier: "auth"     },
  api_cron:       { limit: 100, window_s: 3600, tier: "cron"     },
  api_vault:      { limit: 20,  window_s: 60,   tier: "vault"    },
  api_health:     { limit: 60,  window_s: 60,   tier: "health"   },
} satisfies Record<string, RateLimitConfig>

// ─── SlidingWindowRateLimiter ─────────────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - config.window_s
  const key = `rl:${config.tier ?? "default"}:${identifier}`

  // Récupérer les timestamps des requêtes existantes dans la fenêtre
  const existing = await kv.lrange<string>(key, 0, -1)
  const validTimestamps = existing
    .map(Number)
    .filter((ts) => ts > windowStart)

  const count = validTimestamps.length
  const allowed = count < config.limit
  const reset = now + config.window_s
  const remaining = Math.max(0, config.limit - count - 1)

  if (allowed) {
    await kv.lpush(key, String(now))
    await kv.ltrim(key, 0, config.limit * 2)
    // TTL égal à la fenêtre
    await kv.set(`${key}:ttl`, "1", { ex: config.window_s })
  }

  const oldest = validTimestamps.length > 0 ? Math.min(...validTimestamps) : now
  const retryAfter = allowed ? undefined : Math.max(1, oldest + config.window_s - now)

  return { allowed, limit: config.limit, remaining, reset, retryAfter }
}

// ─── Headers helpers ──────────────────────────────────────────────────────────

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  }
  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = String(result.retryAfter)
  }
  return headers
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      retryAfter: result.retryAfter,
      reset: result.reset,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders(result),
      },
    }
  )
}
