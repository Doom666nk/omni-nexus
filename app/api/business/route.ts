import { NextResponse, type NextRequest } from "next/server"
import { kv, KV_KEYS } from "@/lib/kv"
import { authenticate } from "@/lib/auth"
import { type AgentId, type Currency, type DailyReport, type Transaction, ZERO_BALANCES } from "@/lib/types/vault"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Period = "day" | "week" | "month"

function rangeForPeriod(period: Period): string[] {
  const days = period === "day" ? 1 : period === "week" ? 7 : 30
  const out: string[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export async function GET(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const periodParam = url.searchParams.get("period") ?? "week"
  if (periodParam !== "day" && periodParam !== "week" && periodParam !== "month") {
    return NextResponse.json({ error: "invalid_period" }, { status: 400 })
  }
  const period = periodParam as Period
  const dates = rangeForPeriod(period)

  const reports = await Promise.all(
    dates.map((d) => kv.get<DailyReport>(KV_KEYS.vaultDaily(d))),
  )

  const byCurrency = { ...ZERO_BALANCES }
  const byAgent: Record<AgentId, number> = { architect: 0, engineer: 0, qa: 0, "omni-soul": 0 }
  let revenue = 0
  const trend: { date: string; total: number }[] = []

  for (let i = 0; i < dates.length; i++) {
    const r = reports[i]
    let dayTotal = 0
    if (r) {
      for (const k of Object.keys(byCurrency) as Currency[]) {
        byCurrency[k] += r.totalByCurrency[k] ?? 0
        dayTotal += r.totalByCurrency[k] ?? 0
      }
      for (const k of Object.keys(byAgent) as AgentId[]) {
        byAgent[k] += r.totalByAgent[k] ?? 0
      }
      revenue += dayTotal
    }
    trend.unshift({ date: dates[i]!, total: dayTotal })
  }

  // Fallback: if no daily reports yet, aggregate from current transactions
  if (revenue === 0) {
    const tx = ((await kv.get<Transaction[]>(KV_KEYS.vaultTransactions)) ?? []) as Transaction[]
    const cutoff = Date.now() - (period === "day" ? 1 : period === "week" ? 7 : 30) * 86400_000
    for (const t of tx) {
      if (Date.parse(t.timestamp) >= cutoff) {
        byCurrency[t.currency] += t.amount
        byAgent[t.agentId] += t.amount
        revenue += t.amount
      }
    }
  }

  return NextResponse.json({ revenue, byAgent, byCurrency, trend, period }, { status: 200 })
}
