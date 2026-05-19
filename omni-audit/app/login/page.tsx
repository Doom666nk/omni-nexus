"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push("/")
      } else {
        setError("Accès refusé")
      }
    } catch {
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050a05",
        color: "#deff9a",
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
        }}
      >
        {/* Logo losange */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 512 512"
          aria-label="OMNI-NEXUS logo"
          role="img"
        >
          <rect width="512" height="512" fill="#050a05" />
          <polygon
            points="256,40 472,256 256,472 40,256"
            fill="#0d1a0d"
            stroke="#deff9a"
            strokeWidth="16"
          />
          {/* Lignes accent aux 4 pointes */}
          <line x1="256" y1="40" x2="256" y2="72" stroke="#deff9a" strokeWidth="4" />
          <line x1="472" y1="256" x2="440" y2="256" stroke="#deff9a" strokeWidth="4" />
          <line x1="256" y1="472" x2="256" y2="440" stroke="#deff9a" strokeWidth="4" />
          <line x1="40" y1="256" x2="72" y2="256" stroke="#deff9a" strokeWidth="4" />
          <text
            x="256"
            y="290"
            textAnchor="middle"
            fill="#deff9a"
            fontSize="120"
            fontWeight="700"
            fontFamily="monospace"
            letterSpacing="8"
          >
            ON
          </text>
        </svg>

        {/* Titres */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "4px",
              margin: 0,
              color: "#deff9a",
            }}
          >
            OMNI-NEXUS
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "#4a5a4a",
              letterSpacing: "3px",
              marginTop: "6px",
            }}
          >
            SYSTÈME SOUVERAIN
          </p>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <label
            htmlFor="password"
            style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5a4a" }}
          >
            MOT DE PASSE
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              background: "#0d1a0d",
              border: "1px solid #1a2e1a",
              color: "#deff9a",
              fontFamily: "monospace",
              fontSize: "14px",
              padding: "12px 16px",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p
              role="alert"
              style={{ fontSize: "12px", color: "#ff6b6b", margin: 0 }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              background: loading || !password ? "#2a3a1a" : "#deff9a",
              color: "#050a05",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "2px",
              padding: "14px",
              border: "none",
              cursor: loading || !password ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background 0.15s",
            }}
          >
            {loading ? "VÉRIFICATION..." : "ACCÉDER AU NEXUS"}
          </button>
        </form>
      </div>
    </div>
  )
}
