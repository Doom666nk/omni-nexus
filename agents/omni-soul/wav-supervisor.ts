/**
 * agents/omni-soul/wav-supervisor.ts — Traitement par chunks des fichiers WAV.
 */

import { EventEmitter } from "events"
import { kv } from "@/lib/kv"

interface ChunkResult {
  chunk: number
  files: string[]
  progress: number
}

export class WavSupervisor extends EventEmitter {
  private static readonly CHUNK_SIZE = 50

  async *processChunks(
    files: string[],
    jobId: string
  ): AsyncGenerator<ChunkResult> {
    const total = Math.ceil(files.length / WavSupervisor.CHUNK_SIZE)

    for (let i = 0; i < files.length; i += WavSupervisor.CHUNK_SIZE) {
      const chunk = files.slice(i, i + WavSupervisor.CHUNK_SIZE)
      const chunkIndex = Math.floor(i / WavSupervisor.CHUNK_SIZE)
      const progress = Math.round(((chunkIndex + 1) / total) * 100)

      this.emit("progress", { jobId, chunkIndex, total, progress })
      await this.storeProgress(jobId, progress)

      yield { chunk: chunkIndex, files: chunk, progress }
    }
  }

  async storeProgress(jobId: string, pct: number): Promise<void> {
    await kv.set(`wav:progress:${jobId}`, pct, { ex: 3600 })
  }

  async getProgress(jobId: string): Promise<number> {
    const val = await kv.get<number>(`wav:progress:${jobId}`)
    return val ?? 0
  }
}
