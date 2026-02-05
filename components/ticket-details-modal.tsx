"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, User, Building2, AlertTriangle, FileText, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizePriority, normalizeStatus } from "@/lib/tickets"
import type { SuspendedTicket } from "@/lib/tickets"

interface TicketDetailsModalProps {
  ticket: SuspendedTicket | null
  open: boolean
  onClose: () => void
  onSchedule: () => void
  onAddNote: () => void
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

export function TicketDetailsModal({ ticket, open, onClose, onSchedule, onAddNote }: TicketDetailsModalProps) {
  if (!ticket) return null

  const isOverdue = new Date(ticket.slaDeadline) < new Date()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{ticket.number}</DialogTitle>
              <p className="text-muted-foreground mt-1">{ticket.title}</p>
            </div>
            <Badge variant="outline" className={cn(getStatusClass(ticket.status))}>
              {ticket.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alerts */}
          {(isOverdue || normalizePriority(ticket.priority) === "critica") && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-4",
                isOverdue ? "bg-destructive/10 border border-destructive/30" : "bg-warning/10 border border-warning/30",
              )}
            >
              <AlertTriangle className={cn("h-5 w-5", isOverdue ? "text-destructive" : "text-warning")} />
              <div>
                <p className={cn("font-medium", isOverdue ? "text-destructive" : "text-warning")}>
                  {isOverdue ? "SLA Vencido!" : "Chamado com Prioridade Crítica"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOverdue
                    ? `O prazo de SLA expirou em ${new Date(ticket.slaDeadline).toLocaleDateString("pt-BR")}`
                    : "Este chamado requer atenção imediata"}
                </p>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ambiente</p>
              <Badge variant="outline" className="font-mono">
                {ticket.environment}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prioridade</p>
              <Badge className={cn(getPriorityClass(ticket.priority))}>{ticket.priority}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Motivo da Suspensão</p>
              <p className="font-medium text-foreground">{ticket.suspensionReason}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Dias em Aberto</p>
              <p
                className={cn(
                  "font-medium",
                  ticket.daysOpen > 7 ? "text-destructive" : ticket.daysOpen > 3 ? "text-warning" : "text-foreground",
                )}
              >
                {ticket.daysOpen} dias
              </p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* People */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Analista</p>
                <p className="font-medium text-foreground">{ticket.analyst}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium text-foreground">{ticket.client}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Suspenso em</p>
                <p className="font-medium text-foreground">
                  {new Date(ticket.suspendedAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className={cn("h-5 w-5", isOverdue ? "text-destructive" : "text-muted-foreground")} />
              <div>
                <p className="text-sm text-muted-foreground">Prazo SLA</p>
                <p className={cn("font-medium", isOverdue ? "text-destructive" : "text-foreground")}>
                  {new Date(ticket.slaDeadline).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className={cn("h-5 w-5", ticket.scheduledDate ? "text-success" : "text-muted-foreground")} />
              <div>
                <p className="text-sm text-muted-foreground">Agendamento</p>
                <p className={cn("font-medium", ticket.scheduledDate ? "text-success" : "text-muted-foreground")}>
                  {ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleDateString("pt-BR") : "Não agendado"}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {ticket.notes && (
            <>
              <Separator className="bg-border" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Observações</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm text-muted-foreground">{ticket.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="outline" onClick={onAddNote}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Adicionar Nota
          </Button>
          {!ticket.scheduledDate && (
            <Button onClick={onSchedule}>
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Atendimento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
