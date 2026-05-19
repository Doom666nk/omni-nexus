/**
 * agents/omni-soul/self-repair.ts — Auto-diagnostic et correction d'erreurs.
 */

import { kv } from "@/lib/kv"

export type RepairLevel = 1 | 2 | 3

interface RepairStrategy {
  level: RepairLevel
  action: string
}

interface RepairResult {
  errorCode: string
  level: RepairLevel
  action: string
  resolved: boolean
  ts: string
}

// 15 codes d'erreur connus
const REPAIR_DICT: Record<string, RepairStrategy> = {
  ECONNREFUSED:  { level: 1, action: "Retry backoff 3x" },
  ETIMEDOUT:     { level: 1, action: "Retry + timeout étendu" },
  KV_ERROR:      { level: 2, action: "Fallback mémoire" },
  JWT_EXPIRED:   { level: 1, action: "Redirect /login" },
  JWT_INVALID:   { level: 2, action: "Invalider session" },
  RATE_LIMIT:    { level: 1, action: "Attendre 60s" },
  AUTH_FAILED:   { level: 2, action: "Log + alert" },
  BUILD_ERROR:   { level: 3, action: "Alert + rollback" },
  OOM:           { level: 3, action: "Alert + redémarrage" },
  AGENT_CRASH:   { level: 2, action: "Relancer dégradé" },
  API_404:       { level: 1, action: "Vérifier routes" },
  API_500:       { level: 2, action: "Log + fallback" },
  STREAM_CLOSED: { level: 1, action: "Reconnexion SSE 3s" },
  CRON_FAILED:   { level: 2, action: "Reschedule + alert" },
  ENV_MISSING:   { level: 3, action: "BLOQUANT — variable absente" },
}

export class SelfRepair {
  private detectCode(message: string): string {
    const upper = message.toUpperCase()
    for (const code of Object.keys(REPAIR_DICT)) {
      if (upper.includes(code)) return code
    }
    // Correspondances supplémentaires
    if (upper.includes("CONNECT")) return "ECONNREFUSED"
    if (upper.includes("TIMEOUT")) return "ETIMEDOUT"
    if (upper.includes("JWT"))     return "JWT_INVALID"
    if (upper.includes("ENV"))     return "ENV_MISSING"
    if (upper.includes("BUILD"))   return "BUILD_ERROR"
    return "API_500"
  }

  async repair(error: Error): Promise<RepairResult> {
    const errorCode = this.detectCode(error.message)
    const strategy = REPAIR_DICT[errorCode] ?? { level: 2 as RepairLevel, action: "Diagnostic manuel requis" }

    const result: RepairResult = {
      errorCode,
      level: strategy.level,
      action: strategy.action,
      resolved: strategy.level < 3,
      ts: new Date().toISOString(),
    }

    const entry = JSON.stringify({
      ...result,
      originalMessage: error.message,
    })
    await kv.lpush("self-repair:log", entry)
    await kv.ltrim("self-repair:log", 0, 199)

    return result
  }
}
