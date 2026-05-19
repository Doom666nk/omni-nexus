import { z } from "zod"

export const AgentIdSchema = z.enum(["architect", "engineer", "qa", "omni-soul"])
export type AgentId = z.infer<typeof AgentIdSchema>

export const CurrencySchema = z.enum(["USD", "EUR", "BTC", "CAD"])
export type Currency = z.infer<typeof CurrencySchema>

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  agentId: AgentIdSchema,
  amount: z.number().positive(),
  currency: CurrencySchema,
  timestamp: z.string().datetime(),
  description: z.string().max(200),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const TransactionInputSchema = TransactionSchema.omit({ id: true, timestamp: true }).extend({
  id: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
})
export type TransactionInput = z.infer<typeof TransactionInputSchema>

export const BalancesSchema = z.object({
  USD: z.number(),
  EUR: z.number(),
  BTC: z.number(),
  CAD: z.number(),
})
export type Balances = z.infer<typeof BalancesSchema>

export const DailyReportSchema = z.object({
  date: z.string(),
  totalByCurrency: BalancesSchema,
  totalByAgent: z.record(AgentIdSchema, z.number()),
  transactionCount: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
})
export type DailyReport = z.infer<typeof DailyReportSchema>

export const ZERO_BALANCES: Balances = { USD: 0, EUR: 0, BTC: 0, CAD: 0 }
