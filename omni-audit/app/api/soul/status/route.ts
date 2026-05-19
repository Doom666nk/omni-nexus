import { NextResponse } from "next/server"
import OmniDirector from "@/agents/omni-soul/director"
import { kv } from "@/lib/kv"

const director = new OmniDirector()

export async function GET(): Promise<NextResponse> {
  const agentMap = await director.getAgentStatus()

  // Format for CommandPanel: array with id matching initialAgents ids
  const agentIdMap: Record<string, string> = {
    "Director":       "director",
    "WAV-Supervisor": "wav-supervisor",
    "Vault-Auditor":  "vault-auditor",
    "Self-Repair":    "self-repair",
  }

  const agents = Object.entries(agentMap).map(([name, state]) => ({
    id: agentIdMap[name] ?? name.toLowerCase(),
    name,
    state,
  }))

  const rawLogs = await kv.lrange<string>("soul:log", 0, 49)
  const logs = rawLogs.flatMap((raw) => {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return [{
        ts:    typeof parsed.ts    === "string" ? parsed.ts    : new Date().toISOString(),
        agent: typeof parsed.agent === "string" ? parsed.agent : "Director",
        level: "info" as const,
        msg:   typeof parsed.command === "string"
          ? `plan ${parsed.planId ?? "?"} — ${parsed.command}`
          : raw,
      }]
    } catch {
      return [{ ts: new Date().toISOString(), agent: "System", level: "info" as const, msg: raw }]
    }
  })

  return NextResponse.json({ ok: true, agents, logs })
}
