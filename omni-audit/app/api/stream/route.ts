export const runtime = "edge"

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder()

  function sseEvent(event: string, data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const stream = new ReadableStream({
    start(controller) {
      // Événement de connexion initial
      controller.enqueue(
        sseEvent("connected", { ts: new Date().toISOString(), system: "OMNI-NEXUS" })
      )

      let tick = 0
      const interval = setInterval(() => {
        try {
          controller.enqueue(
            sseEvent("heartbeat", { ts: new Date().toISOString(), tick: ++tick })
          )
        } catch {
          clearInterval(interval)
        }
      }, 25_000)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  })
}
