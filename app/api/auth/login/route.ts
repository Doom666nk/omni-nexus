import { NextRequest, NextResponse } from "next/server"
import { signToken, verifyPassword } from "@/lib/auth/ed25519"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { password?: unknown }
    const password = typeof body.password === "string" ? body.password : ""

    const hash = process.env.OMNI_PASSWORD_HASH
    if (!hash) {
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 })
    }

    const valid = await verifyPassword(password, hash)
    if (!valid) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 401 })
    }

    const token = await signToken({ sub: "omni-admin", role: "admin" })

    const response = NextResponse.json({ ok: true })
    response.cookies.set("omni-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 604800, // 7 jours
      path: "/",
    })
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
