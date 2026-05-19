import { NextResponse, type NextRequest } from "next/server"
import { authenticate, getClientIp } from "@/lib/auth"
import { rateLimit } from "@/lib/ratelimit"
import { DynamicCommandSchema, executeCommand } from "@/lib/dynamic/engine"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const ip = getClientIp(req)
  const rl = await rateLimit(ip, 60, 60)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = DynamicCommandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", issues: parsed.error.issues }, { status: 400 })
  }

  const result = await executeCommand(parsed.data)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
