import { NextResponse, type NextRequest } from "next/server"
import { authenticate } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const target = process.env.EXTERNAL_SERVER_URL
  if (!target) {
    return NextResponse.json({ ok: false, reason: "external_server_url_not_set" }, { status: 200 })
  }

  const t0 = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(target, { signal: controller.signal, cache: "no-store" })
    clearTimeout(timer)
    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        latencyMs: Date.now() - t0,
        lastSeen: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, latencyMs: Date.now() - t0, error: err instanceof Error ? err.message : "unknown" },
      { status: 200 },
    )
  }
}
