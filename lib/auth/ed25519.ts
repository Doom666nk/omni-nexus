/**
 * lib/auth/ed25519.ts — JWT HS256 + bcrypt helpers.
 * Variables requises : OMNI_SECRET_KEY
 */

import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"

export interface TokenPayload {
  sub: string
  role: "admin"
  iat?: number
  exp?: number
}

function getSecret(): Uint8Array {
  const key = process.env.OMNI_SECRET_KEY
  if (!key) throw new Error("ENV_MISSING: OMNI_SECRET_KEY non définie")
  return new TextEncoder().encode(key)
}

/**
 * Signe un JWT HS256 avec expiration 7 jours.
 */
export async function signToken(payload: { sub: string; role: "admin" }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

/**
 * Vérifie un JWT. Retourne le payload ou null si invalide / expiré.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

/**
 * Hache un mot de passe avec bcrypt (12 rounds).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

/**
 * Compare un mot de passe en clair avec son hash bcrypt.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
