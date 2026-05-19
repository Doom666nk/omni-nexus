import { NextRequest, NextResponse } from "next/server"
import { kvOk } from "@/lib/kv"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const ok = await kvOk()
  return NextResponse.json({ ok: true, kvOk: ok, ts: new Date().toISOString() })
}
