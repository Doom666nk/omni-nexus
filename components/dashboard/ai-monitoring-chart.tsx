"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  { time: "0h", value: 8 },
  { time: "2h", value: 5 },
  { time: "4h", value: 12 },
  { time: "6h", value: 22 },
  { time: "8h", value: 18 },
  { time: "10h", value: 35 },
  { time: "12h", value: 78 },
  { time: "14h", value: 52 },
  { time: "16h", value: 41 },
  { time: "18h", value: 30 },
  { time: "20h", value: 48 },
  { time: "22h", value: 55 },
  { time: "24h", value: 62 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-mono font-semibold px-3 py-1.5 rounded-md shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
        <span>Threat Detected: {payload[0].value}</span>
      </div>
    )
  }
  return null
}

export function AIMonitoringChart() {
  return (
    <div className="flex flex-col gap-3 p-5 bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">AI Monitoring</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Real-time threat detection over 24 hours</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] text-primary font-mono uppercase tracking-wider">Live Feed</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4a8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4a8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#162c38" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "#4e7d8a", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#4e7d8a", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#00d4a8", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00d4a8"
              strokeWidth={2}
              fill="url(#tealGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#00d4a8", stroke: "#070e12", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
