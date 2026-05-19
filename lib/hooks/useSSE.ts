"use client"

import { useEffect, useRef, useState } from "react"

export type SSEStatus = "connecting" | "connected" | "disconnected"

export interface UseSSEResult<T> {
  data: T | null
  status: SSEStatus
}

export function useSSE<T = unknown>(url: string): UseSSEResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<SSEStatus>("connecting")
  const attemptRef = useRef(0)
  const cancelledRef = useRef(false)
  const sourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    cancelledRef.current = false

    const connect = () => {
      if (cancelledRef.current) return
      setStatus("connecting")
      const es = new EventSource(url)
      sourceRef.current = es

      es.onopen = () => {
        attemptRef.current = 0
        setStatus("connected")
      }
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as T
          setData(parsed)
        } catch {
          /* ignore malformed payload */
        }
      }
      es.onerror = () => {
        es.close()
        sourceRef.current = null
        setStatus("disconnected")
        if (cancelledRef.current) return
        const delay = Math.min(30_000, 1000 * 2 ** attemptRef.current)
        attemptRef.current += 1
        timerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelledRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [url])

  return { data, status }
}
