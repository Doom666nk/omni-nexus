"use client"

import { useState } from "react"
import { Bell, RefreshCw, Search, ChevronDown } from "lucide-react"

const timeOptions = ["Last 24h", "Last 7 Days", "Last 30 Days", "Last 3 Months"]

export function Header() {
  const [selectedTime, setSelectedTime] = useState("Last 24h")
  const [showDropdown, setShowDropdown] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Dashboard</span>
        <span className="text-border">/</span>
        <span className="text-primary font-medium">Real-Time Threat Intelligence Overview</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-1.5 w-44">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>

        {/* Time filter */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-foreground hover:border-primary/50 transition-colors"
          >
            <span>{selectedTime}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-md shadow-xl z-50 overflow-hidden">
              {timeOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSelectedTime(opt); setShowDropdown(false) }}
                  className="block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-md px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-8 h-8 bg-muted border border-border rounded-md hover:border-primary/50 transition-colors">
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center text-[8px] font-bold text-white">
            3
          </span>
        </button>
      </div>
    </header>
  )
}
