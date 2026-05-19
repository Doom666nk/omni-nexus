"use client"

import { AlertTriangle, Radio, Target, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

const metrics = [
  {
    label: "Critical Threats",
    value: "5–10",
    sub: "Active Critical Severity Threats",
    trend: "+12%",
    trendDir: "up" as const,
    icon: AlertTriangle,
    color: "critical",
    pulse: true,
  },
  {
    label: "New IOCs",
    value: "10–15",
    sub: "Indicators In Last 24h",
    trend: "+05%",
    trendDir: "up" as const,
    icon: Radio,
    color: "primary",
    pulse: false,
  },
  {
    label: "Active Campaigns",
    value: "06–10",
    sub: "Ongoing campaigns",
    trend: "-03%",
    trendDir: "down" as const,
    icon: Target,
    color: "warning",
    pulse: false,
  },
  {
    label: "Active Campaigns",
    value: "7–09",
    sub: "Ongoing campaigns",
    trend: "-03%",
    trendDir: "down" as const,
    icon: Activity,
    color: "info",
    pulse: false,
  },
]

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string; glow: string }> = {
  critical: {
    bg: "bg-destructive/5",
    border: "border-destructive/20",
    text: "text-destructive",
    icon: "text-destructive",
    glow: "shadow-[0_0_20px_rgba(255,51,85,0.1)]",
  },
  primary: {
    bg: "bg-primary/5",
    border: "border-primary/20",
    text: "text-primary",
    icon: "text-primary",
    glow: "shadow-[0_0_20px_rgba(0,212,168,0.1)]",
  },
  warning: {
    bg: "bg-[#f5a623]/5",
    border: "border-[#f5a623]/20",
    text: "text-[#f5a623]",
    icon: "text-[#f5a623]",
    glow: "shadow-[0_0_20px_rgba(245,166,35,0.1)]",
  },
  info: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    icon: "text-blue-400",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]",
  },
}

export function MetricCards() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {metrics.map((metric, i) => {
        const colors = colorMap[metric.color]
        return (
          <div
            key={i}
            className={cn(
              "relative flex flex-col gap-3 p-4 rounded-lg border bg-card",
              colors.border,
              colors.glow,
              "transition-all duration-200 hover:border-opacity-50"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-md", colors.bg, "border", colors.border)}>
                <metric.icon className={cn("w-4 h-4", colors.icon)} />
              </div>
              {metric.pulse && (
                <span className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                  <span className="text-[9px] text-destructive font-mono uppercase tracking-wider">Live</span>
                </span>
              )}
            </div>

            {/* Value */}
            <div>
              <p className={cn("text-2xl font-bold tracking-tight font-mono", colors.text)}>
                {metric.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{metric.label}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium font-mono",
                metric.trendDir === "up" ? "text-primary" : "text-[#f5a623]"
              )}>
                {metric.trendDir === "up" ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : metric.trendDir === "down" ? (
                  <TrendingDown className="w-2.5 h-2.5" />
                ) : (
                  <Minus className="w-2.5 h-2.5" />
                )}
                {metric.trend}
              </span>
              <span className="text-[10px] text-muted-foreground">{metric.sub}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
