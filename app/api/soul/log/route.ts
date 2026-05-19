import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

export async function GET(): Promise<NextResponse> {
  const logs = await kv.lrange("soul:log", 0, 49)
  return NextResponse.json({ ok: true, logs })
}
