/**
 * agents/omni-soul/director.ts — Cerveau central OMNI-SOUL.
 * Interprète les commandes, génère des plans, orchestre les agents.
 */

import { kv } from "@/lib/kv"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high"
export type AgentStatus = "idle" | "active" | "error"
export type AgentName = "Director" | "WAV-Supervisor" | "Vault-Auditor" | "Self-Repair"

export interface Step {
  id: string
  action: string
  agent: AgentName
  params: Record<string, unknown>
}

export interface Plan {
  planId: string
  command: string
  steps: Step[]
  risk: RiskLevel
  reversible: boolean
  createdAt: string
}

interface ExecutionResult {
  planId: string
  results: string[]
  errors: string[]
  completedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID()
}

function detectRisk(cmd: string): RiskLevel {
  const low = cmd.toLowerCase()
  if (/supprimer|effacer|delete|drop|purge|destroy|wipe/.test(low)) return "high"
  if (/modifier|update|change|edit|rename|move|patch/.test(low)) return "medium"
  return "low"
}

function detectReversible(risk: RiskLevel): boolean {
  return risk !== "high"
}

function buildSteps(cmd: string): Step[] {
  const low = cmd.toLowerCase()
  const steps: Step[] = []

  // Étape 1 : toujours auditer
  steps.push({
    id: uid(),
    action: "audit-command",
    agent: "Vault-Auditor",
    params: { command: cmd },
  })

  if (/wav|audio|fichier|file|stream/.test(low)) {
    steps.push({
      id: uid(),
      action: "process-wav-files",
      agent: "WAV-Supervisor",
      params: { source: cmd },
    })
  }

  if (/supprimer|effacer|delete|drop|purge/.test(low)) {
    steps.push({
      id: uid(),
      action: "delete-resources",
      agent: "Director",
      params: { target: cmd, confirmed: false },
    })
  } else if (/modifier|update|change|patch/.test(low)) {
    steps.push({
      id: uid(),
      action: "update-resources",
      agent: "Director",
      params: { target: cmd },
    })
  } else if (/rapport|report|status|état/.test(low)) {
    steps.push({
      id: uid(),
      action: "generate-report",
      agent: "Director",
      params: { scope: cmd },
    })
  } else if (/réparer|repair|fix|corriger/.test(low)) {
    steps.push({
      id: uid(),
      action: "run-self-repair",
      agent: "Self-Repair",
      params: { trigger: cmd },
    })
  } else {
    steps.push({
      id: uid(),
      action: "execute-command",
      agent: "Director",
      params: { command: cmd },
    })
  }

  // Étape finale : log résultat
  steps.push({
    id: uid(),
    action: "log-result",
    agent: "Vault-Auditor",
    params: { command: cmd },
  })

  return steps
}

// ─── OmniDirector ─────────────────────────────────────────────────────────────

export default class OmniDirector {
  async interpretCommand(cmd: string): Promise<Plan> {
    const risk = detectRisk(cmd)
    const plan: Plan = {
      planId: uid(),
      command: cmd,
      steps: buildSteps(cmd),
      risk,
      reversible: detectReversible(risk),
      createdAt: new Date().toISOString(),
    }
    await kv.set(`soul:pending-plan:${plan.planId}`, plan, { ex: 600 })
    await kv.set("agent:Director:status", "active", { ex: 30 })
    return plan
  }

  async executePlan(planId: string): Promise<ExecutionResult> {
    const plan = await kv.get<Plan>(`soul:pending-plan:${planId}`)
    const results: string[] = []
    const errors: string[] = []

    if (!plan) {
      return {
        planId,
        results: [],
        errors: [`Plan ${planId} introuvable ou expiré`],
        completedAt: new Date().toISOString(),
      }
    }

    await kv.set("agent:Director:status", "active", { ex: 60 })

    for (const step of plan.steps) {
      try {
        // Simulation d'exécution — chaque agent confirme l'étape
        const msg = `[${step.agent}] ${step.action} — OK`
        results.push(msg)
        await kv.set(`agent:${step.agent}:status`, "active", { ex: 10 })
      } catch (err) {
        const msg = `[${step.agent}] ${step.action} — ERREUR: ${err instanceof Error ? err.message : "inconnu"}`
        errors.push(msg)
      }
    }

    await kv.del(`soul:pending-plan:${planId}`)
    await kv.set("agent:Director:status", "idle")

    const result: ExecutionResult = {
      planId,
      results,
      errors,
      completedAt: new Date().toISOString(),
    }

    const logEntry = JSON.stringify({
      ts: result.completedAt,
      planId,
      command: plan.command,
      risk: plan.risk,
      steps: plan.steps.length,
      errors: errors.length,
    })
    await kv.lpush("soul:log", logEntry)
    await kv.ltrim("soul:log", 0, 49)

    return result
  }

  async getAgentStatus(): Promise<Record<AgentName, AgentStatus>> {
    const names: AgentName[] = ["Director", "WAV-Supervisor", "Vault-Auditor", "Self-Repair"]
    const statuses = await Promise.all(
      names.map((name) => kv.get<AgentStatus>(`agent:${name}:status`))
    )
    return Object.fromEntries(
      names.map((name, i) => [name, statuses[i] ?? "idle"])
    ) as Record<AgentName, AgentStatus>
  }
}
