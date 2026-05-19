"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "Critical", value: 25, color: "#ff3355" },
  { name: "High", value: 40, color: "#f5a623" },
  { name: "Low", value: 15, color: "#00d4a8" },
  { name: "Medium", value: 20, color: "#3b82f6" },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md px-2.5 py-1.5 text-[10px] font-mono shadow-lg">
        <p style={{ color: payload[0].payload.color }} className="font-semibold">
          {payload[0].name}: {payload[0].value}%
        </p>
      </div>
    )
  }
  return null
}

export function SeverityChart() {
  return (
    <div className="flex flex-col gap-3 p-5 bg-card rounded-lg border border-border">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Severity Distribution</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">Current threats by severity level</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-muted-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
                <span
                  className="text-[10px] font-mono font-semibold w-7 text-right"
                  style={{ color: item.color }}
                >
                  {item.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
