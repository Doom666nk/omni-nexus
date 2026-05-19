import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { kv, KV_KEYS, pushBounded } from "@/lib/kv"
import { authenticate } from "@/lib/auth"
import {
  BalancesSchema,
  TransactionInputSchema,
  type Balances,
  type Transaction,
  ZERO_BALANCES,
} from "@/lib/types/vault"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const balancesRaw = await kv.get(KV_KEYS.vaultBalances)
  const txRaw = await kv.get<Transaction[]>(KV_KEYS.vaultTransactions)
  const balances: Balances = BalancesSchema.safeParse(balancesRaw).success
    ? (balancesRaw as Balances)
    : ZERO_BALANCES
  const transactions = (txRaw ?? []).slice(0, 50)
  return NextResponse.json({ balances, transactions }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = TransactionInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", issues: parsed.error.issues }, { status: 400 })
  }

  const tx: Transaction = {
    id: parsed.data.id ?? randomUUID(),
    agentId: parsed.data.agentId,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    description: parsed.data.description,
    timestamp: parsed.data.timestamp ?? new Date().toISOString(),
  }

  try {
    await pushBounded(KV_KEYS.vaultTransactions, tx, 50)
    const balancesRaw = await kv.get(KV_KEYS.vaultBalances)
    const balances: Balances = BalancesSchema.safeParse(balancesRaw).success
      ? (balancesRaw as Balances)
      : { ...ZERO_BALANCES }
    balances[tx.currency] += tx.amount
    await kv.set(KV_KEYS.vaultBalances, balances)
    return NextResponse.json({ transaction: tx, balances }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: "kv_error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    )
  }
}
