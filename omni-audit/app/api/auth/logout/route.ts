import { NextResponse } from "next/server"

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete("omni-token")
  return response
}
