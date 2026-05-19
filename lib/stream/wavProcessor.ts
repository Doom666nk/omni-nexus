import { kv, KV_KEYS } from "@/lib/kv"
import type { WavProgress } from "@/lib/types/agents"

const CHUNK_SIZE = 50
const MEMORY_THRESHOLD_MB = 200

interface MemoryInfo {
  jsHeapSizeLimit?: number
  totalJSHeapSize?: number
  usedJSHeapSize?: number
}

function freeMemoryMB(): number | null {
  const perf = (globalThis as unknown as { performance?: { memory?: MemoryInfo } }).performance
  const mem = perf?.memory
  if (!mem || !mem.jsHeapSizeLimit || !mem.usedJSHeapSize) return null
  return (mem.jsHeapSizeLimit - mem.usedJSHeapSize) / 1_048_576
}

export interface WavFile {
  id: string
  path: string
  bytes: number
}

export type WavHandler = (file: WavFile) => Promise<void>

async function readProgress(): Promise<WavProgress> {
  const existing = (await kv.get<WavProgress>(KV_KEYS.wavProgress)) as WavProgress | null
  if (existing) return existing
  return {
    processed: 0,
    total: 0,
    chunkIndex: 0,
    eta: 0,
    speed: 0,
    status: "idle",
    updatedAt: new Date().toISOString(),
  }
}

async function writeProgress(progress: WavProgress): Promise<void> {
  await kv.set(KV_KEYS.wavProgress, { ...progress, updatedAt: new Date().toISOString() })
}

export async function processWavBatch(files: WavFile[], handle: WavHandler): Promise<WavProgress> {
  let progress = await readProgress()
  progress.total = Math.max(progress.total, files.length)
  progress.status = "running"
  await writeProgress(progress)

  const startIndex = progress.chunkIndex * CHUNK_SIZE

  for (let i = startIndex; i < files.length; i += CHUNK_SIZE) {
    const free = freeMemoryMB()
    if (free !== null && free < MEMORY_THRESHOLD_MB) {
      progress.status = "paused"
      await writeProgress(progress)
      return progress
    }

    const chunk = files.slice(i, i + CHUNK_SIZE)
    const t0 = Date.now()
    for (const file of chunk) {
      await handle(file)
      progress.processed += 1
    }
    const dt = (Date.now() - t0) / 1000
    progress.speed = dt > 0 ? chunk.length / dt : 0
    const remaining = Math.max(0, progress.total - progress.processed)
    progress.eta = progress.speed > 0 ? remaining / progress.speed : 0
    progress.chunkIndex = Math.floor((i + CHUNK_SIZE) / CHUNK_SIZE)
    await writeProgress(progress)
  }

  progress.status = "complete"
  await writeProgress(progress)
  return progress
}
