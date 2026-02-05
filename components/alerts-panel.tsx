"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizePriority, normalizeStatus, type SuspendedTicket } from "@/lib/tickets"

interface AlertsPanelProps {
  tickets: SuspendedTicket[]
}

export function AlertsPanel({ tickets }: AlertsPanelProps) {
  const overdueTickets = tickets.filter((t) => new Date(t.slaDeadline) < new Date())
  const criticalTickets = tickets.filter(
    (t) => normalizePriority(t.priority) === "critica" && normalizeStatus(t.status) === "suspenso",
  )
  const longPending = tickets.filter((t) => t.daysOpen > 7)

  const alerts = [
    {
      type: "critical",
      icon: AlertTriangle,
      title: "SLA Vencido",
      count: overdueTickets.length,
      description: "Chamados com prazo expirado",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
    },
    {
      type: "warning",
      icon: AlertTriangle,
      title: "Prioridade Crítica",
      count: criticalTickets.length,
      description: "Chamados críticos suspensos",
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
    },
    {
      type: "info",
      icon: Clock,
      title: "Longa Espera",
      count: longPending.length,
      description: "Há mais de 7 dias suspensos",
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertas Ativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.type}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent/50",
              alert.borderColor,
              alert.bgColor,
            )}
          >
            <div className="flex items-center gap-3">
              <alert.icon className={cn("h-5 w-5", alert.color)} />
              <div>
                <p className={cn("font-medium", alert.color)}>{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(alert.bgColor, alert.color, "border-0")}>{alert.count}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
