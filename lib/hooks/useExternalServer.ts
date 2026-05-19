"use client"

import { useEffect, useState } from "react"

export interface ExternalServerStatus {
  connected: boolean
  latency: number
  lastSeen: string | null
}

export function useExternalServer(pollMs = 10_000): ExternalServerStatus {
  const [state, setState] = useState<ExternalServerStatus>({
    connected: false,
    latency: 0,
    lastSeen: null,
  })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      const t0 = performance.now()
      try {
        const res = await fetch("/api/external/ping", { cache: "no-store" })
        const dt = performance.now() - t0
        if (cancelled) return
        if (res.ok) {
          const json = (await res.json()) as { lastSeen?: string }
          setState({ connected: true, latency: Math.round(dt), lastSeen: json.lastSeen ?? new Date().toISOString() })
        } else {
          setState((s) => ({ ...s, connected: false }))
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, connected: false }))
      } finally {
        if (!cancelled) timer = setTimeout(tick, pollMs)
      }
    }

    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pollMs])

  return state
}
