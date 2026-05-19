import { NextResponse } from "next/server"
import { kvOk } from "@/lib/kv"

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    kvOk: await kvOk(),
    ts: new Date().toISOString(),
    version: "2.0.0",
    system: "OMNI-NEXUS PRO",
  })
}
