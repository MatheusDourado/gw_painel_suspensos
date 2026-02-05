"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeStatus, type SuspendedTicket } from "@/lib/tickets"

interface ScheduledListProps {
  selectedEnvironment: string | null
  tickets: SuspendedTicket[]
}

export function ScheduledList({ selectedEnvironment, tickets }: ScheduledListProps) {
  const scheduledTickets = tickets
    .filter((t) => normalizeStatus(t.status) === "agendado" && t.scheduledDate)
    .filter((t) => !selectedEnvironment || t.environment === selectedEnvironment)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())

  const isToday = (date: string) => {
    const today = new Date()
    const scheduleDate = new Date(date)
    return today.toDateString() === scheduleDate.toDateString()
  }

  const isTomorrow = (date: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const scheduleDate = new Date(date)
    return tomorrow.toDateString() === scheduleDate.toDateString()
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-success" />
          Próximos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scheduledTickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento encontrado</p>
        ) : (
          scheduledTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={cn(
                "flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50 cursor-pointer",
                isToday(ticket.scheduledDate!) && "border-success/50 bg-success/5",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isToday(ticket.scheduledDate!) ? "bg-success/20" : "bg-secondary",
                  )}
                >
                  <Calendar
                    className={cn("h-5 w-5", isToday(ticket.scheduledDate!) ? "text-success" : "text-muted-foreground")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{ticket.number}</p>
                    {isToday(ticket.scheduledDate!) && (
                      <Badge className="bg-success/20 text-success border-0 text-[10px]">HOJE</Badge>
                    )}
                    {isTomorrow(ticket.scheduledDate!) && (
                      <Badge className="bg-warning/20 text-warning border-0 text-[10px]">AMANHÃ</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate max-w-[180px]">{ticket.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isToday(ticket.scheduledDate!) ? "text-success" : "text-foreground",
                  )}
                >
                  {new Date(ticket.scheduledDate!).toLocaleDateString("pt-BR")}
                </p>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="text-xs">{ticket.analyst}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
