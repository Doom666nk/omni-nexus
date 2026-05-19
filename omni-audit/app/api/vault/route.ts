/**
 * app/api/vault/route.ts — GET/POST /api/vault
 * Accès au Vault-Auditor : transactions, solde, snapshots, rapports.
 */

import { NextRequest, NextResponse } from "next/server"
import { getVault } from "@/lib/engine/pipeline"
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders, rateLimitResponse } from "@/lib/engine/ratelimit"
import { logAudit } from "@/lib/engine/audit"
import { apiOk, apiError } from "@/lib/types"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const rl = await checkRateLimit(ip, RATE_LIMITS.api_vault)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? "summary"
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 500)
  const offset = Number(searchParams.get("offset") ?? "0")

  const vault = getVault()
  await logAudit("vault:read", { ip, success: true, details: { type } })

  switch (type) {
    case "summary": {
      const [balance, currencies, log, anomalies, snapshots] = await Promise.all([
        vault.getBalance(),
        vault.getBalanceByCurrency(),
        vault.getAuditLog(10),
        vault.getAnomalies(10),
        vault.listSnapshots(5),
      ])
      return NextResponse.json(apiOk({ balance, currencies, recentTransactions: log, anomalies, snapshots }), { headers: rateLimitHeaders(rl) })
    }
    case "transactions": {
      const log = await vault.getAuditLog(limit, offset)
      return NextResponse.json(apiOk({ transactions: log, limit, offset }), { headers: rateLimitHeaders(rl) })
    }
    case "balance": {
      const [balance, currencies] = await Promise.all([vault.getBalance(), vault.getBalanceByCurrency()])
      return NextResponse.json(apiOk({ balance, currencies }), { headers: rateLimitHeaders(rl) })
    }
    case "anomalies": {
      const anomalies = await vault.getAnomalies(limit)
      return NextResponse.json(apiOk({ anomalies }), { headers: rateLimitHeaders(rl) })
    }
    case "snapshots": {
      const snapshots = await vault.listSnapshots(limit)
      return NextResponse.json(apiOk({ snapshots }), { headers: rateLimitHeaders(rl) })
    }
    case "report": {
      const report = await vault.generateReport()
      return NextResponse.json(apiOk(report), { headers: rateLimitHeaders(rl) })
    }
    case "integrity": {
      const result = await vault.verifyChain()
      return NextResponse.json(apiOk(result), { headers: rateLimitHeaders(rl) })
    }
    default:
      return NextResponse.json(apiError(`Type inconnu: ${type}`, "UNKNOWN_TYPE"), { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const rl = await checkRateLimit(ip, RATE_LIMITS.api_vault)
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: {
    action?: string
    type?: "credit" | "debit" | "adjustment"
    amount?: number
    currency?: string
    description?: string
    reference?: string
    tags?: string[]
    snapshotKey?: string
    snapshotData?: unknown
    snapshotDescription?: string
    txId?: string
    reason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(apiError("Corps JSON invalide", "PARSE_ERROR"), { status: 400 })
  }

  const vault = getVault()
  const action = body.action ?? "add_transaction"

  try {
    switch (action) {
      case "add_transaction": {
        if (!body.type || body.amount === undefined || !body.description) {
          return NextResponse.json(apiError("type, amount, description requis", "MISSING_FIELDS"), { status: 400 })
        }
        const tx = await vault.addTransaction({
          type: body.type,
          amount: body.amount,
          currency: body.currency ?? "EUR",
          description: body.description,
          reference: body.reference,
          tags: body.tags ?? [],
          metadata: {},
        })
        await logAudit("vault:write", { ip, success: true, details: { action, txId: tx.id } })
        return NextResponse.json(apiOk(tx), { status: 201, headers: rateLimitHeaders(rl) })
      }
      case "snapshot": {
        if (!body.snapshotKey) return NextResponse.json(apiError("snapshotKey requis", "MISSING_KEY"), { status: 400 })
        const snap = await vault.createSnapshot(body.snapshotKey, body.snapshotData ?? {}, body.snapshotDescription)
        await logAudit("vault:snapshot", { ip, success: true, details: { snapshotId: snap.snapshotId } })
        return NextResponse.json(apiOk(snap), { status: 201, headers: rateLimitHeaders(rl) })
      }
      case "reverse": {
        if (!body.txId || !body.reason) return NextResponse.json(apiError("txId et reason requis", "MISSING_FIELDS"), { status: 400 })
        const reversal = await vault.reverseTransaction(body.txId, body.reason)
        if (!reversal) return NextResponse.json(apiError("Transaction introuvable ou déjà inversée", "NOT_FOUND"), { status: 404 })
        await logAudit("vault:write", { ip, success: true, details: { action: "reverse", txId: body.txId } })
        return NextResponse.json(apiOk(reversal), { headers: rateLimitHeaders(rl) })
      }
      default:
        return NextResponse.json(apiError(`Action inconnue: ${action}`, "UNKNOWN_ACTION"), { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Vault"
    return NextResponse.json(apiError(msg, "VAULT_ERROR"), { status: 500 })
  }
}
