"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  Activity,
  Cpu,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Radio,
  Search,
  FileText,
  Users,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: false, href: "#" },
  { icon: Activity, label: "Analytics", active: false, href: "#" },
  { icon: Radio, label: "Threat Intel", active: false, href: "#" },
  { icon: AlertTriangle, label: "Threats", active: false, href: "#" },
  { icon: Search, label: "Sources", active: false, href: "#" },
  { icon: FileText, label: "Reports", active: false, href: "#" },
  { icon: Cpu, label: "Indicators", active: false, href: "#" },
]

const opsItems = [
  { icon: Bell, label: "Alerts", active: true, href: "#", badge: 12 },
  { icon: Shield, label: "SOC Co-Pilot", active: false, href: "#" },
  { icon: Users, label: "Directory", active: false, href: "#" },
  { icon: Settings, label: "Setting", active: false, href: "#" },
]

const systemItems = [
  { icon: Sparkles, label: "System Proof", active: false, href: "#pillars", badge: 4 },
]

export function Sidebar() {
  const [activeItem, setActiveItem] = useState("Alerts")

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-sidebar border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/30">
          <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-foreground uppercase">Omni-Nexus</p>
          <p className="text-[9px] text-muted-foreground tracking-wider font-mono uppercase">V6 Active</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 mb-2 text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Overview</p>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveItem(item.label)}
            className={cn(
              "flex items-center w-full gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 group",
              activeItem === item.label
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            )}
          >
            <item.icon
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors",
                activeItem === item.label ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{item.label}</span>
            {activeItem === item.label && (
              <ChevronRight className="w-3 h-3 ml-auto text-primary" />
            )}
          </button>
        ))}

        <p className="px-2 mt-4 mb-2 text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Operations</p>
        {opsItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveItem(item.label)}
            className={cn(
              "flex items-center w-full gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 group",
              activeItem === item.label
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            )}
          >
            <item.icon
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                activeItem === item.label ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[9px] font-bold bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
            {activeItem === item.label && !item.badge && (
              <ChevronRight className="w-3 h-3 ml-auto text-primary" />
            )}
          </button>
        ))}

        <p className="px-2 mt-4 mb-2 text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">System</p>
        {systemItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveItem(item.label)}
            className={cn(
              "flex items-center w-full gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 group",
              activeItem === item.label
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            )}
          >
            <item.icon
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                activeItem === item.label ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border">
        <button className="flex items-center w-full gap-3 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
