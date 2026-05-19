"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Brain, ShieldCheck, Wrench, Waves, Send, CheckCircle2, XCircle } from "lucide-react"

type AgentStatus = {
  id: string
  name: string
  icon: React.ReactNode
  state: "idle" | "running" | "ok" | "error"
  lastRun?: string
  detail?: string
}

type Plan = {
  id: string
  intent: string
  steps: string[]
  risk: "low" | "medium" | "high"
  reversible: boolean
}

type LogLine = {
  ts: string
  agent: string
  level: "info" | "warn" | "error"
  msg: string
}

const initialAgents: AgentStatus[] = [
  { id: "director", name: "Director", icon: <Brain className="h-4 w-4" />, state: "idle" },
  { id: "wav-supervisor", name: "WAV Supervisor", icon: <Waves className="h-4 w-4" />, state: "idle" },
  { id: "vault-auditor", name: "Vault Auditor", icon: <ShieldCheck className="h-4 w-4" />, state: "idle" },
  { id: "self-repair", name: "Self-Repair", icon: <Wrench className="h-4 w-4" />, state: "idle" },
]

export function CommandPanel() {
  const [agents, setAgents] = useState<AgentStatus[]>(initialAgents)
  const [intent, setIntent] = useState("")
  const [plan, setPlan] = useState<Plan | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const res = await fetch("/api/soul/status", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!alive) return
        if (Array.isArray(data.agents)) {
          setAgents((prev) =>
            prev.map((a) => {
              const upd = data.agents.find((x: Record<string, unknown>) => x.id === a.id)
              return upd ? { ...a, state: upd.state, lastRun: upd.lastRun, detail: upd.detail } : a
            }),
          )
        }
        if (Array.isArray(data.logs)) setLogs(data.logs.slice(-50))
      } catch {}
    }
    tick()
    const i = setInterval(tick, 4000)
    return () => {
      alive = false
      clearInterval(i)
    }
  }, [])

  async function interpret() {
    if (!intent.trim() || busy) return
    setBusy(true)
    setPlan(null)
    try {
      const res = await fetch("/api/soul", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent }),
      })
      const data = await res.json()
      if (data.plan) setPlan(data.plan)
    } finally {
      setBusy(false)
    }
  }

  async function confirm(approve: boolean) {
    if (!plan || busy) return
    setBusy(true)
    try {
      await fetch("/api/soul/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: plan.id, approve }),
      })
      setPlan(null)
      setIntent("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">OMNI-NEXUS PRO</h1>
              <p className="text-xs text-muted-foreground">Souverain. Vérifiable. Réversible.</p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            COMMAND
          </Badge>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-3">
        <section className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intent</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="Décris l'intention en langage naturel. Le Director va planifier."
                className="min-h-[120px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Pipeline: interpret <span className="mx-1">{"->"}</span> plan{" "}
                  <span className="mx-1">{"->"}</span> confirm <span className="mx-1">{"->"}</span> execute
                </p>
                <Button onClick={interpret} disabled={busy || !intent.trim()} size="sm">
                  <Send className="mr-2 h-4 w-4" />
                  Interpret
                </Button>
              </div>
            </CardContent>
          </Card>

          {plan && (
            <Card className="border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Plan proposé</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={plan.risk === "high" ? "destructive" : "secondary"} className="text-xs">
                    risk: {plan.risk}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {plan.reversible ? "réversible" : "irréversible"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">{plan.intent}</p>
                <ol className="flex flex-col gap-2 text-sm">
                  {plan.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                      <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => confirm(false)} disabled={busy}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeter
                  </Button>
                  <Button size="sm" onClick={() => confirm(true)} disabled={busy}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 rounded-md border border-border/60 bg-muted/20 p-3">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun événement.</p>
                ) : (
                  <ul className="flex flex-col gap-1 font-mono text-xs">
                    {logs.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">{l.ts}</span>
                        <span className="text-primary">{l.agent}</span>
                        <span
                          className={
                            l.level === "error"
                              ? "text-destructive"
                              : l.level === "warn"
                                ? "text-amber-500"
                                : "text-foreground"
                          }
                        >
                          {l.msg}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agents</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {agents.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{a.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{a.name}</span>
                      {a.detail && <span className="text-xs text-muted-foreground">{a.detail}</span>}
                    </div>
                  </div>
                  <StatusDot state={a.state} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cron</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>daily-report</span>
                <span className="font-mono">0 7 * * *</span>
              </div>
              <div className="flex justify-between">
                <span>health-check</span>
                <span className="font-mono">*/15 * * * *</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}

function StatusDot({ state }: { state: AgentStatus["state"] }) {
  const cls =
    state === "ok"
      ? "bg-emerald-500"
      : state === "running"
        ? "bg-primary animate-pulse"
        : state === "error"
          ? "bg-destructive"
          : "bg-muted-foreground/40"
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
      <span className="font-mono text-xs text-muted-foreground">{state}</span>
    </span>
  )
}
