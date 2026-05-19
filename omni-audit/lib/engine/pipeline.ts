/**
 * lib/engine/pipeline.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline d'orchestration OMNI-SOUL.
 * Coordonne Director → Vault-Auditor → WAV-Supervisor → Self-Repair
 * dans un flux événementiel transactionnel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import OmniDirector, { type Plan, type ExecutionResult } from "@/agents/omni-soul/director"
import { VaultAuditor } from "@/agents/omni-soul/vault-auditor"
import { WavSupervisor } from "@/agents/omni-soul/wav-supervisor"
import { SelfRepair } from "@/agents/omni-soul/self-repair"
import { kv } from "@/lib/kv"

// ─── Singleton instances ──────────────────────────────────────────────────────

let _director: OmniDirector | null = null
let _vault: VaultAuditor | null = null
let _wav: WavSupervisor | null = null
let _repair: SelfRepair | null = null

export function getDirector(): OmniDirector {
  if (!_director) _director = new OmniDirector()
  return _director
}

export function getVault(): VaultAuditor {
  if (!_vault) _vault = new VaultAuditor()
  return _vault
}

export function getWav(): WavSupervisor {
  if (!_wav) _wav = new WavSupervisor()
  return _wav
}

export function getRepair(): SelfRepair {
  if (!_repair) _repair = new SelfRepair()
  return _repair
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface PipelineInput {
  command: string
  autoConfirm?: boolean
  createdBy?: string
}

export interface PipelineOutput {
  plan: Plan
  execution?: ExecutionResult
  autoExecuted: boolean
  requiresConfirmation: boolean
}

/**
 * Exécute le pipeline complet :
 *  1. interpret  → plan
 *  2. audit signature (Vault)
 *  3. auto-confirmer si risque low, sinon retourner pour confirmation manuelle
 *  4. exécuter si autoConfirm ou risque low
 *  5. enregistrer la transaction de coût d'exécution dans le Vault
 *  6. réparer automatiquement en cas d'erreur
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const director = getDirector()
  const vault = getVault()
  const repair = getRepair()

  let plan: Plan
  try {
    plan = await director.interpretCommand(input.command, input.createdBy ?? "pipeline")
  } catch (err) {
    const repairResult = await repair.repair(err instanceof Error ? err : new Error(String(err)))
    throw new Error(`Pipeline interpret failed: ${repairResult.action}`)
  }

  // Audit signature
  try {
    await vault.auditCommandSignature(input.command, plan.planId)
  } catch (_) { /* non-bloquant */ }

  const requiresConfirmation = plan.risk === "medium" || plan.risk === "high" || plan.risk === "critical"
  const shouldAutoExecute = !requiresConfirmation || input.autoConfirm === true

  if (!shouldAutoExecute) {
    return { plan, execution: undefined, autoExecuted: false, requiresConfirmation: true }
  }

  // Confirmer et exécuter
  await director.confirmPlan(plan.planId)

  let execution: ExecutionResult
  try {
    execution = await director.executePlan(plan.planId)
  } catch (err) {
    const repairResult = await repair.repair(err instanceof Error ? err : new Error(String(err)))
    // Enregistrer l'échec dans le vault
    try {
      await vault.addTransaction({
        type: "debit",
        amount: 0.001,
        currency: "SOUL",
        description: `Exécution échouée: ${plan.command.slice(0, 50)} — ${repairResult.action}`,
        reference: plan.planId,
        tags: ["error", "repair"],
        metadata: { repairResult },
      })
    } catch (_) { /* non-bloquant */ }
    throw err
  }

  // Enregistrer le coût de l'exécution dans le Vault
  try {
    await vault.addTransaction({
      type: "debit",
      amount: plan.steps.length * 0.001,
      currency: "SOUL",
      description: `Exécution plan: ${plan.command.slice(0, 60)}`,
      reference: plan.planId,
      tags: [...plan.tags, "execution"],
      metadata: { planId: plan.planId, steps: plan.steps.length, risk: plan.risk },
    })
  } catch (_) { /* non-bloquant */ }

  return { plan, execution, autoExecuted: true, requiresConfirmation: false }
}

// ─── Health check du pipeline ─────────────────────────────────────────────────

export interface PipelineHealth {
  healthy: boolean
  kv: boolean
  director: string
  vault: string
  wav: string
  selfRepair: string
  uptime: string
  ts: string
}

export async function pipelineHealth(): Promise<PipelineHealth> {
  const [dirStatus, vaultStatus, wavStatus, repairStatus] = await Promise.all([
    kv.get<string>("agent:Director:status"),
    kv.get<string>("agent:Vault-Auditor:status"),
    kv.get<string>("agent:WAV-Supervisor:status"),
    kv.get<string>("agent:Self-Repair:status"),
  ])

  let kvOk = false
  try {
    const ping = await kv.ping()
    kvOk = ping === "PONG"
  } catch { /* ignore */ }

  const uptime = await kv.get<string>("soul:last-heartbeat")

  return {
    healthy: kvOk,
    kv: kvOk,
    director: dirStatus ?? "idle",
    vault: vaultStatus ?? "idle",
    wav: wavStatus ?? "idle",
    selfRepair: repairStatus ?? "idle",
    uptime: uptime ?? "unknown",
    ts: new Date().toISOString(),
  }
}
