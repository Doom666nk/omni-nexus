import { z } from "zod"
import { AgentIdSchema } from "./vault"

export const AgentStatusSchema = z.enum(["active", "suspended", "error"])
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const AgentsStatusMapSchema = z.record(AgentIdSchema, AgentStatusSchema)
export type AgentsStatusMap = z.infer<typeof AgentsStatusMapSchema>

export const LogLevelSchema = z.enum(["info", "warn", "error", "debug"])
export type LogLevel = z.infer<typeof LogLevelSchema>

export const LogEntrySchema = z.object({
  id: z.string(),
  agentId: AgentIdSchema,
  level: LogLevelSchema,
  message: z.string().max(500),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type LogEntry = z.infer<typeof LogEntrySchema>

export const DecisionLogSchema = z.object({
  id: z.string(),
  cmd: z.string(),
  args: z.record(z.string(), z.string()).optional(),
  result: z.string(),
  success: z.boolean(),
  executionTimeMs: z.number().nonnegative(),
  timestamp: z.string().datetime(),
})
export type DecisionLog = z.infer<typeof DecisionLogSchema>

export const HealthReportSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  kvOk: z.boolean(),
  agentsOk: z.boolean(),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.unknown()).optional(),
})
export type HealthReport = z.infer<typeof HealthReportSchema>

export const WavProgressSchema = z.object({
  processed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  chunkIndex: z.number().int().nonnegative(),
  eta: z.number().nonnegative(),
  speed: z.number().nonnegative(),
  status: z.enum(["idle", "running", "paused", "complete", "error"]),
  updatedAt: z.string().datetime(),
})
export type WavProgress = z.infer<typeof WavProgressSchema>

export const DynamicModuleSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  description: z.string().max(500),
  createdAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
})
export type DynamicModule = z.infer<typeof DynamicModuleSchema>
