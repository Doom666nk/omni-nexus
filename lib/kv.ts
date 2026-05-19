/**
 * lib/kv.ts — Client KV unifié avec fallback Map pour dev local.
 * Production : @vercel/kv via KV_REST_API_URL.
 * Dev local   : Map<string,string> en mémoire.
 */

import { createClient } from "@vercel/kv"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetOptions {
  ex?: number  // TTL en secondes
  px?: number  // TTL en millisecondes
}

interface KVClient {
  get<T = string>(key: string): Promise<T | null>
  set(key: string, value: unknown, opts?: SetOptions): Promise<void>
  del(key: string): Promise<void>
  keys(pattern: string): Promise<string[]>
  lpush(key: string, ...values: unknown[]): Promise<number>
  lrange<T = string>(key: string, start: number, stop: number): Promise<T[]>
  ltrim(key: string, start: number, stop: number): Promise<void>
  ping(): Promise<string>
}

// ─── Fallback Map (dev local) ─────────────────────────────────────────────────

const _store = new Map<string, string>()
const _expiry = new Map<string, number>()
const _lists = new Map<string, string[]>()

function _isExpired(key: string): boolean {
  const exp = _expiry.get(key)
  return exp !== undefined && Date.now() > exp
}

const fallbackKV: KVClient = {
  async get<T = string>(key: string): Promise<T | null> {
    if (_isExpired(key)) { _store.delete(key); _expiry.delete(key); return null }
    const val = _store.get(key)
    if (val === undefined) return null
    try { return JSON.parse(val) as T } catch { return val as unknown as T }
  },

  async set(key: string, value: unknown, opts?: SetOptions): Promise<void> {
    _store.set(key, JSON.stringify(value))
    if (opts?.ex) _expiry.set(key, Date.now() + opts.ex * 1000)
    else if (opts?.px) _expiry.set(key, Date.now() + opts.px)
  },

  async del(key: string): Promise<void> {
    _store.delete(key); _expiry.delete(key); _lists.delete(key)
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
    return [..._store.keys()].filter((k) => regex.test(k))
  },

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    const list = _lists.get(key) ?? []
    const serialised = values.map((v) => JSON.stringify(v))
    list.unshift(...serialised)
    _lists.set(key, list)
    return list.length
  },

  async lrange<T = string>(key: string, start: number, stop: number): Promise<T[]> {
    const list = _lists.get(key) ?? []
    const end = stop === -1 ? list.length : stop + 1
    return list.slice(start, end).map((v) => {
      try { return JSON.parse(v) as T } catch { return v as unknown as T }
    })
  },

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const list = _lists.get(key) ?? []
    const end = stop === -1 ? list.length : stop + 1
    _lists.set(key, list.slice(start, end))
  },

  async ping(): Promise<string> { return "PONG" },
}

// ─── Sélection du client ──────────────────────────────────────────────────────

function makeClient(): KVClient {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (url && token) {
    const client = createClient({ url, token })
    // Wrap pour correspondre à l'interface
    return {
      get: (key) => client.get(key),
      set: async (key, value, opts) => { await client.set(key, value as string, opts as Record<string, unknown>) },
      del: async (key) => { await client.del(key) },
      keys: (pattern) => client.keys(pattern),
      lpush: (key, ...values) => client.lpush(key, ...values as string[]),
      lrange: (key, start, stop) => client.lrange(key, start, stop),
      ltrim: async (key, start, stop) => { await client.ltrim(key, start, stop) },
      ping: async () => { await client.ping(); return "PONG" },
    }
  }
  return fallbackKV
}

export const kv: KVClient = makeClient()

export async function kvOk(): Promise<boolean> {
  try {
    const result = await kv.ping()
    return result === "PONG"
  } catch {
    return false
  }
}
