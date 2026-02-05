"use client"

import { AlertTriangle, Calendar, Clock, Ticket, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { normalizePriority, normalizeStatus, type SuspendedTicket } from "@/lib/tickets"
import { cn } from "@/lib/utils"

interface KPICardsProps {
  selectedEnvironment: string | null
  tickets: SuspendedTicket[]
}

type Delta = {
  direction: "up" | "down" | "flat"
  label: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const toDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const inRange = (value: Date | null, from: number, to: number) => {
  if (!value) return false
  const time = value.getTime()
  return time >= from && time <= to
}

const getDelta = (current: number, previous: number): Delta => {
  if (current === 0 && previous === 0) return { direction: "flat", label: "0%" }
  if (previous === 0) return { direction: "up", label: "+100%" }

  const percent = ((current - previous) / previous) * 100
  if (Math.abs(percent) < 0.5) return { direction: "flat", label: "0%" }

  const rounded = Math.round(percent)
  return {
    direction: rounded > 0 ? "up" : "down",
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
  }
}

const getDeltaClass = (delta: Delta, increaseIsGood: boolean) => {
  if (delta.direction === "flat") return "text-muted-foreground"
  if (delta.direction === "up") return increaseIsGood ? "text-success" : "text-destructive"
  return increaseIsGood ? "text-destructive" : "text-success"
}

export function KPICards({ selectedEnvironment, tickets }: KPICardsProps) {
  const filteredTickets = selectedEnvironment
    ? tickets.filter((ticket) => ticket.environment === selectedEnvironment)
    : tickets

  const now = Date.now()
  const currentStart = now - 7 * DAY_MS
  const previousStart = now - 14 * DAY_MS

  const openedCurrent = filteredTickets.filter((ticket) => inRange(toDate(ticket.suspendedAt), currentStart, now))
  const openedPrevious = filteredTickets.filter((ticket) => inRange(toDate(ticket.suspendedAt), previousStart, currentStart))

  const scheduledCurrent = filteredTickets.filter(
    (ticket) => normalizeStatus(ticket.status) === "agendado" && inRange(toDate(ticket.scheduledDate), currentStart, now),
  )
  const scheduledPrevious = filteredTickets.filter(
    (ticket) =>
      normalizeStatus(ticket.status) === "agendado" && inRange(toDate(ticket.scheduledDate), previousStart, currentStart),
  )

  const criticalCurrent = openedCurrent.filter((ticket) => normalizePriority(ticket.priority) === "critica")
  const criticalPrevious = openedPrevious.filter((ticket) => normalizePriority(ticket.priority) === "critica")

  const avgDays = Math.round(
    filteredTickets.reduce((accumulator, ticket) => accumulator + ticket.daysOpen, 0) / (filteredTickets.length || 1),
  )
  const avgDaysCurrent = Math.round(
    openedCurrent.reduce((accumulator, ticket) => accumulator + ticket.daysOpen, 0) / (openedCurrent.length || 1),
  )
  const avgDaysPrevious = Math.round(
    openedPrevious.reduce((accumulator, ticket) => accumulator + ticket.daysOpen, 0) / (openedPrevious.length || 1),
  )

  const kpis = [
    {
      title: "Total Suspensos",
      value: filteredTickets.length,
      delta: getDelta(openedCurrent.length, openedPrevious.length),
      increaseIsGood: false,
      icon: Ticket,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Agendados",
      value: filteredTickets.filter((ticket) => normalizeStatus(ticket.status) === "agendado").length,
      delta: getDelta(scheduledCurrent.length, scheduledPrevious.length),
      increaseIsGood: true,
      icon: Calendar,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "SLA Crítico",
      value: filteredTickets.filter((ticket) => normalizePriority(ticket.priority) === "critica").length,
      delta: getDelta(criticalCurrent.length, criticalPrevious.length),
      increaseIsGood: false,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Tempo Médio",
      value: `${avgDays}d`,
      delta: getDelta(avgDaysCurrent, avgDaysPrevious),
      increaseIsGood: false,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className={cn("rounded-lg p-2", kpi.bgColor)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div className={cn("flex items-center gap-1 text-xs font-medium", getDeltaClass(kpi.delta, kpi.increaseIsGood))}>
                {kpi.delta.direction === "up" && <TrendingUp className="h-3 w-3" />}
                {kpi.delta.direction === "down" && <TrendingDown className="h-3 w-3" />}
                <span>{kpi.delta.label}</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
