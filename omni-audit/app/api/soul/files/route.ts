/**
 * app/api/soul/files/route.ts — POST/GET /api/soul/files
 * Gère les jobs WAV : création, progression, manifeste.
 */

import { NextRequest, NextResponse } from "next/server"
import { getWav } from "@/lib/engine/pipeline"
import { checkRateLimit, RATE_LIMITS, rateLimitHeaders, rateLimitResponse } from "@/lib/engine/ratelimit"
import { logAudit } from "@/lib/engine/audit"
import { apiOk, apiError, type PaginationParams } from "@/lib/types"

export const runtime = "edge"

// POST /api/soul/files — créer un job WAV
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const start = Date.now()

  const rl = await checkRateLimit(ip, RATE_LIMITS.api_soul)
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: { files?: Array<{ name: string; source: string; size?: number }>; chunkSize?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(apiError("Corps JSON invalide", "PARSE_ERROR"), { status: 400 })
  }

  const { files = [], chunkSize = 50 } = body
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json(apiError("Liste de fichiers vide ou invalide", "NO_FILES"), { status: 400 })
  }
  if (files.length > 10000) {
    return NextResponse.json(apiError("Maximum 10 000 fichiers par job", "TOO_MANY_FILES"), { status: 400 })
  }

  const wav = getWav()
  const job = await wav.createJob(files, chunkSize)

  await logAudit("wav:job:create", {
    ip, success: true, duration_ms: Date.now() - start,
    details: { jobId: job.jobId, totalFiles: files.length, chunkSize },
  })

  return NextResponse.json(apiOk(job), {
    status: 201,
    headers: rateLimitHeaders(rl),
  })
}

// GET /api/soul/files?jobId=xxx&type=job|manifest|history
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const rl = await checkRateLimit(ip, RATE_LIMITS.api_health)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? "job"
  const jobId = searchParams.get("jobId")
  const pagination: PaginationParams = {
    limit: Number(searchParams.get("limit") ?? "20"),
    offset: Number(searchParams.get("offset") ?? "0"),
  }

  const wav = getWav()

  if (type === "history") {
    const history = await wav.getJobHistory(pagination.limit)
    return NextResponse.json(apiOk({ history }), { headers: rateLimitHeaders(rl) })
  }

  if (!jobId) {
    return NextResponse.json(apiError("jobId requis", "MISSING_JOB_ID"), { status: 400 })
  }

  if (type === "manifest" || type === "manifeste") {
    const manifeste = await wav.getManifeste(jobId)
    return NextResponse.json(apiOk({ jobId, manifeste, count: manifeste.length }), { headers: rateLimitHeaders(rl) })
  }

  const job = await wav.getJob(jobId)
  if (!job) {
    return NextResponse.json(apiError("Job introuvable", "JOB_NOT_FOUND"), { status: 404 })
  }

  return NextResponse.json(apiOk(job), { headers: rateLimitHeaders(rl) })
}

// DELETE /api/soul/files?jobId=xxx — annuler un job
export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const rl = await checkRateLimit(ip, RATE_LIMITS.api_soul)
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json(apiError("jobId requis", "MISSING_JOB_ID"), { status: 400 })
  }

  const cancelled = await getWav().cancelJob(jobId)
  if (!cancelled) {
    return NextResponse.json(apiError("Job introuvable ou déjà terminé", "CANCEL_FAILED"), { status: 404 })
  }

  await logAudit("wav:job:complete", { ip, success: true, details: { jobId, action: "cancelled" } })
  return NextResponse.json(apiOk({ jobId, cancelled: true }), { headers: rateLimitHeaders(rl) })
}
