/**
 * lib/engine/scheduler.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Planificateur de tâches OMNI-SOUL.
 * Gère les jobs différés, les retries cron et la file d'attente KV.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { kv } from "@/lib/kv"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type JobPriority = "low" | "normal" | "high" | "critical"
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "retry"

export interface ScheduledJob {
  id: string
  name: string
  type: "once" | "cron" | "delayed"
  cronExpression?: string
  runAt?: string
  priority: JobPriority
  payload: Record<string, unknown>
  status: JobStatus
  attempts: number
  maxAttempts: number
  lastError?: string
  createdAt: string
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  nextRunAt?: string
}

export interface JobResult {
  jobId: string
  status: JobStatus
  output?: unknown
  error?: string
  duration_ms: number
  ts: string
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export class OmniScheduler {
  private readonly QUEUE_KEY = "scheduler:queue"
  private readonly JOB_PREFIX = "scheduler:job"
  private readonly HISTORY_KEY = "scheduler:history"

  async enqueue(
    name: string,
    payload: Record<string, unknown>,
    opts: {
      type?: ScheduledJob["type"]
      priority?: JobPriority
      runAt?: Date
      cronExpression?: string
      maxAttempts?: number
    } = {}
  ): Promise<ScheduledJob> {
    const id = crypto.randomUUID()
    const now = new Date()
    const job: ScheduledJob = {
      id, name,
      type: opts.type ?? "once",
      cronExpression: opts.cronExpression,
      runAt: opts.runAt?.toISOString(),
      priority: opts.priority ?? "normal",
      payload,
      status: "queued",
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 3,
      createdAt: now.toISOString(),
      scheduledAt: (opts.runAt ?? now).toISOString(),
      nextRunAt: opts.cronExpression ? this._nextCronRun(opts.cronExpression) : undefined,
    }

    await kv.set(`${this.JOB_PREFIX}:${id}`, JSON.stringify(job), { ex: 86400 * 7 })

    // Insérer dans la queue par priorité
    const score = this._priorityScore(job.priority)
    await kv.lpush(`${this.QUEUE_KEY}:${job.priority}`, id)
    void score // used conceptually for ordering

    return job
  }

  async dequeue(priority: JobPriority = "normal"): Promise<ScheduledJob | null> {
    const ids = await kv.lrange<string>(`${this.QUEUE_KEY}:${priority}`, 0, 0)
    if (!ids.length) return null
    const id = ids[0]
    const raw = await kv.get<string>(`${this.JOB_PREFIX}:${id}`)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  async getJob(id: string): Promise<ScheduledJob | null> {
    const raw = await kv.get<string>(`${this.JOB_PREFIX}:${id}`)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    extra: Partial<ScheduledJob> = {}
  ): Promise<void> {
    const job = await this.getJob(id)
    if (!job) return
    Object.assign(job, { status, ...extra })
    if (status === "completed" || status === "failed" || status === "cancelled") {
      job.completedAt = new Date().toISOString()
      await kv.lpush(this.HISTORY_KEY, JSON.stringify(job))
      await kv.ltrim(this.HISTORY_KEY, 0, 499)
    }
    await kv.set(`${this.JOB_PREFIX}:${id}`, JSON.stringify(job), { ex: 86400 * 7 })
  }

  async getHistory(limit = 20): Promise<ScheduledJob[]> {
    const raw = await kv.lrange<string>(this.HISTORY_KEY, 0, limit - 1)
    return raw.flatMap((r) => { try { return [JSON.parse(r) as ScheduledJob] } catch { return [] } })
  }

  async cancelJob(id: string): Promise<boolean> {
    const job = await this.getJob(id)
    if (!job || job.status === "completed") return false
    await this.updateJobStatus(id, "cancelled")
    return true
  }

  async getQueueDepth(): Promise<Record<JobPriority, number>> {
    const priorities: JobPriority[] = ["critical", "high", "normal", "low"]
    const depths = await Promise.all(
      priorities.map(async (p) => {
        const items = await kv.lrange<string>(`${this.QUEUE_KEY}:${p}`, 0, -1)
        return items.length
      })
    )
    return Object.fromEntries(priorities.map((p, i) => [p, depths[i]])) as Record<JobPriority, number>
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _priorityScore(priority: JobPriority): number {
    return { critical: 4, high: 3, normal: 2, low: 1 }[priority]
  }

  private _nextCronRun(expr: string): string {
    // Simplified: returns +5min for every expression
    // In production: use a cron parser library
    const next = new Date(Date.now() + 5 * 60 * 1000)
    void expr
    return next.toISOString()
  }
}
