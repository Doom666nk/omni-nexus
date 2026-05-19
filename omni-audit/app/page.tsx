import { CommandPanel } from "@/components/command/command-panel"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            <h1 className="text-base font-semibold tracking-tight font-mono">
              OMNI-NEXUS PRO
            </h1>
            <span className="text-xs text-muted-foreground font-mono">
              / OMNI-SOUL
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <a href="/api/health" className="hover:text-foreground">health</a>
            <a href="/login" className="hover:text-foreground">login</a>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            Command — souverain, vérifiable, réversible
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            4 agents autonomes (director, wav-supervisor, vault-auditor,
            self-repair) coordonnés par le manifeste{" "}
            <code className="font-mono text-foreground">soul.md</code>. Chaque
            action déclarée passe par interpret → plan → confirm → execute.
          </p>
        </div>
        <CommandPanel />
      </section>
    </main>
  )
}
