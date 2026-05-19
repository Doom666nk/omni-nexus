/**
 * agents/omni-soul/vault-auditor.ts — Comptabilité souveraine et audit trail.
 */

import { EventEmitter } from "events"
import { kv } from "@/lib/kv"

export interface Transaction {
  id: string
  type: "credit" | "debit"
  amount: number
  description: string
  ts: string
}

export class VaultAuditor extends EventEmitter {
  async addTransaction(
    tx: Omit<Transaction, "id" | "ts">
  ): Promise<Transaction> {
    const full: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
    }
    await kv.lpush("vault:transactions", JSON.stringify(full))
    await kv.ltrim("vault:transactions", 0, 999)
    this.emit("transaction", full)
    return full
  }

  async getBalance(): Promise<number> {
    const all = await kv.lrange<string>("vault:transactions", 0, -1)
    return all.reduce((sum, raw) => {
      try {
        const tx = JSON.parse(raw) as Transaction
        return tx.type === "credit" ? sum + tx.amount : sum - tx.amount
      } catch {
        return sum
      }
    }, 0)
  }

  async getAuditLog(limit = 20): Promise<Transaction[]> {
    const raw = await kv.lrange<string>("vault:transactions", 0, limit - 1)
    return raw.flatMap((r) => {
      try { return [JSON.parse(r) as Transaction] } catch { return [] }
    })
  }
}
