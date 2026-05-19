import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/offline.html",
]

const PUBLIC_PREFIXES = ["/_next/", "/icons/", "/favicon"]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const token = req.cookies.get("omni-token")?.value

  if (token) {
    const secretKey = process.env.OMNI_SECRET_KEY
    if (secretKey) {
      try {
        await jwtVerify(token, new TextEncoder().encode(secretKey))
        return NextResponse.next()
      } catch {
        // Token invalide ou expiré — chute vers redirect
      }
    }
  }

  // Redirect vers /login et supprime le cookie corrompu
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = "/login"
  const response = NextResponse.redirect(loginUrl)
  response.cookies.delete("omni-token")
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
