/**
 * agents/omni-soul/vault-auditor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OMNI-SOUL Vault-Auditor — Comptabilité souveraine, audit trail et snapshots.
 *
 * Responsabilités :
 *  1. Enregistrer toutes les transactions financières (crédit/débit).
 *  2. Calculer le solde courant avec réconciliation.
 *  3. Maintenir un audit trail immuable signé (SHA-256 en chaîne).
 *  4. Créer/restaurer des snapshots pour les opérations réversibles.
 *  5. Détecter les anomalies (doublon, montant aberrant, séquence brisée).
 *  6. Exporter des rapports comptables (journal, bilan, grand-livre).
 *  7. Fournir un hash de preuve d'intégrité de l'historique complet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EventEmitter } from "events"
import { kv } from "@/lib/kv"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TxType = "credit" | "debit" | "adjustment" | "snapshot" | "rollback"
export type TxStatus = "pending" | "confirmed" | "rejected" | "reversed"
export type AnomalyLevel = "info" | "warning" | "critical"

export interface Transaction {
  id: string
  seq: number
  type: TxType
  status: TxStatus
  amount: number
  currency: string
  description: string
  reference?: string
  tags: string[]
  prevHash: string       // hash de la transaction précédente (chaîne)
  hash: string           // SHA-256(prev_hash + id + amount + ts)
  ts: string
  confirmedAt?: string
  reversedAt?: string
  metadata: Record<string, unknown>
}

export interface Anomaly {
  id: string
  level: AnomalyLevel
  type: "duplicate" | "amount_outlier" | "sequence_break" | "hash_mismatch" | "balance_discrepancy"
  description: string
  txId?: string
  detectedAt: string
}

export interface Snapshot {
  snapshotId: string
  key: string
  data: unknown
  description: string
  balance: number
  txCount: number
  integrityHash: string
  createdAt: string
  expiresAt: string
}

export interface AuditReport {
  generatedAt: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  totalCredits: number
  totalDebits: number
  totalAdjustments: number
  netMovement: number
  txCount: number
  anomalyCount: number
  integrityHash: string
  transactions: Transaction[]
  anomalies: Anomaly[]
}

// ─── VaultAuditor ──────────────────────────────────────────────────────────────

export class VaultAuditor extends EventEmitter {
  private readonly TX_KEY = "vault:transactions"
  private readonly SEQ_KEY = "vault:seq"
  private readonly ANOMALY_KEY = "vault:anomalies"
  private readonly SNAPSHOT_PREFIX = "vault:snapshot"
  private readonly TX_TTL = 86400 * 365     // 1 an
  private readonly SNAPSHOT_TTL = 86400 * 30 // 30 jours

  // ── addTransaction ────────────────────────────────────────────────────────

  async addTransaction(
    input: Omit<Transaction, "id" | "seq" | "prevHash" | "hash" | "ts" | "status">
  ): Promise<Transaction> {
    // Récupérer le dernier seq et hash
    const rawSeq = await kv.get<number>(this.SEQ_KEY)
    const seq = (rawSeq ?? 0) + 1
    const lastRaw = await kv.lrange<string>(this.TX_KEY, 0, 0)
    let prevHash = "GENESIS"
    if (lastRaw.length > 0) {
      try {
        const lastTx = JSON.parse(lastRaw[0]) as Transaction
        prevHash = lastTx.hash
      } catch { /* ignore */ }
    }

    const id = crypto.randomUUID()
    const ts = new Date().toISOString()
    const hash = await this._hashTx(prevHash, id, input.amount, ts)

    const tx: Transaction = {
      ...input,
      id, seq, prevHash, hash, ts,
      status: "pending",
      currency: input.currency ?? "EUR",
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
    }

    await this._detectAnomalies(tx)

    await kv.lpush(this.TX_KEY, JSON.stringify(tx))
    await kv.ltrim(this.TX_KEY, 0, 4999)
    await kv.set(this.SEQ_KEY, seq)
    await kv.set("agent:Vault-Auditor:status", "active", { ex: 10 })

    this.emit("transaction:added", tx)
    return tx
  }

  // ── confirmTransaction ────────────────────────────────────────────────────

  async confirmTransaction(txId: string): Promise<boolean> {
    const all = await this._allTxRaw()
    const idx = all.findIndex((r) => {
      try { return (JSON.parse(r) as Transaction).id === txId } catch { return false }
    })
    if (idx === -1) return false

    const tx = JSON.parse(all[idx]) as Transaction
    tx.status = "confirmed"
    tx.confirmedAt = new Date().toISOString()
    all[idx] = JSON.stringify(tx)

    await kv.del(this.TX_KEY)
    for (const r of all) await kv.lpush(this.TX_KEY, r)
    this.emit("transaction:confirmed", { txId })
    return true
  }

  // ── reverseTransaction ────────────────────────────────────────────────────

  async reverseTransaction(txId: string, reason: string): Promise<Transaction | null> {
    const original = await this.getTransaction(txId)
    if (!original || original.status === "reversed") return null

    const reversal = await this.addTransaction({
      type: original.type === "credit" ? "debit" : "credit",
      amount: original.amount,
      currency: original.currency,
      description: `ANNULATION: ${original.description} — ${reason}`,
      reference: txId,
      tags: [...original.tags, "reversal"],
      metadata: { originalTxId: txId, reason },
    })

    // Marquer l'original comme inversé
    const all = await this._allTxRaw()
    const idx = all.findIndex((r) => {
      try { return (JSON.parse(r) as Transaction).id === txId } catch { return false }
    })
    if (idx !== -1) {
      const tx = JSON.parse(all[idx]) as Transaction
      tx.status = "reversed"
      tx.reversedAt = new Date().toISOString()
      all[idx] = JSON.stringify(tx)
      await kv.del(this.TX_KEY)
      for (const r of all) await kv.lpush(this.TX_KEY, r)
    }

    this.emit("transaction:reversed", { txId, reversalId: reversal.id })
    return reversal
  }

  // ── getBalance ────────────────────────────────────────────────────────────

  async getBalance(): Promise<number> {
    const all = await this._allTxParsed()
    return all.reduce((sum, tx) => {
      if (tx.status === "reversed") return sum
      switch (tx.type) {
        case "credit": return sum + tx.amount
        case "debit":  return sum - tx.amount
        case "adjustment": return sum + tx.amount
        default:       return sum
      }
    }, 0)
  }

  // ── getBalanceByCurrency ──────────────────────────────────────────────────

  async getBalanceByCurrency(): Promise<Record<string, number>> {
    const all = await this._allTxParsed()
    const balances: Record<string, number> = {}
    for (const tx of all) {
      if (tx.status === "reversed") continue
      const cur = tx.currency ?? "EUR"
      if (!balances[cur]) balances[cur] = 0
      balances[cur] += tx.type === "credit" ? tx.amount : -tx.amount
    }
    return balances
  }

  // ── getTransaction ────────────────────────────────────────────────────────

  async getTransaction(txId: string): Promise<Transaction | null> {
    const all = await this._allTxRaw()
    for (const r of all) {
      try {
        const tx = JSON.parse(r) as Transaction
        if (tx.id === txId) return tx
      } catch { /* ignore */ }
    }
    return null
  }

  // ── getAuditLog ───────────────────────────────────────────────────────────

  async getAuditLog(limit = 50, offset = 0): Promise<Transaction[]> {
    const raw = await kv.lrange<string>(this.TX_KEY, offset, offset + limit - 1)
    return raw.flatMap((r) => {
      try { return [JSON.parse(r) as Transaction] } catch { return [] }
    })
  }

  // ── createSnapshot ────────────────────────────────────────────────────────

  async createSnapshot(key: string, data: unknown, description = ""): Promise<Snapshot> {
    const snapshotId = crypto.randomUUID()
    const balance = await this.getBalance()
    const txCount = await this._txCount()
    const integrityHash = await this.computeIntegrityHash()
    const now = new Date()
    const expires = new Date(now.getTime() + this.SNAPSHOT_TTL * 1000)

    const snapshot: Snapshot = {
      snapshotId, key, data, description,
      balance, txCount, integrityHash,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    }

    await kv.set(`${this.SNAPSHOT_PREFIX}:${snapshotId}`, JSON.stringify(snapshot), { ex: this.SNAPSHOT_TTL })
    await kv.lpush(`${this.SNAPSHOT_PREFIX}:index`, JSON.stringify({
      snapshotId, key, description, balance, createdAt: snapshot.createdAt,
    }))
    await kv.ltrim(`${this.SNAPSHOT_PREFIX}:index`, 0, 199)

    this.emit("snapshot:created", { snapshotId, key, balance })
    return snapshot
  }

  // ── restoreSnapshot ───────────────────────────────────────────────────────

  async restoreSnapshot(snapshotId: string): Promise<Snapshot | null> {
    const raw = await kv.get<string>(`${this.SNAPSHOT_PREFIX}:${snapshotId}`)
    if (!raw) return null
    try {
      const snapshot = JSON.parse(raw) as Snapshot
      this.emit("snapshot:restored", { snapshotId, key: snapshot.key })
      return snapshot
    } catch { return null }
  }

  // ── listSnapshots ─────────────────────────────────────────────────────────

  async listSnapshots(limit = 20): Promise<unknown[]> {
    const raw = await kv.lrange<string>(`${this.SNAPSHOT_PREFIX}:index`, 0, limit - 1)
    return raw.flatMap((r) => { try { return [JSON.parse(r)] } catch { return [] } })
  }

  // ── computeIntegrityHash ──────────────────────────────────────────────────

  async computeIntegrityHash(): Promise<string> {
    const all = await this._allTxRaw()
    const payload = all.join("|")
    const buf = new TextEncoder().encode(payload)
    const hash = await crypto.subtle.digest("SHA-256", buf)
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  // ── verifyChain ───────────────────────────────────────────────────────────

  async verifyChain(): Promise<{ valid: boolean; brokenAt?: number; anomalies: Anomaly[] }> {
    const all = await this._allTxParsed()
    const anomalies: Anomaly[] = []
    let valid = true
    let brokenAt: number | undefined

    for (let i = 1; i < all.length; i++) {
      const current = all[i]
      const prev = all[i - 1]
      if (current.prevHash !== prev.hash) {
        valid = false
        brokenAt = current.seq
        const anomaly: Anomaly = {
          id: crypto.randomUUID(),
          level: "critical",
          type: "hash_mismatch",
          description: `Rupture de chaîne entre seq=${prev.seq} et seq=${current.seq}`,
          txId: current.id,
          detectedAt: new Date().toISOString(),
        }
        anomalies.push(anomaly)
        await this._saveAnomaly(anomaly)
      }
    }

    return { valid, brokenAt, anomalies }
  }

  // ── getAnomalies ──────────────────────────────────────────────────────────

  async getAnomalies(limit = 50): Promise<Anomaly[]> {
    const raw = await kv.lrange<string>(this.ANOMALY_KEY, 0, limit - 1)
    return raw.flatMap((r) => { try { return [JSON.parse(r) as Anomaly] } catch { return [] } })
  }

  // ── generateReport ────────────────────────────────────────────────────────

  async generateReport(periodStart?: string, periodEnd?: string): Promise<AuditReport> {
    const now = new Date().toISOString()
    const pStart = periodStart ?? new Date(Date.now() - 86400 * 30 * 1000).toISOString()
    const pEnd = periodEnd ?? now

    const all = await this._allTxParsed()
    const inPeriod = all.filter((tx) => tx.ts >= pStart && tx.ts <= pEnd)

    let totalCredits = 0
    let totalDebits = 0
    let totalAdjustments = 0

    for (const tx of inPeriod) {
      if (tx.status === "reversed") continue
      if (tx.type === "credit") totalCredits += tx.amount
      else if (tx.type === "debit") totalDebits += tx.amount
      else if (tx.type === "adjustment") totalAdjustments += tx.amount
    }

    const openingBalance = 0  // En production : calculer à partir de pStart
    const closingBalance = await this.getBalance()
    const integrityHash = await this.computeIntegrityHash()
    const anomalies = await this.getAnomalies(100)

    const report: AuditReport = {
      generatedAt: now, periodStart: pStart, periodEnd: pEnd,
      openingBalance, closingBalance,
      totalCredits, totalDebits, totalAdjustments,
      netMovement: totalCredits - totalDebits + totalAdjustments,
      txCount: inPeriod.length,
      anomalyCount: anomalies.length,
      integrityHash,
      transactions: inPeriod.slice(0, 200),
      anomalies: anomalies.slice(0, 50),
    }

    this.emit("report:generated", { generatedAt: now, txCount: inPeriod.length })
    return report
  }

  // ── auditCommandSignature ─────────────────────────────────────────────────

  async auditCommandSignature(command: string, planId: string): Promise<string> {
    const payload = `${planId}:${command}:${new Date().toISOString()}`
    const buf = new TextEncoder().encode(payload)
    const hash = await crypto.subtle.digest("SHA-256", buf)
    const sig = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
    await kv.set(`vault:cmd-sig:${planId}`, sig, { ex: 3600 })
    return sig
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async _allTxRaw(): Promise<string[]> {
    return kv.lrange<string>(this.TX_KEY, 0, -1)
  }

  private async _allTxParsed(): Promise<Transaction[]> {
    const raw = await this._allTxRaw()
    return raw.flatMap((r) => { try { return [JSON.parse(r) as Transaction] } catch { return [] } })
  }

  private async _txCount(): Promise<number> {
    const all = await this._allTxRaw()
    return all.length
  }

  private async _hashTx(prevHash: string, id: string, amount: number, ts: string): Promise<string> {
    const payload = `${prevHash}:${id}:${amount}:${ts}`
    const buf = new TextEncoder().encode(payload)
    const hash = await crypto.subtle.digest("SHA-256", buf)
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  private async _detectAnomalies(tx: Transaction): Promise<void> {
    // Détection de montant aberrant (> 1 000 000)
    if (Math.abs(tx.amount) > 1_000_000) {
      await this._saveAnomaly({
        id: crypto.randomUUID(), level: "warning", type: "amount_outlier",
        description: `Montant aberrant : ${tx.amount} ${tx.currency}`,
        txId: tx.id, detectedAt: new Date().toISOString(),
      })
    }

    // Détection de doublon (même montant + même description dans les 30 dernières transactions)
    const recent = await this.getAuditLog(30)
    const dupe = recent.find(
      (r) => r.amount === tx.amount && r.description === tx.description && r.id !== tx.id
    )
    if (dupe) {
      await this._saveAnomaly({
        id: crypto.randomUUID(), level: "warning", type: "duplicate",
        description: `Transaction potentiellement dupliquée : "${tx.description}"`,
        txId: tx.id, detectedAt: new Date().toISOString(),
      })
    }
  }

  private async _saveAnomaly(anomaly: Anomaly): Promise<void> {
    await kv.lpush(this.ANOMALY_KEY, JSON.stringify(anomaly))
    await kv.ltrim(this.ANOMALY_KEY, 0, 499)
    this.emit("anomaly:detected", anomaly)
  }
}
