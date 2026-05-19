import { NextRequest, NextResponse } from "next/server"
import OmniDirector from "@/agents/omni-soul/director"
import { kv } from "@/lib/kv"

const director = new OmniDirector()

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { command?: unknown }
    const command = typeof body.command === "string" ? body.command.trim() : ""
    if (!command) {
      return NextResponse.json({ error: "Commande vide" }, { status: 400 })
    }
    const plan = await director.interpretCommand(command)
    return NextResponse.json({ ok: true, planId: plan.planId, plan })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl

  // ?confirm=<planId>
  const planId = searchParams.get("confirm")
  if (planId) {
    try {
      const result = await director.executePlan(planId)
      const entry = JSON.stringify({
        ts: result.completedAt,
        planId,
        results: result.stepResults,
        errors: result.errors,
      })
      await kv.lpush("soul:log", entry)
      await kv.ltrim("soul:log", 0, 49)
      return NextResponse.json({ ok: true, result })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur exécution" },
        { status: 500 }
      )
    }
  }

  // ?status=true
  if (searchParams.get("status") === "true") {
    const agents = await director.getAgentStatus()
    return NextResponse.json({ ok: true, agents })
  }

  // ?log=true
  if (searchParams.get("log") === "true") {
    const logs = await kv.lrange("soul:log", 0, 49)
    return NextResponse.json({ ok: true, logs })
  }

  return NextResponse.json(
    { error: "Paramètre manquant: confirm, status, ou log" },
    { status: 400 }
  )
}
