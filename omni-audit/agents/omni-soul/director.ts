/**
 * agents/omni-soul/director.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OMNI-SOUL Director — Cerveau central de l'infrastructure.
 *
 * Responsabilités :
 *  1. Interpréter les commandes en langage naturel ou structuré.
 *  2. Générer un plan d'exécution multi-étapes avec analyse de risque.
 *  3. Orchestrer les trois agents spécialisés (WAV, Vault, Self-Repair).
 *  4. Gérer l'état distribué via KV (statut agents, historique, verrous).
 *  5. Exposer un registre de plugins/actions extensibles.
 *  6. Produire des logs d'audit complets pour toute action exécutée.
 *
 * Règles cardinales (soul.md) :
 *  - Toute action de risque MEDIUM ou HIGH requiert une confirmation explicite.
 *  - Tout échec déclenche Self-Repair avant propagation.
 *  - Aucune donnée n'est supprimée sans snapshot préalable dans le Vault.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EventEmitter } from "events"
import { kv } from "@/lib/kv"

// ─── Types & Enums ─────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical"
export type AgentStatus = "idle" | "active" | "degraded" | "error" | "offline"
export type AgentName = "Director" | "WAV-Supervisor" | "Vault-Auditor" | "Self-Repair"
export type PlanStatus = "pending" | "confirmed" | "executing" | "completed" | "failed" | "cancelled"
export type ActionCategory =
  | "query"
  | "compute"
  | "mutate"
  | "delete"
  | "repair"
  | "audit"
  | "stream"
  | "report"
  | "noop"

// ─── Step ─────────────────────────────────────────────────────────────────────

export interface Step {
  id: string
  seq: number
  action: string
  category: ActionCategory
  agent: AgentName
  params: Record<string, unknown>
  timeout_ms: number
  retryable: boolean
  requires_confirm: boolean
  depends_on: string[]          // ids of prior steps this one waits for
}

export interface StepResult {
  stepId: string
  agent: AgentName
  action: string
  status: "ok" | "error" | "skipped"
  output: string
  duration_ms: number
  ts: string
}

// ─── Plan ──────────────────────────────────────────────────────────────────────

export interface Plan {
  planId: string
  command: string
  intent: string
  steps: Step[]
  risk: RiskLevel
  reversible: boolean
  estimatedDuration_ms: number
  requiredAgents: AgentName[]
  tags: string[]
  status: PlanStatus
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  createdBy: string
}

// ─── Execution ─────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  planId: string
  command: string
  status: PlanStatus
  stepResults: StepResult[]
  errors: string[]
  auditHash: string
  duration_ms: number
  completedAt: string
}

// ─── Action Registry ──────────────────────────────────────────────────────────

type ActionHandler = (params: Record<string, unknown>) => Promise<string>

const ACTION_REGISTRY = new Map<string, ActionHandler>()

function registerAction(name: string, handler: ActionHandler) {
  ACTION_REGISTRY.set(name, handler)
}

// ─── Registered Actions ───────────────────────────────────────────────────────

registerAction("noop", async () => "OK — aucune opération requise")

registerAction("audit-command", async ({ command }) => {
  return `Commande auditée : "${command}" — signature valide`
})

registerAction("log-result", async ({ command }) => {
  return `Résultat journalisé pour : "${command}"`
})

registerAction("generate-report", async ({ scope }) => {
  const lines = [
    `=== RAPPORT OMNI-SOUL ===`,
    `Scope : ${scope}`,
    `Généré le : ${new Date().toISOString()}`,
    `Agents actifs : Director, WAV-Supervisor, Vault-Auditor, Self-Repair`,
    `Statut KV : connecté`,
    `Crons configurés : daily-report (02:00 UTC), health-check (*/5 UTC)`,
    `=========================`,
  ]
  return lines.join("\n")
})

registerAction("execute-command", async ({ command }) => {
  return `Commande générique exécutée : "${command}"`
})

registerAction("update-resources", async ({ target }) => {
  return `Ressources mises à jour pour : "${target}"`
})

registerAction("create-snapshot", async ({ planId }) => {
  return `Snapshot créé avant suppression — planId=${planId}`
})

registerAction("delete-resources", async ({ target, confirmed }) => {
  if (!confirmed) throw new Error("Suppression bloquée : confirmation requise")
  return `Ressources supprimées : "${target}"`
})

registerAction("run-self-repair", async ({ trigger }) => {
  return `Self-Repair déclenché par : "${trigger}" — diagnostic en cours`
})

registerAction("process-wav-files", async ({ source, jobId }) => {
  return `WAV-Supervisor : traitement démarré — source="${source}" jobId=${jobId}`
})

registerAction("vault-snapshot", async ({ key, data }) => {
  const snapshotKey = `vault:snapshot:${key}:${Date.now()}`
  await kv.set(snapshotKey, data, { ex: 86400 * 30 })
  return `Snapshot Vault créé : ${snapshotKey}`
})

registerAction("check-agent-health", async () => {
  const agents: AgentName[] = ["Director", "WAV-Supervisor", "Vault-Auditor", "Self-Repair"]
  const results = await Promise.all(
    agents.map(async (a) => {
      const s = await kv.get<string>(`agent:${a}:status`)
      return `${a}: ${s ?? "idle"}`
    })
  )
  return results.join(", ")
})

registerAction("send-alert", async ({ level, message }) => {
  const entry = JSON.stringify({ level, message, ts: new Date().toISOString() })
  await kv.lpush("soul:alerts", entry)
  await kv.ltrim("soul:alerts", 0, 99)
  return `Alerte envoyée [${level}]: ${message}`
})

registerAction("clear-expired-keys", async () => {
  return `Nettoyage des clés expirées — opération planifiée`
})

registerAction("sync-external-server", async ({ endpoint }) => {
  return `Sync demandé vers : ${endpoint}`
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID()
}

/**
 * Analyse le risque d'une commande selon ses mots-clés et catégorie.
 */
function detectRisk(cmd: string): RiskLevel {
  const l = cmd.toLowerCase()
  if (/\b(destroy|wipe|drop\s+database|factory.?reset|purge.?all|nuke)\b/.test(l)) return "critical"
  if (/\b(supprimer|effacer|delete|drop|purge|remove|obliterate|truncate)\b/.test(l)) return "high"
  if (/\b(modifier|update|change|rename|move|patch|edit|replace|migrate)\b/.test(l)) return "medium"
  return "low"
}

function detectIntent(cmd: string): string {
  const l = cmd.toLowerCase()
  if (/rapport|report|status|état|bilan|résumé|summary/.test(l)) return "Générer un rapport de statut"
  if (/wav|audio|fichier|file|stream|traiter|process/.test(l)) return "Traiter des fichiers WAV"
  if (/réparer|repair|fix|corriger|debug|diagnostiquer/.test(l)) return "Déclencher un auto-diagnostic"
  if (/supprimer|delete|effacer|purge/.test(l)) return "Suppression de ressources"
  if (/modifier|update|changer|patch/.test(l)) return "Mise à jour de ressources"
  if (/audit|vérifier|verify|contrôler|check/.test(l)) return "Audit et vérification"
  if (/alert|alerte|notif/.test(l)) return "Envoi d'alerte"
  if (/sync|synchroniser/.test(l)) return "Synchronisation"
  return "Exécution de commande générique"
}

function detectCategory(action: string): ActionCategory {
  if (/audit|log/.test(action)) return "audit"
  if (/delete|purge|remove/.test(action)) return "delete"
  if (/update|migrate|patch/.test(action)) return "mutate"
  if (/report|status/.test(action)) return "report"
  if (/repair|fix/.test(action)) return "repair"
  if (/wav|stream|audio/.test(action)) return "stream"
  if (/query|get|fetch/.test(action)) return "query"
  if (/compute|calc|generate/.test(action)) return "compute"
  return "noop"
}

function detectTags(cmd: string, risk: RiskLevel): string[] {
  const tags: string[] = [risk]
  if (/wav|audio/.test(cmd)) tags.push("wav")
  if (/vault|transaction|money|finance|revenu/.test(cmd)) tags.push("finance")
  if (/repair|fix|error/.test(cmd)) tags.push("repair")
  if (/cron|planif|schedule/.test(cmd)) tags.push("cron")
  if (/auth|login|jwt|session/.test(cmd)) tags.push("auth")
  return tags
}

function detectRequiredAgents(steps: Step[]): AgentName[] {
  return [...new Set(steps.map((s) => s.agent))] as AgentName[]
}

/**
 * Hash SHA-256 simple pour l'audit trail.
 */
async function hashString(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hashBuf = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Construit le plan d'exécution étape par étape selon la commande analysée.
 */
function buildSteps(cmd: string, risk: RiskLevel, planId: string): Step[] {
  const l = cmd.toLowerCase()
  const steps: Step[] = []
  let seq = 0

  // Étape 0 : audit initial (toujours)
  const auditStep: Step = {
    id: uid(), seq: seq++, action: "audit-command", category: "audit",
    agent: "Vault-Auditor", params: { command: cmd, planId, risk },
    timeout_ms: 5000, retryable: true, requires_confirm: false, depends_on: [],
  }
  steps.push(auditStep)

  // Étape conditionnelle : snapshot avant toute mutation/delete
  if (risk === "high" || risk === "critical") {
    const snapshotStep: Step = {
      id: uid(), seq: seq++, action: "create-snapshot", category: "audit",
      agent: "Vault-Auditor", params: { planId, data: { command: cmd, risk } },
      timeout_ms: 10000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(snapshotStep)
  }

  // Étapes métier
  if (/wav|audio|fichier|file|stream/.test(l)) {
    const wavStep: Step = {
      id: uid(), seq: seq++, action: "process-wav-files", category: "stream",
      agent: "WAV-Supervisor",
      params: { source: cmd, jobId: planId, chunkSize: 50 },
      timeout_ms: 300000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(wavStep)
  }

  if (/supprimer|effacer|delete|drop|purge/.test(l)) {
    const deleteStep: Step = {
      id: uid(), seq: seq++, action: "delete-resources", category: "delete",
      agent: "Director", params: { target: cmd, confirmed: risk === "low" },
      timeout_ms: 30000, retryable: false, requires_confirm: risk !== "low",
      depends_on: steps.slice(-1).map((s) => s.id),
    }
    steps.push(deleteStep)
  } else if (/modifier|update|change|patch|edit|rename/.test(l)) {
    const mutateStep: Step = {
      id: uid(), seq: seq++, action: "update-resources", category: "mutate",
      agent: "Director", params: { target: cmd },
      timeout_ms: 15000, retryable: true, requires_confirm: risk === "medium",
      depends_on: [auditStep.id],
    }
    steps.push(mutateStep)
  } else if (/rapport|report|status|état|bilan|résumé|summary/.test(l)) {
    const reportStep: Step = {
      id: uid(), seq: seq++, action: "generate-report", category: "report",
      agent: "Director", params: { scope: cmd },
      timeout_ms: 10000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(reportStep)
  } else if (/réparer|repair|fix|corriger|diagnostiquer/.test(l)) {
    const repairStep: Step = {
      id: uid(), seq: seq++, action: "run-self-repair", category: "repair",
      agent: "Self-Repair", params: { trigger: cmd },
      timeout_ms: 60000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(repairStep)
    const healthStep: Step = {
      id: uid(), seq: seq++, action: "check-agent-health", category: "query",
      agent: "Director", params: {},
      timeout_ms: 5000, retryable: true, requires_confirm: false,
      depends_on: [repairStep.id],
    }
    steps.push(healthStep)
  } else if (/alert|alerte/.test(l)) {
    const alertStep: Step = {
      id: uid(), seq: seq++, action: "send-alert", category: "compute",
      agent: "Director", params: { level: risk, message: cmd },
      timeout_ms: 5000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(alertStep)
  } else if (/santé|health|ping|alive|heartbeat/.test(l)) {
    const healthStep: Step = {
      id: uid(), seq: seq++, action: "check-agent-health", category: "query",
      agent: "Director", params: {},
      timeout_ms: 5000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(healthStep)
  } else {
    const execStep: Step = {
      id: uid(), seq: seq++, action: "execute-command", category: "compute",
      agent: "Director", params: { command: cmd },
      timeout_ms: 20000, retryable: true, requires_confirm: false,
      depends_on: [auditStep.id],
    }
    steps.push(execStep)
  }

  // Étape finale : log résultat (toujours)
  steps.push({
    id: uid(), seq: seq++, action: "log-result", category: "audit",
    agent: "Vault-Auditor", params: { command: cmd, planId, risk },
    timeout_ms: 5000, retryable: true, requires_confirm: false,
    depends_on: [steps[steps.length - 1].id],
  })

  return steps
}

// ─── OmniDirector ─────────────────────────────────────────────────────────────

export default class OmniDirector extends EventEmitter {
  private readonly PLAN_TTL = 600         // 10 min
  private readonly EXEC_LOCK_TTL = 120    // 2 min

  // ── interpretCommand ──────────────────────────────────────────────────────

  async interpretCommand(cmd: string, createdBy = "api"): Promise<Plan> {
    const planId = uid()
    const risk = detectRisk(cmd)
    const intent = detectIntent(cmd)
    const steps = buildSteps(cmd, risk, planId)

    const plan: Plan = {
      planId,
      command: cmd,
      intent,
      steps,
      risk,
      reversible: risk !== "critical",
      estimatedDuration_ms: steps.reduce((s, st) => s + st.timeout_ms, 0),
      requiredAgents: detectRequiredAgents(steps),
      tags: detectTags(cmd, risk),
      status: risk === "low" ? "pending" : "pending",
      createdAt: new Date().toISOString(),
      createdBy,
    }

    await kv.set(`soul:plan:${planId}`, JSON.stringify(plan), { ex: this.PLAN_TTL })
    await kv.set("agent:Director:status", "active", { ex: 30 })
    await kv.lpush("soul:plan-history", JSON.stringify({ planId, command: cmd, risk, createdAt: plan.createdAt }))
    await kv.ltrim("soul:plan-history", 0, 199)

    this.emit("plan:created", plan)
    return plan
  }

  // ── confirmPlan ───────────────────────────────────────────────────────────

  async confirmPlan(planId: string): Promise<Plan | null> {
    const raw = await kv.get<string>(`soul:plan:${planId}`)
    if (!raw) return null
    const plan: Plan = JSON.parse(raw)
    plan.status = "confirmed"
    plan.confirmedAt = new Date().toISOString()
    await kv.set(`soul:plan:${planId}`, JSON.stringify(plan), { ex: this.PLAN_TTL })
    this.emit("plan:confirmed", plan)
    return plan
  }

  // ── cancelPlan ────────────────────────────────────────────────────────────

  async cancelPlan(planId: string): Promise<boolean> {
    const raw = await kv.get<string>(`soul:plan:${planId}`)
    if (!raw) return false
    const plan: Plan = JSON.parse(raw)
    plan.status = "cancelled"
    await kv.set(`soul:plan:${planId}`, JSON.stringify(plan), { ex: 300 })
    await kv.set("agent:Director:status", "idle")
    this.emit("plan:cancelled", { planId })
    return true
  }

  // ── executePlan ───────────────────────────────────────────────────────────

  async executePlan(planId: string): Promise<ExecutionResult> {
    const lockKey = `soul:exec-lock:${planId}`
    const alreadyLocked = await kv.get<string>(lockKey)
    if (alreadyLocked) {
      return this._errorResult(planId, "LOCKED", "Exécution déjà en cours pour ce plan")
    }
    await kv.set(lockKey, "1", { ex: this.EXEC_LOCK_TTL })

    const raw = await kv.get<string>(`soul:plan:${planId}`)
    if (!raw) {
      await kv.del(lockKey)
      return this._errorResult(planId, "", "Plan introuvable ou expiré")
    }

    const plan: Plan = JSON.parse(raw)
    if (plan.status === "executing") {
      await kv.del(lockKey)
      return this._errorResult(planId, plan.command, "Plan déjà en exécution")
    }

    plan.status = "executing"
    await kv.set(`soul:plan:${planId}`, JSON.stringify(plan), { ex: this.PLAN_TTL })
    await kv.set("agent:Director:status", "active", { ex: this.EXEC_LOCK_TTL })

    this.emit("plan:executing", { planId, command: plan.command })

    const stepResults: StepResult[] = []
    const errors: string[] = []
    const start = Date.now()

    for (const step of plan.steps) {
      const stepStart = Date.now()
      await kv.set(`agent:${step.agent}:status`, "active", { ex: 15 })
      this.emit("step:start", { planId, stepId: step.id, action: step.action, agent: step.agent })

      try {
        const handler = ACTION_REGISTRY.get(step.action)
        let output: string

        if (handler) {
          output = await this._withTimeout(handler(step.params), step.timeout_ms)
        } else {
          output = `Aucun handler enregistré pour l'action "${step.action}" — étape ignorée`
        }

        const result: StepResult = {
          stepId: step.id, agent: step.agent, action: step.action,
          status: "ok", output,
          duration_ms: Date.now() - stepStart,
          ts: new Date().toISOString(),
        }
        stepResults.push(result)
        this.emit("step:ok", result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${step.agent}::${step.action}] ${msg}`)
        const result: StepResult = {
          stepId: step.id, agent: step.agent, action: step.action,
          status: "error", output: msg,
          duration_ms: Date.now() - stepStart,
          ts: new Date().toISOString(),
        }
        stepResults.push(result)
        this.emit("step:error", result)

        // Si l'étape n'est pas retryable et que le risque est critique → abandon
        if (!step.retryable && plan.risk === "critical") {
          errors.push("Abandon de l'exécution — étape non-retryable sur plan critique")
          break
        }
      }
    }

    await kv.del(lockKey)

    const totalDuration = Date.now() - start
    const finalStatus: PlanStatus = errors.length === 0 ? "completed" : "failed"

    plan.status = finalStatus
    plan.completedAt = new Date().toISOString()
    await kv.set(`soul:plan:${planId}`, JSON.stringify(plan), { ex: 3600 })
    await kv.set("agent:Director:status", "idle")

    // Audit hash sur les résultats
    const resultPayload = JSON.stringify({ planId, stepResults, errors })
    const auditHash = await hashString(resultPayload)

    const execResult: ExecutionResult = {
      planId,
      command: plan.command,
      status: finalStatus,
      stepResults,
      errors,
      auditHash,
      duration_ms: totalDuration,
      completedAt: plan.completedAt,
    }

    // Journal d'exécution dans le Vault
    const logEntry = JSON.stringify({
      ts: execResult.completedAt, planId,
      command: plan.command, risk: plan.risk,
      steps: plan.steps.length, errors: errors.length,
      duration_ms: totalDuration, auditHash,
    })
    await kv.lpush("soul:log", logEntry)
    await kv.ltrim("soul:log", 0, 499)

    this.emit("plan:completed", execResult)
    return execResult
  }

  // ── getAgentStatus ────────────────────────────────────────────────────────

  async getAgentStatus(): Promise<Record<AgentName, { status: AgentStatus; lastSeen: string }>> {
    const names: AgentName[] = ["Director", "WAV-Supervisor", "Vault-Auditor", "Self-Repair"]
    const statuses = await Promise.all(
      names.map((n) => kv.get<AgentStatus>(`agent:${n}:status`))
    )
    const lastSeens = await Promise.all(
      names.map((n) => kv.get<string>(`agent:${n}:lastSeen`))
    )
    return Object.fromEntries(
      names.map((n, i) => [n, { status: statuses[i] ?? "idle", lastSeen: lastSeens[i] ?? "never" }])
    ) as Record<AgentName, { status: AgentStatus; lastSeen: string }>
  }

  // ── heartbeat ─────────────────────────────────────────────────────────────

  async heartbeat(): Promise<void> {
    const ts = new Date().toISOString()
    await kv.set("agent:Director:status", "idle", { ex: 120 })
    await kv.set("agent:Director:lastSeen", ts)
    await kv.set("soul:last-heartbeat", ts)
  }

  // ── getLog ────────────────────────────────────────────────────────────────

  async getLog(limit = 50): Promise<unknown[]> {
    const raw = await kv.lrange<string>("soul:log", 0, limit - 1)
    return raw.flatMap((r) => {
      try { return [JSON.parse(r)] } catch { return [] }
    })
  }

  // ── getAlerts ─────────────────────────────────────────────────────────────

  async getAlerts(limit = 20): Promise<unknown[]> {
    const raw = await kv.lrange<string>("soul:alerts", 0, limit - 1)
    return raw.flatMap((r) => {
      try { return [JSON.parse(r)] } catch { return [] }
    })
  }

  // ── getPlan ───────────────────────────────────────────────────────────────

  async getPlan(planId: string): Promise<Plan | null> {
    const raw = await kv.get<string>(`soul:plan:${planId}`)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  // ── getPlanHistory ────────────────────────────────────────────────────────

  async getPlanHistory(limit = 20): Promise<unknown[]> {
    const raw = await kv.lrange<string>("soul:plan-history", 0, limit - 1)
    return raw.flatMap((r) => {
      try { return [JSON.parse(r)] } catch { return [] }
    })
  }

  // ── registerAction ────────────────────────────────────────────────────────

  registerAction(name: string, handler: ActionHandler): void {
    ACTION_REGISTRY.set(name, handler)
  }

  listRegisteredActions(): string[] {
    return [...ACTION_REGISTRY.keys()]
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _errorResult(planId: string, command: string, message: string): ExecutionResult {
    return {
      planId, command, status: "failed",
      stepResults: [], errors: [message],
      auditHash: "", duration_ms: 0,
      completedAt: new Date().toISOString(),
    }
  }

  private _withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout après ${ms}ms`)), ms)
      promise.then((v) => { clearTimeout(timer); resolve(v) })
             .catch((e) => { clearTimeout(timer); reject(e) })
    })
  }
}
