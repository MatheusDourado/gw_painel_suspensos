"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Calendar, Eye, MessageSquare, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { normalizePriority, normalizeStatus, type SuspendedTicket } from "@/lib/tickets"

interface TicketsTableProps {
  selectedEnvironment: string | null
  tickets: SuspendedTicket[]
  onSchedule: (ticket: SuspendedTicket) => void
  onViewDetails: (ticket: SuspendedTicket) => void
  onAddNote: (ticket: SuspendedTicket) => void
}

const getPriorityClass = (priority: string) => {
  const normalized = normalizePriority(priority)
  if (normalized === "critica") return "bg-destructive text-destructive-foreground"
  if (normalized === "alta") return "bg-warning text-foreground"
  if (normalized === "media") return "bg-primary text-primary-foreground"
  if (normalized === "baixa") return "bg-muted text-muted-foreground"
  return "bg-muted text-muted-foreground"
}

const getStatusClass = (status: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === "suspenso") return "bg-warning/20 text-warning border-warning/30"
  if (normalized === "agendado") return "bg-success/20 text-success border-success/30"
  if (normalized === "em atendimento") return "bg-primary/20 text-primary border-primary/30"
  if (normalized === "concluido") return "bg-muted text-muted-foreground border-muted"
  return "bg-muted text-muted-foreground border-muted"
}

export function TicketsTable({ selectedEnvironment, tickets, onSchedule, onViewDetails, onAddNote }: TicketsTableProps) {
  const filteredTickets = selectedEnvironment
    ? tickets.filter((t) => t.environment === selectedEnvironment)
    : tickets

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Chamado</TableHead>
            <TableHead className="text-muted-foreground">Ambiente</TableHead>
            <TableHead className="text-muted-foreground">Prioridade</TableHead>
            <TableHead className="text-muted-foreground">Motivo</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Dias Aberto</TableHead>
            <TableHead className="text-muted-foreground">SLA</TableHead>
            <TableHead className="text-muted-foreground">Agendamento</TableHead>
            <TableHead className="text-muted-foreground w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="border-border cursor-pointer hover:bg-accent/50"
              onClick={() => onViewDetails(ticket)}
            >
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{ticket.number}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">{ticket.title}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {ticket.environment}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={cn(getPriorityClass(ticket.priority))}>{ticket.priority}</Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{ticket.suspensionReason}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(getStatusClass(ticket.status))}>
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "font-medium",
                    ticket.daysOpen > 7 ? "text-destructive" : ticket.daysOpen > 3 ? "text-warning" : "text-foreground",
                  )}
                >
                  {ticket.daysOpen}d
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {isOverdue(ticket.slaDeadline) && <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span
                    className={cn(
                      "text-sm",
                      isOverdue(ticket.slaDeadline) ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {new Date(ticket.slaDeadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {ticket.scheduledDate ? (
                  <span className="text-sm text-success">
                    {new Date(ticket.scheduledDate).toLocaleDateString("pt-BR")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetails(ticket)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onSchedule(ticket)
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Agendar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddNote(ticket)
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Adicionar Nota
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
