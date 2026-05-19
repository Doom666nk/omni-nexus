import { NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const logs = await kv.lrange<string>("soul:log", 0, 49)
  const date = new Date().toISOString().slice(0, 10)
  const generatedAt = new Date().toISOString()

  const rapport = {
    date,
    totalCommands: logs.length,
    generatedAt,
    entries: logs,
  }

  await kv.set(`reports:daily:${date}`, rapport, { ex: 2_592_000 }) // 30 jours

  return NextResponse.json({
    ok: true,
    date,
    totalCommands: logs.length,
    generatedAt,
  })
}
