/**
 * lib/types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types partagés OMNI-SOUL — API, auth, config, réponses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface OmniUser {
  id: string
  email: string
  role: "admin" | "operator" | "viewer"
  permissions: Permission[]
  createdAt: string
  lastLoginAt?: string
}

export type Permission =
  | "soul:interpret"
  | "soul:confirm"
  | "soul:execute"
  | "soul:cancel"
  | "vault:read"
  | "vault:write"
  | "vault:snapshot"
  | "wav:create"
  | "wav:cancel"
  | "admin:users"
  | "admin:config"
  | "health:read"

export interface AuthSession {
  userId: string
  email: string
  role: OmniUser["role"]
  permissions: Permission[]
  iat: number
  exp: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  user?: Pick<OmniUser, "id" | "email" | "role">
  error?: string
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  code?: string
  ts: string
}

export function apiOk<T>(data: T): ApiResponse<T> {
  return { ok: true, data, ts: new Date().toISOString() }
}

export function apiError(error: string, code?: string): ApiResponse<never> {
  return { ok: false, error, code, ts: new Date().toISOString() }
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface OmniConfig {
  version: string
  environment: "development" | "preview" | "production"
  features: {
    wavProcessing: boolean
    vaultTransactions: boolean
    selfRepair: boolean
    sseStreaming: boolean
    cronJobs: boolean
    externalSync: boolean
  }
  limits: {
    maxPlanSteps: number
    maxWavFileSize_mb: number
    maxWavDuration_s: number
    maxConcurrentJobs: number
    planTtl_s: number
    logRetention_entries: number
  }
  cron: {
    dailyReportSchedule: string
    healthCheckSchedule: string
  }
}

export const DEFAULT_CONFIG: OmniConfig = {
  version: "1.0.0",
  environment: (process.env.NODE_ENV as OmniConfig["environment"]) ?? "development",
  features: {
    wavProcessing: true,
    vaultTransactions: true,
    selfRepair: true,
    sseStreaming: true,
    cronJobs: true,
    externalSync: false,
  },
  limits: {
    maxPlanSteps: 20,
    maxWavFileSize_mb: 500,
    maxWavDuration_s: 14400,
    maxConcurrentJobs: 5,
    planTtl_s: 600,
    logRetention_entries: 500,
  },
  cron: {
    dailyReportSchedule: "0 2 * * *",
    healthCheckSchedule: "*/5 * * * *",
  },
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface OmniEvent<T = unknown> {
  id: string
  topic: string
  payload: T
  source: string
  ts: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number
  offset?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function paginate<T>(
  items: T[],
  { limit = 20, offset = 0 }: PaginationParams
): PaginatedResponse<T> {
  const sliced = items.slice(offset, offset + limit)
  return {
    items: sliced,
    total: items.length,
    limit,
    offset,
    hasMore: offset + limit < items.length,
  }
}
