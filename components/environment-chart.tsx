"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getStatsByEnvironment, type SuspendedTicket } from "@/lib/tickets"
import { CustomTooltip } from "@/components/custom-tooltip"

const CHART_COLORS = {
  total: "var(--chart-1)",
  critical: "var(--chart-4)",
  scheduled: "var(--chart-2)",
}

interface EnvironmentChartProps {
  tickets: SuspendedTicket[]
}

export function EnvironmentChart({ tickets }: EnvironmentChartProps) {
  const data = getStatsByEnvironment(tickets)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Chamados por Ambiente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ className: "fill-muted-foreground text-xs" }}
                axisLine={{ className: "stroke-border" }}
                tickLine={{ className: "stroke-border" }}
              />
              <YAxis
                tick={{ className: "fill-muted-foreground text-xs" }}
                axisLine={{ className: "stroke-border" }}
                tickLine={{ className: "stroke-border" }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.3 }} />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
              <Bar dataKey="total" name="Total" fill={CHART_COLORS.total} radius={[4, 4, 0, 0]} />
              <Bar dataKey="critical" name="Críticos" fill={CHART_COLORS.critical} radius={[4, 4, 0, 0]} />
              <Bar dataKey="scheduled" name="Agendados" fill={CHART_COLORS.scheduled} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
