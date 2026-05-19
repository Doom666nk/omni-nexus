/**
 * lib/engine/audit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Moteur d'audit OMNI-SOUL.
 * Enregistre chaque action API avec contexte, IP, user, durée.
 * Calcule un hash SHA-256 en chaîne pour garantir l'immuabilité.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { kv } from "@/lib/kv"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "auth:login"
  | "auth:logout"
  | "soul:interpret"
  | "soul:confirm"
  | "soul:execute"
  | "soul:cancel"
  | "vault:read"
  | "vault:write"
  | "vault:snapshot"
  | "wav:job:create"
  | "wav:job:complete"
  | "cron:run"
  | "health:check"
  | "admin:access"
  | "api:call"
  | "error:escalated"

export interface AuditEntry {
  id: string
  seq: number
  action: AuditAction | string
  userId?: string
  ip?: string
  userAgent?: string
  method?: string
  path?: string
  statusCode?: number
  duration_ms?: number
  planId?: string
  risk?: string
  success: boolean
  details?: Record<string, unknown>
  prevHash: string
  hash: string
  ts: string
}

// ─── AuditLogger ──────────────────────────────────────────────────────────────

const AUDIT_KEY = "audit:log"
const AUDIT_SEQ_KEY = "audit:seq"

async function computeHash(entry: Omit<AuditEntry, "hash">): Promise<string> {
  const payload = [entry.prevHash, entry.id, entry.action, entry.ts].join(":")
  const buf = new TextEncoder().encode(payload)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function logAudit(
  action: AuditAction | string,
  opts: Partial<Omit<AuditEntry, "id" | "seq" | "prevHash" | "hash" | "ts" | "action">> = {}
): Promise<AuditEntry> {
  const rawSeq = await kv.get<number>(AUDIT_SEQ_KEY)
  const seq = (rawSeq ?? 0) + 1

  const lastRaw = await kv.lrange<string>(AUDIT_KEY, 0, 0)
  let prevHash = "GENESIS"
  if (lastRaw.length > 0) {
    try { prevHash = (JSON.parse(lastRaw[0]) as AuditEntry).hash } catch { /* ignore */ }
  }

  const partial: Omit<AuditEntry, "hash"> = {
    id: crypto.randomUUID(),
    seq, action,
    prevHash,
    ts: new Date().toISOString(),
    success: opts.success ?? true,
    ...opts,
  }

  const hash = await computeHash(partial)
  const entry: AuditEntry = { ...partial, hash }

  await kv.lpush(AUDIT_KEY, JSON.stringify(entry))
  await kv.ltrim(AUDIT_KEY, 0, 9999)
  await kv.set(AUDIT_SEQ_KEY, seq)

  return entry
}

export async function getAuditLog(limit = 100, offset = 0): Promise<AuditEntry[]> {
  const raw = await kv.lrange<string>(AUDIT_KEY, offset, offset + limit - 1)
  return raw.flatMap((r) => { try { return [JSON.parse(r) as AuditEntry] } catch { return [] } })
}

export async function verifyAuditIntegrity(): Promise<{ valid: boolean; broken: number[] }> {
  const all = await kv.lrange<string>(AUDIT_KEY, 0, -1)
  const entries = all.flatMap((r) => { try { return [JSON.parse(r) as AuditEntry] } catch { return [] } })
  const broken: number[] = []

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].prevHash !== entries[i - 1].hash) {
      broken.push(entries[i].seq)
    }
  }

  return { valid: broken.length === 0, broken }
}

export async function getAuditStats(): Promise<{
  total: number
  byAction: Record<string, number>
  successRate: number
  lastEntry?: AuditEntry
}> {
  const log = await getAuditLog(500)
  const byAction: Record<string, number> = {}
  let successCount = 0

  for (const e of log) {
    byAction[e.action] = (byAction[e.action] ?? 0) + 1
    if (e.success) successCount++
  }

  return {
    total: log.length,
    byAction,
    successRate: log.length > 0 ? Math.round((successCount / log.length) * 100) : 100,
    lastEntry: log[0],
  }
}
