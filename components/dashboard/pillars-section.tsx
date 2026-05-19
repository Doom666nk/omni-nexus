"use client"

import { useState } from "react"
import {
  TerminalSquare,
  Sparkles,
  Cloud,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Cpu,
  Database,
  Zap,
  Globe,
  Server,
  ArrowRight,
  Code2,
  BarChart3,
  Download,
  FileCode2,
  Copy,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────
   TUI PILLAR — live terminal animation
───────────────────────────────────────── */
function TUIDemo() {
  const lines = [
    { text: "OMNI-NEXUS v6 · Threat Intelligence", color: "text-primary" },
    { text: "─────────────────────────────────────", color: "text-border" },
    { text: "  AGENT     STATUS    SCORE    DELTA", color: "text-muted-foreground" },
    { text: "  IOC-Scan  ██████░░  87.4%   +2.1%", color: "text-primary" },
    { text: "  Net-Watch ████████  94.2%   +0.8%", color: "text-primary" },
    { text: "  Mal-Hunt  ████░░░░  52.0%   -1.3%", color: "text-[#f5a623]" },
    { text: "  C2-Block  ██████░░  78.9%   +4.2%", color: "text-primary" },
    { text: "─────────────────────────────────────", color: "text-border" },
    { text: "  138,291 datasets loaded in memory", color: "text-muted-foreground" },
    { text: "  Latency: 4ms  |  Uptime: 99.97%", color: "text-muted-foreground" },
    { text: "  [■] Streaming live events..._", color: "text-primary" },
  ]

  return (
    <div className="rounded-md bg-[#020b09] border border-primary/20 p-4 font-mono text-[11px] leading-relaxed overflow-hidden">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#f5a623]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="ml-2 text-[9px] text-muted-foreground tracking-widest uppercase">omni-nexus — zsh</span>
      </div>
      {lines.map((l, i) => (
        <p key={i} className={cn("whitespace-pre leading-5", l.color)}>
          {l.text}
        </p>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   RICH PILLAR — formatted log output
───────────────────────────────────────── */
function RichDemo() {
  const entries = [
    { level: "INFO", label: "Agent boot", detail: "138k datasets indexed", color: "text-primary", bar: 100 },
    { level: "WARN", label: "Anomaly score", detail: "Node 7 threshold exceeded", color: "text-[#f5a623]", bar: 78 },
    { level: "CRIT", label: "C2 Callback", detail: "192.168.1.44 → BLOCKED", color: "text-destructive", bar: 45 },
    { level: "OK  ", label: "Sync complete", detail: "Cloud ↔ Edge synced", color: "text-primary", bar: 100 },
  ]

  return (
    <div className="rounded-md bg-[#020b09] border border-primary/20 p-4 font-mono text-[11px] leading-relaxed space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#f5a623]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="ml-2 text-[9px] text-muted-foreground tracking-widest uppercase">rich — agent.log</span>
      </div>
      {/* Table header */}
      <div className="grid grid-cols-[3rem_1fr_1fr] gap-2 border-b border-border/40 pb-1.5 text-[9px] text-muted-foreground uppercase tracking-wider">
        <span>Level</span>
        <span>Event</span>
        <span>Progress</span>
      </div>
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-[3rem_1fr_1fr] gap-2 items-center">
          <span className={cn("font-bold text-[10px]", e.color)}>{e.level}</span>
          <div>
            <p className={cn("font-semibold text-[10px]", e.color)}>{e.label}</p>
            <p className="text-[9px] text-muted-foreground">{e.detail}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${e.bar}%`,
                  backgroundColor: e.color.includes("destructive")
                    ? "#ff3355"
                    : e.color.includes("f5a623")
                    ? "#f5a623"
                    : "#00d4a8",
                }}
              />
            </div>
            <span className={cn("text-[9px] w-6 text-right", e.color)}>{e.bar}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   CLOUD-EDGE PILLAR — architecture diagram
───────────────────────────────────────── */
function CloudEdgeDemo() {
  const nodes = [
    { label: "Mobile", sublabel: "Termux / 4G", icon: Smartphone, side: "left", color: "#00d4a8" },
    { label: "SSH Tunnel", sublabel: "Encrypted", icon: Zap, side: "center", color: "#f5a623" },
    { label: "Vercel Edge", sublabel: "Global CDN", icon: Globe, side: "center2", color: "#3b82f6" },
    { label: "AWS S3", sublabel: "138k Objects", icon: Database, side: "right", color: "#00d4a8" },
    { label: "Lambda", sublabel: "Serverless", icon: Server, side: "right2", color: "#a855f7" },
  ]

  return (
    <div className="rounded-md bg-[#020b09] border border-primary/20 p-4 flex flex-col gap-3">
      {/* Diagram */}
      <div className="flex items-center justify-between gap-1 px-1">
        {/* Mobile */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/30">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[9px] font-mono text-primary font-semibold">Mobile</p>
          <p className="text-[8px] text-muted-foreground">Termux</p>
        </div>

        {/* Arrow + SSH label */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="flex items-center w-full">
            <div className="flex-1 h-px border-t border-dashed border-[#f5a623]/50" />
            <div className="flex flex-col items-center mx-1">
              <Zap className="w-3 h-3 text-[#f5a623]" />
              <p className="text-[8px] text-[#f5a623] font-mono whitespace-nowrap">SSH</p>
            </div>
            <div className="flex-1 h-px border-t border-dashed border-[#f5a623]/50" />
          </div>
        </div>

        {/* Vercel Edge */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-[9px] font-mono text-blue-400 font-semibold">Vercel</p>
          <p className="text-[8px] text-muted-foreground">Edge</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex-1 h-px border-t border-dashed border-primary/30" />
          <ArrowRight className="w-3 h-3 text-muted-foreground mx-0.5 shrink-0" />
        </div>

        {/* AWS */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/30">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[9px] font-mono text-primary font-semibold">AWS S3</p>
          <p className="text-[8px] text-muted-foreground">138k obj</p>
        </div>

        {/* Plus Lambda */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <Server className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-[9px] font-mono text-purple-400 font-semibold">Lambda</p>
          <p className="text-[8px] text-muted-foreground">Serverless</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
        {[
          { label: "Payload size", value: "4 MB", note: "on device" },
          { label: "Storage", value: "∞", note: "cloud" },
          { label: "Latency", value: "< 8ms", note: "edge" },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 text-center">
            <p className="font-mono text-sm font-bold text-primary">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
            <p className="text-[8px] text-border font-mono">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   TERMUX PILLAR — tmux split view
───────────────────────────────────────── */
function TermuxDemo() {
  const leftPane = [
    { text: "$ tmux new-session -d -s nexus", color: "text-muted-foreground" },
    { text: "$ python3 agent.py --live", color: "text-muted-foreground" },
    { text: "", color: "" },
    { text: "[nexus] Booting OMNI core...", color: "text-primary" },
    { text: "[nexus] Loading 138,291 IOCs", color: "text-primary" },
    { text: "[nexus] ██████████ 100%", color: "text-primary" },
    { text: "[nexus] Agent ONLINE", color: "text-primary" },
    { text: "[nexus] Listening on :8080_", color: "text-[#f5a623]" },
  ]

  const rightPane = [
    { text: "$ htop", color: "text-muted-foreground" },
    { text: "", color: "" },
    { text: "  CPU  ████████░░ 78%", color: "text-[#f5a623]" },
    { text: "  MEM  ██████░░░░ 61%", color: "text-blue-400" },
    { text: "  NET  ████░░░░░░ 40%", color: "text-primary" },
    { text: "", color: "" },
    { text: "  PID  CMD", color: "text-muted-foreground" },
    { text: "  1421 python3 agent.py", color: "text-primary" },
  ]

  return (
    <div className="rounded-md bg-[#020b09] border border-primary/20 overflow-hidden font-mono text-[11px]">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/30 bg-muted/10">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#f5a623]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="ml-2 text-[9px] text-muted-foreground tracking-widest uppercase">tmux — nexus [0] 2 panes</span>
      </div>
      {/* Split panes */}
      <div className="grid grid-cols-2 divide-x divide-border/30">
        {/* Left pane */}
        <div className="p-3 space-y-0.5">
          <p className="text-[9px] text-muted-foreground border-b border-border/20 pb-1 mb-2 uppercase tracking-wider">
            pane 0: agent
          </p>
          {leftPane.map((l, i) => (
            <p key={i} className={cn("leading-5 whitespace-pre", l.color || "text-transparent")}>
              {l.text || " "}
            </p>
          ))}
        </div>
        {/* Right pane */}
        <div className="p-3 space-y-0.5">
          <p className="text-[9px] text-muted-foreground border-b border-border/20 pb-1 mb-2 uppercase tracking-wider">
            pane 1: monitor
          </p>
          {rightPane.map((l, i) => (
            <p key={i} className={cn("leading-5 whitespace-pre", l.color || "text-transparent")}>
              {l.text || " "}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   PILLAR CONFIG
───────────────────────────────────────── */
const pillars = [
  {
    id: "tui",
    number: "01",
    icon: TerminalSquare,
    label: "TUI Interface",
    sublabel: "Terminal User Interface",
    description:
      "138k datasets piloted at a glance. Textualize-style real-time dashboards running natively in a terminal — no browser required. Full control, zero overhead.",
    link: "https://www.textualize.io/",
    linkLabel: "Textualize.io",
    accentColor: "text-primary",
    borderColor: "border-primary/20",
    bgColor: "bg-primary/5",
    demo: TUIDemo,
    tags: ["Textual", "Rich", "Python", "Live Feed"],
  },
  {
    id: "rich",
    number: "02",
    icon: BarChart3,
    label: "Rich Rendering",
    sublabel: "Markdown & Structured Logs",
    description:
      "Colorized tables, progress bars, and formatted agent output. Pure-Source data becomes readable intelligence. Every event is structured, tagged, and traceable.",
    link: "https://github.com/Textualize/rich",
    linkLabel: "Rich on GitHub",
    accentColor: "text-[#f5a623]",
    borderColor: "border-[#f5a623]/20",
    bgColor: "bg-[#f5a623]/5",
    demo: RichDemo,
    tags: ["Rich", "Logging", "Tables", "Progress"],
  },
  {
    id: "cloud",
    number: "03",
    icon: Cloud,
    label: "Cloud-Edge Architecture",
    sublabel: "AWS + Vercel — Infinite Storage",
    description:
      "The device carries only 4 MB. Everything else lives in the cloud. SSH tunnel + Edge Functions + S3 = Metastase Cloud. Unlimited scale, zero weight.",
    link: "https://vercel.com/docs/functions/edge-functions",
    linkLabel: "Vercel Edge Functions",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
    demo: CloudEdgeDemo,
    tags: ["AWS S3", "Lambda", "Vercel Edge", "SSH"],
  },
  {
    id: "termux",
    number: "04",
    icon: Cpu,
    label: "Termux / Linux",
    sublabel: "Mini-cell as operational PC",
    description:
      "A phone running a full Linux environment. tmux splits the workspace. python3, git, curl — the full stack fits in a pocket. This is the true field terminal.",
    link: "https://wiki.termux.com/wiki/Termux-styles",
    linkLabel: "Termux Wiki",
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/20",
    bgColor: "bg-purple-500/5",
    demo: TermuxDemo,
    tags: ["Termux", "tmux", "Linux", "Mobile"],
  },
]

/* ─────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────── */
export function PillarsSection() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <section className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/30">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              System Proof — 4 Pillars
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Why OMNI-NEXUS is the most powerful system on the market
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono text-primary/60 border border-primary/20 rounded-md px-2 py-1 bg-primary/5">
          V6 · CLASSIFIED
        </span>
      </div>

      {/* Pillars grid */}
      <div className="grid grid-cols-2 gap-4">
        {pillars.map((pillar) => {
          const Demo = pillar.demo
          const isActive = active === pillar.id
          return (
            <div
              key={pillar.id}
              className={cn(
                "flex flex-col gap-4 p-4 rounded-lg border bg-card transition-all duration-200",
                pillar.borderColor,
                isActive && pillar.bgColor
              )}
            >
              {/* Pillar header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg border",
                      pillar.bgColor,
                      pillar.borderColor
                    )}
                  >
                    <pillar.icon className={cn("w-4.5 h-4.5", pillar.accentColor)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-mono font-bold", pillar.accentColor)}>
                        {pillar.number}
                      </span>
                      <h3 className="text-xs font-bold text-foreground">{pillar.label}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{pillar.sublabel}</p>
                  </div>
                </div>
                <a
                  href={pillar.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-1 text-[9px] font-medium shrink-0 transition-colors",
                    pillar.accentColor,
                    "opacity-70 hover:opacity-100"
                  )}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span>{pillar.linkLabel}</span>
                </a>
              </div>

              {/* Description */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {pillar.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                      pillar.bgColor,
                      pillar.borderColor,
                      pillar.accentColor
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Toggle demo */}
              <button
                onClick={() => setActive(isActive ? null : pillar.id)}
                className={cn(
                  "flex items-center justify-between w-full rounded-md px-3 py-2 text-[10px] font-medium border transition-all duration-150",
                  isActive
                    ? cn("border-transparent", pillar.bgColor, pillar.accentColor)
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                )}
              >
                <span>{isActive ? "Hide demo" : "Show live demo"}</span>
                <ChevronRight
                  className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    isActive && "rotate-90"
                  )}
                />
              </button>

              {/* Collapsible demo area */}
              {isActive && (
                <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <Demo />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ─────────────────────────────────────────
          HARDCORE TERMUX CONTROL SCRIPT
      ───────────────────────────────────────── */}
      <TermuxControlPanel />
    </section>
  )
}

/* ─────────────────────────────────────────
   TERMUX CONTROL PANEL — hardcore python
───────────────────────────────────────── */
function TermuxControlPanel() {
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<"preview" | "install" | "usage">("preview")

  const installCmd = "pkg install python -y && pip install -r requirements.txt"
  const runCmd = "python3 omni_nexus_control.py --profile prod"

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const codePreview = [
    { c: "text-muted-foreground", t: "#!/data/data/com.termux/files/usr/bin/env python3" },
    { c: "text-muted-foreground", t: '"""OMNI-NEXUS // TERMUX CONTROL TUI :: v2.6.1-hardcore"""' },
    { c: "text-muted-foreground", t: "" },
    { c: "text-[#3b82f6]", t: "from __future__ import annotations" },
    { c: "text-[#3b82f6]", t: "import asyncio, asyncssh, httpx, psutil" },
    { c: "text-[#3b82f6]", t: "from textual.app import App, ComposeResult" },
    { c: "text-[#3b82f6]", t: "from rich.console import Console, Group" },
    { c: "text-[#3b82f6]", t: "from rich.progress import Progress, BarColumn" },
    { c: "text-muted-foreground", t: "" },
    { c: "text-[#a855f7]", t: "class OmniNexusApp(App):" },
    { c: "text-foreground", t: '    """Hardcore TUI control center."""' },
    { c: "text-foreground", t: "    BINDINGS = [" },
    { c: "text-[#f5a623]", t: '        Binding("q", "quit", "Quit", priority=True),' },
    { c: "text-[#f5a623]", t: '        Binding("f6", "toggle_tunnel", "SSH Tunnel"),' },
    { c: "text-[#f5a623]", t: '        Binding("f9", "panic", "Panic"),' },
    { c: "text-foreground", t: "    ]" },
    { c: "text-foreground", t: "" },
    { c: "text-[#a855f7]", t: "    async def on_mount(self) -> None:" },
    { c: "text-foreground", t: "        self.edge = await EdgeClient(self.cfg).__aenter__()" },
    { c: "text-foreground", t: "        self.run_worker(self._open_tunnel(), exclusive=True)" },
    { c: "text-foreground", t: "        self.set_interval(1.0, self._tick_metrics)" },
    { c: "text-foreground", t: "        self.set_interval(2.5, self._tick_threats)" },
    { c: "text-muted-foreground", t: "" },
    { c: "text-primary", t: "# 740 lines · 4 MB runtime · 138k+ datapoints streamable" },
  ]

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-card to-[#0a1a16] overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-[#09131a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/30">
            <FileCode2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">omni_nexus_control.py</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                v2.6.1
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">
                HARDCORE
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Hardcore Python TUI · Textual + Rich + asyncio · pilots Termux → AWS edge via SSH tunnel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/omni_nexus_control.py"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Download .py</span>
          </a>
          <a
            href="/requirements.txt"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>requirements.txt</span>
          </a>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/60">
        {[
          { label: "Lines of code", value: "740" },
          { label: "Runtime footprint", value: "≈ 4 MB" },
          { label: "Datapoints streamable", value: "138k+" },
          { label: "Edge latency target", value: "< 4 ms" },
        ].map((s) => (
          <div key={s.label} className="px-5 py-3 border-r border-border/60 last:border-r-0">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="text-base font-bold text-foreground font-mono mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 pt-4">
        {(["preview", "install", "usage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-[10px] font-medium rounded-t-md border-b-2 transition-colors uppercase tracking-wider",
              tab === t
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-5 pb-5 pt-3">
        {tab === "preview" && (
          <div className="rounded-md bg-[#020b09] border border-primary/20 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#f5a623]" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="ml-2 text-[9px] text-muted-foreground tracking-widest uppercase">
                  omni_nexus_control.py
                </span>
              </div>
              <button
                onClick={() => handleCopy(codePreview.map((l) => l.t).join("\n"))}
                className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-[11px] leading-relaxed p-4 overflow-x-auto">
              {codePreview.map((line, i) => (
                <div key={i} className="flex gap-4 whitespace-pre">
                  <span className="text-muted-foreground/40 select-none w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className={line.c}>{line.t || " "}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "install" && (
          <div className="space-y-3">
            <div className="rounded-md bg-[#020b09] border border-border p-4 font-mono text-[11px] leading-relaxed">
              <p className="text-muted-foreground"># 1. Install Python on Termux</p>
              <p className="text-primary">$ pkg update && pkg install python openssh -y</p>
              <p className="text-muted-foreground mt-2"># 2. Drop the script + deps</p>
              <p className="text-primary">$ curl -O https://your.host/omni_nexus_control.py</p>
              <p className="text-primary">$ curl -O https://your.host/requirements.txt</p>
              <p className="text-muted-foreground mt-2"># 3. Install Python dependencies</p>
              <p className="text-primary">$ pip install -r requirements.txt</p>
              <p className="text-muted-foreground mt-2"># 4. Pre-flight check</p>
              <p className="text-primary">$ python3 omni_nexus_control.py --preflight-only</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {["textual", "rich", "psutil", "httpx", "asyncssh"].map((p) => (
                <span
                  key={p}
                  className="text-[10px] font-mono px-2 py-1.5 rounded border border-border bg-muted/50 text-foreground text-center"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === "usage" && (
          <div className="space-y-3">
            <div className="rounded-md bg-[#020b09] border border-border p-4 font-mono text-[11px] leading-relaxed">
              <p className="text-muted-foreground"># Launch the hardcore TUI</p>
              <p className="text-primary">$ {runCmd}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { k: "F1", v: "help" },
                { k: "F5", v: "refresh feed" },
                { k: "F6", v: "toggle SSH tunnel" },
                { k: "F9", v: "panic / killswitch" },
                { k: "q", v: "quit" },
                { k: "↵", v: "agent shell" },
              ].map((b) => (
                <div
                  key={b.k}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/30"
                >
                  <kbd className="px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary text-[10px] font-mono font-bold">
                    {b.k}
                  </kbd>
                  <span className="text-[10px] text-muted-foreground">{b.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
