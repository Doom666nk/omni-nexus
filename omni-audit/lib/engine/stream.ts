/**
 * lib/engine/stream.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Moteur SSE (Server-Sent Events) OMNI-SOUL.
 * Gère les streams temps-réel pour le COMMAND dashboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { kv } from "@/lib/kv"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SseEventType =
  | "heartbeat"
  | "agent:status"
  | "plan:created"
  | "plan:confirmed"
  | "plan:executing"
  | "plan:completed"
  | "plan:failed"
  | "step:ok"
  | "step:error"
  | "repair:triggered"
  | "repair:resolved"
  | "vault:transaction"
  | "wav:progress"
  | "alert"
  | "log"

export interface SseEvent<T = unknown> {
  id: string
  type: SseEventType
  data: T
  ts: string
}

// ─── SSE Builder ──────────────────────────────────────────────────────────────

export function buildSseFrame(event: SseEvent): string {
  const payload =
    event.data && typeof event.data === "object"
      ? { ...(event.data as Record<string, unknown>), _ts: event.ts }
      : { value: event.data, _ts: event.ts }
  const lines = [
    `id: ${event.id}`,
    `event: ${event.type}`,
    `data: ${JSON.stringify(payload)}`,
    "",
    "",
  ]
  return lines.join("\n")
}

export function buildHeartbeatFrame(): string {
  return buildSseFrame({
    id: crypto.randomUUID(),
    type: "heartbeat",
    data: { alive: true },
    ts: new Date().toISOString(),
  })
}

// ─── StreamBroker ─────────────────────────────────────────────────────────────

/**
 * Publie un événement SSE dans KV pour diffusion aux clients connectés.
 */
export async function publishEvent<T>(type: SseEventType, data: T): Promise<void> {
  const event: SseEvent<T> = {
    id: crypto.randomUUID(),
    type, data,
    ts: new Date().toISOString(),
  }
  await kv.lpush("sse:events", JSON.stringify(event))
  await kv.ltrim("sse:events", 0, 99)
}

/**
 * Récupère les derniers événements SSE depuis KV (polling fallback).
 */
export async function getRecentEvents(limit = 20): Promise<SseEvent[]> {
  const raw = await kv.lrange<string>("sse:events", 0, limit - 1)
  return raw.flatMap((r) => { try { return [JSON.parse(r) as SseEvent] } catch { return [] } })
}

// ─── createSseStream ──────────────────────────────────────────────────────────

/**
 * Crée un ReadableStream SSE pour Next.js Route Handler.
 * Envoie heartbeat + événements KV en polling toutes les 2s.
 */
export function createSseStream(opts: {
  heartbeat_ms?: number
  maxDuration_ms?: number
  channel?: string
}): ReadableStream {
  const heartbeat_ms = opts.heartbeat_ms ?? 15000
  const maxDuration_ms = opts.maxDuration_ms ?? 55000  // Vercel max 60s
  const startedAt = Date.now()

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  return new ReadableStream({
    start(controller) {
      // Initial heartbeat
      controller.enqueue(new TextEncoder().encode(buildHeartbeatFrame()))

      // Heartbeat périodique
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(buildHeartbeatFrame()))
          if (Date.now() - startedAt >= maxDuration_ms) {
            cleanup()
            controller.close()
          }
        } catch { cleanup() }
      }, heartbeat_ms)

      // Polling des événements KV toutes les 2s
      pollTimer = setInterval(async () => {
        try {
          const events = await getRecentEvents(5)
          for (const event of events.reverse()) {
            if (!opts.channel || event.type.startsWith(opts.channel)) {
              controller.enqueue(new TextEncoder().encode(buildSseFrame(event)))
            }
          }
        } catch { /* ignore polling errors */ }
      }, 2000)

      function cleanup() {
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        if (pollTimer) clearInterval(pollTimer)
      }
    },

    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (pollTimer) clearInterval(pollTimer)
    },
  })
}
