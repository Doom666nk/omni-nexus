"use client"

import { useState } from "react"
import { ChevronDown, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

type Severity = "High" | "Medium" | "Low"

interface ThreatEntry {
  device: string
  detected: string
  severity: Severity
  file: string
  source: string
  status: string
}

const threats: ThreatEntry[] = [
  { device: "Workstation-1", detected: "10min ago", severity: "High", file: "client_data.zip", source: "Endpoint", status: "Active" },
  { device: "Laptop-7", detected: "2h ago", severity: "Medium", file: "Document.docx", source: "Auth Server", status: "Investigating" },
  { device: "Server-3", detected: "Yesterday", severity: "Low", file: "ransomware.exe", source: "API Gateway", status: "Contained" },
  { device: "MacBook-12", detected: "3h ago", severity: "High", file: "payload.bin", source: "Network", status: "Active" },
  { device: "VM-Node-9", detected: "5h ago", severity: "Medium", file: "config_dump.tar", source: "Cloud", status: "Resolved" },
  { device: "Switch-Core-2", detected: "1d ago", severity: "Low", file: "net_scan.log", source: "Firewall", status: "Closed" },
]

const severityStyle: Record<Severity, string> = {
  High: "bg-destructive/10 text-destructive border border-destructive/20",
  Medium: "bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20",
  Low: "bg-primary/10 text-primary border border-primary/20",
}

const statusStyle: Record<string, string> = {
  Active: "text-destructive",
  Investigating: "text-[#f5a623]",
  Contained: "text-blue-400",
  Resolved: "text-primary",
  Closed: "text-muted-foreground",
}

const periodOptions = ["Weekly", "Daily", "Monthly"]

export function ThreatLog() {
  const [period, setPeriod] = useState("Weekly")
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="flex flex-col gap-3 p-5 bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Threat Log</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Recent detections across all endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground border border-border rounded-md px-2 py-1 hover:border-primary/40 transition-colors">
            <Filter className="w-2.5 h-2.5" />
            Filter
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-1 bg-muted border border-border rounded-md px-2.5 py-1 text-[10px] text-foreground hover:border-primary/40 transition-colors"
            >
              {period}
              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-card border border-border rounded-md shadow-xl z-50">
                {periodOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setPeriod(opt); setShowDropdown(false) }}
                    className="block w-full text-left px-3 py-1.5 text-[10px] text-foreground hover:bg-muted transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["Device Name", "Detected", "Severity", "File Name", "Source", "Status"].map((col) => (
                <th key={col} className="text-left px-3 py-2 text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {threats.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2.5 font-mono text-foreground font-medium">{row.device}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.detected}</td>
                <td className="px-3 py-2.5">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", severityStyle[row.severity])}>
                    {row.severity}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground">{row.file}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.source}</td>
                <td className={cn("px-3 py-2.5 font-medium", statusStyle[row.status] ?? "text-muted-foreground")}>
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
