import { jwtVerify, SignJWT } from "jose"
import type { NextRequest } from "next/server"

const SECRET = process.env.OMNI_SECRET_KEY ?? "dev-insecure-secret-change-me-please-32chars"
const secretBytes = new TextEncoder().encode(SECRET)

export const COOKIE_NAME = "omni-token"
export const TOKEN_TTL = "24h"

export interface OmniJwtPayload {
  sub: string
  iat?: number
  exp?: number
}

export async function signToken(sub = "operator"): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .setSubject(sub)
    .sign(secretBytes)
}

export async function verifyToken(token: string): Promise<OmniJwtPayload | null> {
  try {
    const { payload } = await jwtVerify<OmniJwtPayload>(token, secretBytes)
    return payload
  } catch {
    return null
  }
}

export async function authenticate(req: NextRequest): Promise<OmniJwtPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
