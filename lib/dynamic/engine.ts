import { z } from "zod"
import { kv, KV_KEYS, pushBounded } from "@/lib/kv"
import type { DecisionLog } from "@/lib/types/agents"
import { randomUUID } from "node:crypto"

export const ALLOWED_CMDS = [
  "status",
  "restart-agent",
  "pause-wav",
  "resume-wav",
  "flush-logs",
  "health-check",
  "vault-report",
] as const

export type AllowedCmd = (typeof ALLOWED_CMDS)[number]

export const DynamicCommandSchema = z.object({
  cmd: z.enum(ALLOWED_CMDS),
  args: z.record(z.string(), z.string()).optional(),
})
export type DynamicCommand = z.infer<typeof DynamicCommandSchema>

export interface ExecutionResult {
  success: boolean
  result: string
  executionTime: number
}

const TIMEOUT_MS = 30_000

async function runWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  controller: AbortController,
): Promise<T> {
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await promise
  } finally {
    clearTimeout(timer)
  }
}

async function handle(cmd: AllowedCmd, args: Record<string, string> | undefined): Promise<string> {
  switch (cmd) {
    case "status": {
      const status = await kv.get(KV_KEYS.agentsStatus)
      return JSON.stringify(status ?? {})
    }
    case "restart-agent": {
      const id = args?.agentId ?? "unknown"
      const status = ((await kv.get<Record<string, string>>(KV_KEYS.agentsStatus)) ?? {}) as Record<string, string>
      status[id] = "active"
      await kv.set(KV_KEYS.agentsStatus, status)
      return `agent ${id} restarted`
    }
    case "pause-wav":
    case "resume-wav": {
      const progress = ((await kv.get<Record<string, unknown>>(KV_KEYS.wavProgress)) ?? {}) as Record<string, unknown>
      progress.status = cmd === "pause-wav" ? "paused" : "running"
      progress.updatedAt = new Date().toISOString()
      await kv.set(KV_KEYS.wavProgress, progress)
      return `wav ${cmd === "pause-wav" ? "paused" : "resumed"}`
    }
    case "flush-logs": {
      await kv.del(KV_KEYS.soulLog)
      return "soul log flushed"
    }
    case "health-check": {
      const ok = await kv.ping().then(() => true).catch(() => false)
      return JSON.stringify({ kvOk: ok, ts: new Date().toISOString() })
    }
    case "vault-report": {
      const balances = (await kv.get(KV_KEYS.vaultBalances)) ?? {}
      return JSON.stringify(balances)
    }
  }
}

export async function executeCommand(input: DynamicCommand): Promise<ExecutionResult> {
  const start = Date.now()
  const controller = new AbortController()
  let success = false
  let result = ""
  try {
    result = await runWithTimeout(handle(input.cmd, input.args), TIMEOUT_MS, controller)
    success = true
  } catch (err) {
    result = err instanceof Error ? err.message : "execution error"
    success = false
  }
  const executionTime = Date.now() - start

  const log: DecisionLog = {
    id: randomUUID(),
    cmd: input.cmd,
    args: input.args,
    result: result.slice(0, 500),
    success,
    executionTimeMs: executionTime,
    timestamp: new Date().toISOString(),
  }
  await pushBounded(KV_KEYS.soulLog, log, 50)

  return { success, result, executionTime }
}
