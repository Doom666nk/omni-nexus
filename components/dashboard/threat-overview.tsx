"use client"

import { useState } from "react"
import { MapPin, Clock, ShieldAlert, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ThreatLevel = "Critical" | "High" | "Medium"

interface ThreatUser {
  name: string
  avatar: string
  level: ThreatLevel
  behaviors: string[]
  time: string
  ip: string
  resolved?: boolean
}

const threats: ThreatUser[] = [
  {
    name: "Jamie Charles",
    avatar: "JC",
    level: "Critical",
    behaviors: ["Login from new country", "Attempted port scan"],
    time: "10 min ago",
    ip: "192.168.1.24",
    resolved: false,
  },
  {
    name: "Alex Rivera",
    avatar: "AR",
    level: "High",
    behaviors: ["Brute force attempt", "Unusual data transfer"],
    time: "34 min ago",
    ip: "10.0.0.87",
    resolved: false,
  },
  {
    name: "Sam Torres",
    avatar: "ST",
    level: "Medium",
    behaviors: ["Failed auth × 12", "Off-hours access"],
    time: "1h ago",
    ip: "172.16.0.5",
    resolved: false,
  },
]

const levelStyle: Record<ThreatLevel, { badge: string; ring: string }> = {
  Critical: {
    badge: "bg-destructive text-white",
    ring: "ring-destructive/40",
  },
  High: {
    badge: "bg-[#f5a623] text-black",
    ring: "ring-[#f5a623]/40",
  },
  Medium: {
    badge: "bg-blue-500 text-white",
    ring: "ring-blue-500/40",
  },
}

export function ThreatOverview() {
  const [isolated, setIsolated] = useState<Record<number, boolean>>({})

  const handleIsolate = (i: number) => {
    setIsolated((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  return (
    <div className="flex flex-col gap-3 p-5 bg-card rounded-lg border border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Threat Overview</h2>
          <span className="text-[10px] font-bold bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
            {threats.length}
          </span>
        </div>
        <button className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
          View All
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Threat cards */}
      <div className="flex flex-col gap-3">
        {threats.map((threat, i) => {
          const lvl = levelStyle[threat.level]
          const isIsolated = isolated[i]
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col gap-3 p-4 rounded-lg border transition-all duration-200",
                isIsolated
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/20 hover:border-border/80"
              )}
            >
              {/* User row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-bold ring-2 bg-muted text-foreground",
                    lvl.ring
                  )}>
                    {threat.avatar}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{threat.name}</span>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", lvl.badge)}>
                  {threat.level}
                </span>
              </div>

              {/* Behavior */}
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1 font-semibold">Behavior</p>
                {threat.behaviors.map((b, j) => (
                  <p key={j} className="text-[11px] text-foreground/80">{b}</p>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="font-mono">{threat.ip}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{threat.time}</span>
                </div>
              </div>

              {/* Isolate button */}
              <button
                onClick={() => handleIsolate(i)}
                className={cn(
                  "w-full py-2 rounded-md text-xs font-bold tracking-wider transition-all duration-200 uppercase",
                  isIsolated
                    ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_12px_rgba(0,212,168,0.3)]"
                )}
              >
                {isIsolated ? "Isolated" : "Isolate"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
