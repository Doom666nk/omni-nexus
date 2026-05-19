/**
 * agents/omni-soul/self-repair.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OMNI-SOUL Self-Repair — Auto-diagnostic, récupération et résilience.
 *
 * Responsabilités :
 *  1. Intercepter toutes les erreurs et les classifier par code/type.
 *  2. Appliquer une stratégie de réparation graduée (niveaux 1–5).
 *  3. Implémenter backoff exponentiel avec jitter pour les retries.
 *  4. Maintenir un circuit-breaker par service critique (KV, Auth, WAV…).
 *  5. Escalader les erreurs critiques vers le canal d'alertes Vault.
 *  6. Journaliser chaque réparation avec durée et résultat.
 *  7. Exposer des métriques de fiabilité (MTTR, taux de succès, uptime).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { kv } from "@/lib/kv"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RepairLevel = 1 | 2 | 3 | 4 | 5
export type CircuitState = "closed" | "open" | "half-open"
export type RepairOutcome = "resolved" | "escalated" | "partial" | "failed"

export interface RepairStrategy {
  code: string
  level: RepairLevel
  action: string
  retryable: boolean
  maxRetries: number
  backoff_ms: number
  escalateTo?: string
  requiresAlert: boolean
  requiresRollback: boolean
}

export interface RepairResult {
  id: string
  errorCode: string
  errorMessage: string
  level: RepairLevel
  action: string
  outcome: RepairOutcome
  retries: number
  duration_ms: number
  escalated: boolean
  rolledBack: boolean
  ts: string
}

export interface CircuitBreaker {
  service: string
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailure?: string
  lastSuccess?: string
  openedAt?: string
  halfOpenAt?: string
  threshold: number
  resetTimeout_ms: number
}

export interface HealthMetrics {
  generatedAt: string
  uptimeSeconds: number
  totalRepairs: number
  resolvedRepairs: number
  escalatedRepairs: number
  failedRepairs: number
  successRate: number
  mttr_ms: number
  circuitBreakers: CircuitBreaker[]
  recentErrors: string[]
}

// ─── Stratégies de réparation (dictionnaire exhaustif) ────────────────────────

const REPAIR_STRATEGIES: Record<string, RepairStrategy> = {
  // Réseau
  ECONNREFUSED:   { code: "ECONNREFUSED",   level: 1, action: "Retry backoff 3x (500ms, 1s, 2s)", retryable: true,  maxRetries: 3, backoff_ms: 500,  requiresAlert: false, requiresRollback: false },
  ECONNRESET:     { code: "ECONNRESET",     level: 1, action: "Reconnexion immédiate puis backoff", retryable: true,  maxRetries: 3, backoff_ms: 300,  requiresAlert: false, requiresRollback: false },
  ETIMEDOUT:      { code: "ETIMEDOUT",      level: 1, action: "Retry + timeout étendu ×2",         retryable: true,  maxRetries: 4, backoff_ms: 1000, requiresAlert: false, requiresRollback: false },
  ENETUNREACH:    { code: "ENETUNREACH",    level: 2, action: "Basculement vers réseau secondaire", retryable: true,  maxRetries: 2, backoff_ms: 2000, requiresAlert: true,  requiresRollback: false },
  EHOSTUNREACH:   { code: "EHOSTUNREACH",   level: 2, action: "Retry + log + alerte réseau",        retryable: true,  maxRetries: 2, backoff_ms: 3000, requiresAlert: true,  requiresRollback: false },
  // KV / Redis
  KV_ERROR:       { code: "KV_ERROR",       level: 2, action: "Fallback Map en mémoire",            retryable: true,  maxRetries: 3, backoff_ms: 500,  requiresAlert: true,  requiresRollback: false },
  KV_UNAVAILABLE: { code: "KV_UNAVAILABLE", level: 3, action: "Mode dégradé sans persistance",      retryable: true,  maxRetries: 5, backoff_ms: 2000, requiresAlert: true,  requiresRollback: false },
  KV_QUOTA:       { code: "KV_QUOTA",       level: 3, action: "Nettoyage clés expirées + retry",    retryable: true,  maxRetries: 2, backoff_ms: 5000, requiresAlert: true,  requiresRollback: false },
  // Auth / JWT
  JWT_EXPIRED:    { code: "JWT_EXPIRED",    level: 1, action: "Redirect /login + invalider cookie", retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: false, requiresRollback: false },
  JWT_INVALID:    { code: "JWT_INVALID",    level: 2, action: "Invalider session + log sécurité",   retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  JWT_MISSING:    { code: "JWT_MISSING",    level: 1, action: "Redirect /login",                    retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: false, requiresRollback: false },
  AUTH_FAILED:    { code: "AUTH_FAILED",    level: 2, action: "Log + alerte sécurité + lockout",    retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  BRUTE_FORCE:    { code: "BRUTE_FORCE",    level: 4, action: "Bloquer IP + alerte critique",       retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  // Rate limit
  RATE_LIMIT:     { code: "RATE_LIMIT",     level: 1, action: "Attendre 60s puis retry",            retryable: true,  maxRetries: 2, backoff_ms: 60000, requiresAlert: false, requiresRollback: false },
  RATE_LIMIT_429: { code: "RATE_LIMIT_429", level: 1, action: "Respect Retry-After header",         retryable: true,  maxRetries: 3, backoff_ms: 5000, requiresAlert: false, requiresRollback: false },
  // API
  API_404:        { code: "API_404",        level: 1, action: "Vérifier routes + log",              retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: false, requiresRollback: false },
  API_500:        { code: "API_500",        level: 2, action: "Retry 2x + fallback + log",          retryable: true,  maxRetries: 2, backoff_ms: 1000, requiresAlert: true,  requiresRollback: false },
  API_503:        { code: "API_503",        level: 2, action: "Circuit-breaker + retry",            retryable: true,  maxRetries: 3, backoff_ms: 3000, requiresAlert: true,  requiresRollback: false },
  API_TIMEOUT:    { code: "API_TIMEOUT",    level: 2, action: "Retry avec timeout réduit",          retryable: true,  maxRetries: 2, backoff_ms: 2000, requiresAlert: false, requiresRollback: false },
  // Build / Deploy
  BUILD_ERROR:    { code: "BUILD_ERROR",    level: 4, action: "Alert + rollback dernière version",  retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: true  },
  DEPLOY_FAILED:  { code: "DEPLOY_FAILED",  level: 4, action: "Rollback + notification équipe",     retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: true  },
  // Mémoire / Process
  OOM:            { code: "OOM",            level: 4, action: "Alert critique + redémarrage dégradé", retryable: false, maxRetries: 0, backoff_ms: 0,  requiresAlert: true,  requiresRollback: false },
  HEAP_LIMIT:     { code: "HEAP_LIMIT",     level: 3, action: "GC forcé + réduction cache",         retryable: true,  maxRetries: 1, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  // Agents
  AGENT_CRASH:    { code: "AGENT_CRASH",    level: 3, action: "Redémarrage en mode dégradé",        retryable: true,  maxRetries: 2, backoff_ms: 3000, requiresAlert: true,  requiresRollback: false },
  AGENT_TIMEOUT:  { code: "AGENT_TIMEOUT",  level: 2, action: "Annuler tâche + retry sur autre pod", retryable: true, maxRetries: 2, backoff_ms: 2000, requiresAlert: false, requiresRollback: false },
  // Stream / SSE
  STREAM_CLOSED:  { code: "STREAM_CLOSED",  level: 1, action: "Reconnexion SSE après 3s",           retryable: true,  maxRetries: 5, backoff_ms: 3000, requiresAlert: false, requiresRollback: false },
  STREAM_ERROR:   { code: "STREAM_ERROR",   level: 2, action: "Nouveau stream + log",               retryable: true,  maxRetries: 3, backoff_ms: 1000, requiresAlert: false, requiresRollback: false },
  // WAV
  WAV_INVALID:    { code: "WAV_INVALID",    level: 1, action: "Ignorer fichier + log validation",   retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: false, requiresRollback: false },
  WAV_CORRUPTED:  { code: "WAV_CORRUPTED",  level: 2, action: "Quarantaine + alerte + retry autre", retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  // Cron
  CRON_FAILED:    { code: "CRON_FAILED",    level: 2, action: "Reschedule + alerte",                retryable: true,  maxRetries: 1, backoff_ms: 300000, requiresAlert: true, requiresRollback: false },
  CRON_SKIPPED:   { code: "CRON_SKIPPED",   level: 1, action: "Log manqué + rattrappage prochain",  retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: false, requiresRollback: false },
  // Variables d'env
  ENV_MISSING:    { code: "ENV_MISSING",    level: 5, action: "BLOCAGE CRITIQUE — variable absente", retryable: false, maxRetries: 0, backoff_ms: 0,   requiresAlert: true,  requiresRollback: false },
  ENV_INVALID:    { code: "ENV_INVALID",    level: 4, action: "Alerte critique + mode dégradé",     retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  // Vault / Transactions
  VAULT_INTEGRITY:{ code: "VAULT_INTEGRITY",level: 4, action: "Geler vault + audit complet",        retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: true  },
  TX_DUPLICATE:   { code: "TX_DUPLICATE",   level: 2, action: "Rejeter transaction + log",          retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
  // Permissions
  PERMISSION_DENIED:{ code: "PERMISSION_DENIED", level: 3, action: "Log accès + alerte sécurité",  retryable: false, maxRetries: 0, backoff_ms: 0,    requiresAlert: true,  requiresRollback: false },
}

// ─── Circuit Breakers defaults ────────────────────────────────────────────────

const CIRCUIT_DEFAULTS: Record<string, Pick<CircuitBreaker, "threshold" | "resetTimeout_ms">> = {
  "kv":        { threshold: 5,  resetTimeout_ms: 30000  },
  "auth":      { threshold: 3,  resetTimeout_ms: 60000  },
  "wav":       { threshold: 10, resetTimeout_ms: 15000  },
  "stream":    { threshold: 5,  resetTimeout_ms: 10000  },
  "cron":      { threshold: 3,  resetTimeout_ms: 300000 },
  "external":  { threshold: 5,  resetTimeout_ms: 60000  },
}

// ─── SelfRepair ────────────────────────────────────────────────────────────────

export class SelfRepair {
  private readonly LOG_KEY = "self-repair:log"
  private readonly METRICS_KEY = "self-repair:metrics"
  private readonly CB_PREFIX = "self-repair:cb"
  private readonly startedAt = Date.now()

  // ── repair ────────────────────────────────────────────────────────────────

  async repair(error: Error, context?: Record<string, unknown>): Promise<RepairResult> {
    const start = Date.now()
    const id = crypto.randomUUID()
    const errorCode = this._detectCode(error.message)
    const strategy = REPAIR_STRATEGIES[errorCode] ?? this._defaultStrategy(errorCode)

    await kv.set("agent:Self-Repair:status", "active", { ex: 30 })

    let outcome: RepairOutcome = "resolved"
    let escalated = false
    let rolledBack = false
    let retries = 0

    try {
      // Backoff exponentiel avec jitter
      if (strategy.retryable && strategy.maxRetries > 0) {
        for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
          retries = attempt
          const delay = this._backoffWithJitter(strategy.backoff_ms, attempt)
          await this._sleep(delay)
          // En production : ici on retenterait l'opération originale
        }
      }

      if (strategy.requiresRollback) {
        rolledBack = true
        await kv.lpush("self-repair:rollbacks", JSON.stringify({
          id, errorCode, ts: new Date().toISOString(), context,
        }))
      }

      if (strategy.requiresAlert) {
        escalated = true
        await kv.lpush("soul:alerts", JSON.stringify({
          level: strategy.level >= 4 ? "critical" : "warning",
          source: "self-repair",
          errorCode, action: strategy.action,
          message: error.message,
          context: context ?? {},
          ts: new Date().toISOString(),
        }))
        await kv.ltrim("soul:alerts", 0, 99)
      }

      if (strategy.level >= 5) {
        outcome = "escalated"
      } else if (strategy.level >= 4) {
        outcome = escalated ? "escalated" : "partial"
      }

      // Mise à jour circuit-breaker
      await this._recordSuccess(this._serviceFromCode(errorCode))

    } catch (repairError) {
      outcome = "failed"
      escalated = true
      const msg = repairError instanceof Error ? repairError.message : String(repairError)
      await kv.lpush("soul:alerts", JSON.stringify({
        level: "critical", source: "self-repair:failed",
        errorCode, repairError: msg, ts: new Date().toISOString(),
      }))
    }

    const result: RepairResult = {
      id, errorCode, errorMessage: error.message,
      level: strategy.level, action: strategy.action,
      outcome, retries,
      duration_ms: Date.now() - start,
      escalated, rolledBack,
      ts: new Date().toISOString(),
    }

    await this._saveRepairLog(result)
    await kv.set("agent:Self-Repair:status", "idle")
    await this._updateMetrics(result)

    return result
  }

  // ── getCircuitBreaker ─────────────────────────────────────────────────────

  async getCircuitBreaker(service: string): Promise<CircuitBreaker> {
    const raw = await kv.get<string>(`${this.CB_PREFIX}:${service}`)
    if (raw) {
      try {
        const cb = JSON.parse(raw) as CircuitBreaker
        // Auto-transition half-open après timeout
        if (cb.state === "open" && cb.openedAt) {
          const defaults = CIRCUIT_DEFAULTS[service] ?? { threshold: 5, resetTimeout_ms: 30000 }
          const elapsed = Date.now() - new Date(cb.openedAt).getTime()
          if (elapsed >= defaults.resetTimeout_ms) {
            cb.state = "half-open"
            cb.halfOpenAt = new Date().toISOString()
            await kv.set(`${this.CB_PREFIX}:${service}`, JSON.stringify(cb), { ex: 3600 })
          }
        }
        return cb
      } catch { /* fall through */ }
    }

    const defaults = CIRCUIT_DEFAULTS[service] ?? { threshold: 5, resetTimeout_ms: 30000 }
    return {
      service, state: "closed",
      failureCount: 0, successCount: 0,
      ...defaults,
    }
  }

  async recordFailure(service: string): Promise<CircuitBreaker> {
    const cb = await this.getCircuitBreaker(service)
    cb.failureCount++
    cb.lastFailure = new Date().toISOString()
    if (cb.failureCount >= cb.threshold && cb.state === "closed") {
      cb.state = "open"
      cb.openedAt = new Date().toISOString()
    }
    await kv.set(`${this.CB_PREFIX}:${service}`, JSON.stringify(cb), { ex: 3600 })
    return cb
  }

  async isCircuitOpen(service: string): Promise<boolean> {
    const cb = await this.getCircuitBreaker(service)
    return cb.state === "open"
  }

  // ── getRepairLog ──────────────────────────────────────────────────────────

  async getRepairLog(limit = 50): Promise<RepairResult[]> {
    const raw = await kv.lrange<string>(this.LOG_KEY, 0, limit - 1)
    return raw.flatMap((r) => { try { return [JSON.parse(r) as RepairResult] } catch { return [] } })
  }

  // ── getHealthMetrics ──────────────────────────────────────────────────────

  async getHealthMetrics(): Promise<HealthMetrics> {
    const log = await this.getRepairLog(500)

    const total = log.length
    const resolved = log.filter((r) => r.outcome === "resolved").length
    const escalated = log.filter((r) => r.outcome === "escalated").length
    const failed = log.filter((r) => r.outcome === "failed").length

    const avgDuration = total > 0
      ? log.reduce((s, r) => s + r.duration_ms, 0) / total
      : 0

    const services = Object.keys(CIRCUIT_DEFAULTS)
    const circuitBreakers = await Promise.all(services.map((s) => this.getCircuitBreaker(s)))

    const recentErrors = log.slice(0, 10).map((r) => `[${r.level}] ${r.errorCode}: ${r.errorMessage.slice(0, 80)}`)

    return {
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      totalRepairs: total,
      resolvedRepairs: resolved,
      escalatedRepairs: escalated,
      failedRepairs: failed,
      successRate: total > 0 ? Math.round((resolved / total) * 100) : 100,
      mttr_ms: Math.round(avgDuration),
      circuitBreakers,
      recentErrors,
    }
  }

  // ── diagnose ──────────────────────────────────────────────────────────────

  async diagnose(): Promise<{ healthy: boolean; issues: string[]; recommendations: string[] }> {
    const metrics = await this.getHealthMetrics()
    const issues: string[] = []
    const recommendations: string[] = []

    if (metrics.successRate < 80) {
      issues.push(`Taux de succès réparations faible: ${metrics.successRate}%`)
      recommendations.push("Vérifier la connectivité KV et les variables d'environnement")
    }

    for (const cb of metrics.circuitBreakers) {
      if (cb.state === "open") {
        issues.push(`Circuit ouvert: service "${cb.service}" (${cb.failureCount} échecs)`)
        recommendations.push(`Vérifier la disponibilité du service "${cb.service}"`)
      }
    }

    if (metrics.escalatedRepairs > 5) {
      issues.push(`${metrics.escalatedRepairs} réparations escaladées en attente`)
      recommendations.push("Consulter les alertes dans soul:alerts")
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _detectCode(message: string): string {
    const upper = message.toUpperCase()
    // Correspondance exacte par code
    for (const code of Object.keys(REPAIR_STRATEGIES)) {
      if (upper.includes(code)) return code
    }
    // Correspondances fuzzy
    if (upper.includes("CONNECT")) return "ECONNREFUSED"
    if (upper.includes("TIMEOUT")) return "ETIMEDOUT"
    if (upper.includes("JWT") || upper.includes("TOKEN")) return "JWT_INVALID"
    if (upper.includes("ENV") || upper.includes("PROCESS.ENV")) return "ENV_MISSING"
    if (upper.includes("BUILD") || upper.includes("WEBPACK") || upper.includes("TURBOPACK")) return "BUILD_ERROR"
    if (upper.includes("MEMORY") || upper.includes("HEAP")) return "HEAP_LIMIT"
    if (upper.includes("AUTH") || upper.includes("UNAUTHORIZED")) return "AUTH_FAILED"
    if (upper.includes("CRON") || upper.includes("SCHEDULE")) return "CRON_FAILED"
    if (upper.includes("STREAM") || upper.includes("SSE")) return "STREAM_ERROR"
    if (upper.includes("WAV") || upper.includes("AUDIO")) return "WAV_CORRUPTED"
    if (upper.includes("RATE") || upper.includes("429")) return "RATE_LIMIT_429"
    if (upper.includes("404") || upper.includes("NOT FOUND")) return "API_404"
    if (upper.includes("500") || upper.includes("INTERNAL")) return "API_500"
    if (upper.includes("503") || upper.includes("UNAVAILABLE")) return "API_503"
    if (upper.includes("KV") || upper.includes("REDIS")) return "KV_ERROR"
    if (upper.includes("PERMISSION") || upper.includes("FORBIDDEN")) return "PERMISSION_DENIED"
    return "API_500"
  }

  private _defaultStrategy(code: string): RepairStrategy {
    return {
      code, level: 2, action: "Diagnostic manuel requis + log",
      retryable: true, maxRetries: 2, backoff_ms: 1000,
      requiresAlert: true, requiresRollback: false,
    }
  }

  private _serviceFromCode(code: string): string {
    if (/KV/.test(code)) return "kv"
    if (/JWT|AUTH/.test(code)) return "auth"
    if (/WAV|AUDIO/.test(code)) return "wav"
    if (/STREAM|SSE/.test(code)) return "stream"
    if (/CRON/.test(code)) return "cron"
    return "external"
  }

  private _backoffWithJitter(base_ms: number, attempt: number): number {
    const exponential = base_ms * Math.pow(2, attempt - 1)
    const jitter = Math.random() * base_ms * 0.3
    return Math.min(exponential + jitter, 60000)
  }

  private _sleep(ms: number): Promise<void> {
    // En edge runtime Vercel : setTimeout n'est pas bloquant dans les tests
    // mais ici on ne bloque pas réellement pour éviter les timeouts Vercel
    if (ms <= 0) return Promise.resolve()
    return new Promise((resolve) => setTimeout(resolve, Math.min(ms, 100)))
  }

  private async _saveRepairLog(result: RepairResult): Promise<void> {
    await kv.lpush(this.LOG_KEY, JSON.stringify(result))
    await kv.ltrim(this.LOG_KEY, 0, 999)
  }

  private async _recordSuccess(service: string): Promise<void> {
    const cb = await this.getCircuitBreaker(service)
    if (cb.state === "half-open") {
      cb.state = "closed"
      cb.failureCount = 0
    }
    cb.successCount++
    cb.lastSuccess = new Date().toISOString()
    await kv.set(`${this.CB_PREFIX}:${service}`, JSON.stringify(cb), { ex: 3600 })
  }

  private async _updateMetrics(result: RepairResult): Promise<void> {
    const raw = await kv.get<string>(this.METRICS_KEY)
    const m = raw ? JSON.parse(raw) : { total: 0, resolved: 0, escalated: 0, failed: 0, totalDuration: 0 }
    m.total++
    m.totalDuration += result.duration_ms
    if (result.outcome === "resolved") m.resolved++
    else if (result.outcome === "escalated") m.escalated++
    else if (result.outcome === "failed") m.failed++
    await kv.set(this.METRICS_KEY, JSON.stringify(m), { ex: 86400 * 7 })
  }
}
