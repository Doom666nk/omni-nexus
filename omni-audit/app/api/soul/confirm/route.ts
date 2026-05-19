import { NextRequest, NextResponse } from "next/server"
import OmniDirector from "@/agents/omni-soul/director"
import { kv } from "@/lib/kv"

const director = new OmniDirector()

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { planId?: unknown; approve?: unknown }
    const planId = typeof body.planId === "string" ? body.planId : ""
    const approve = body.approve === true

    if (!planId) {
      return NextResponse.json({ error: "planId manquant" }, { status: 400 })
    }

    if (!approve) {
      // Rejet — supprime le plan
      await kv.del(`soul:pending-plan:${planId}`)
      return NextResponse.json({ ok: true, status: "rejected", planId })
    }

    const result = await director.executePlan(planId)
    return NextResponse.json({ ok: true, status: "executed", result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    )
  }
}
