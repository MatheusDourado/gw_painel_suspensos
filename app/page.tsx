"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { KPICards } from "@/components/kpi-cards"
import { TicketsTable } from "@/components/tickets-table"
import { EnvironmentChart } from "@/components/environment-chart"
import { ReasonChart } from "@/components/reason-chart"
import { TimelineChart } from "@/components/timeline-chart"
import { AlertsPanel } from "@/components/alerts-panel"
import { ScheduledList } from "@/components/scheduled-list"
import { ScheduleModal } from "@/components/schedule-modal"
import { TicketDetailsModal } from "@/components/ticket-details-modal"
import { AnalyticsView } from "@/components/analytics-view"
import { ToastNotification } from "@/components/toast-notification"
import { getEnvironments, type SuspendedTicket } from "@/lib/tickets"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<SuspendedTicket | null>(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "" })
  const [tickets, setTickets] = useState<SuspendedTicket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState<string | null>(null)

  const loadTickets = async () => {
    setTicketsLoading(true)
    setTicketsError(null)
    try {
      const response = await fetch("/api/tickets", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`)
      }
      const data = (await response.json()) as { tickets?: SuspendedTicket[] }
      setTickets(data.tickets ?? [])
    } catch (error) {
      setTicketsError(error instanceof Error ? error.message : "Falha ao carregar tickets")
    } finally {
      setTicketsLoading(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.querySelector<HTMLButtonElement>("[data-search-trigger]")?.click()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    void loadTickets()
  }, [])

  const environments = useMemo(() => getEnvironments(tickets), [tickets])

  const handleSchedule = (ticket: SuspendedTicket) => {
    setSelectedTicket(ticket)
    setDetailsModalOpen(false)
    setScheduleModalOpen(true)
  }

  const handleViewDetails = (ticket: SuspendedTicket) => {
    setSelectedTicket(ticket)
    setDetailsModalOpen(true)
  }

  const handleSearchSelect = (ticket: SuspendedTicket) => {
    setSelectedTicket(ticket)
    setDetailsModalOpen(true)
  }

  const handleConfirmSchedule = async (date: string, time: string, serviceType: string, notes: string) => {
    if (!selectedTicket) return
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.number}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, serviceType, notes }),
      })
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string; details?: string }
        throw new Error(errorBody.details || errorBody.error || `Erro ${response.status}`)
      }

      await loadTickets()
      setToast({
        show: true,
        message: `Agendamento confirmado para ${new Date(date).toLocaleDateString("pt-BR")} as ${time}`,
      })
    } catch (error) {
      setToast({
        show: true,
        message: `Falha ao salvar agendamento: ${error instanceof Error ? error.message : "Erro inesperado"}`,
      })
    }
  }

  const handleAddNote = async (ticket: SuspendedTicket) => {
    const noteText = window.prompt(`Adicionar nota para ${ticket.number}:`)
    if (!noteText || !noteText.trim()) return

    try {
      const response = await fetch(`/api/tickets/${ticket.number}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim(), type: "interna" }),
      })
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string; details?: string }
        throw new Error(errorBody.details || errorBody.error || `Erro ${response.status}`)
      }

      await loadTickets()
      setToast({ show: true, message: "Nota salva com sucesso." })
    } catch (error) {
      setToast({
        show: true,
        message: `Falha ao salvar nota: ${error instanceof Error ? error.message : "Erro inesperado"}`,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header tickets={tickets} onSelectTicket={handleSearchSelect} />
      <SidebarNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedEnvironment={selectedEnvironment}
        onEnvironmentChange={setSelectedEnvironment}
        environments={environments}
        tickets={tickets}
      />

      <main className="ml-64 p-6">
        {ticketsError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Erro ao carregar dados do CITSMART: {ticketsError}
          </div>
        )}
        {ticketsLoading && (
          <div className="mb-4 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            Carregando tickets...
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {activeTab === "overview" && "Visao Geral"}
                {activeTab === "tickets" && "Chamados Suspensos"}
                {activeTab === "scheduled" && "Agendamentos"}
                {activeTab === "analytics" && "Analise de Dados"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {selectedEnvironment ? `Filtrando por ambiente: ${selectedEnvironment}` : "Todos os ambientes ITSM"}
              </p>
            </div>
            {selectedEnvironment && (
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-secondary"
                onClick={() => setSelectedEnvironment(null)}
              >
                {selectedEnvironment} x
              </Badge>
            )}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <KPICards selectedEnvironment={selectedEnvironment} tickets={tickets} />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TimelineChart tickets={tickets} />
              </div>
              <AlertsPanel tickets={tickets} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <EnvironmentChart tickets={tickets} />
              <ReasonChart tickets={tickets} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Chamados Recentes</h2>
                <TicketsTable
                  selectedEnvironment={selectedEnvironment}
                  tickets={tickets}
                  onSchedule={handleSchedule}
                  onViewDetails={handleViewDetails}
                  onAddNote={handleAddNote}
                />
              </div>
              <ScheduledList selectedEnvironment={selectedEnvironment} tickets={tickets} />
            </div>
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="space-y-6">
            <KPICards selectedEnvironment={selectedEnvironment} tickets={tickets} />
            <TicketsTable
              selectedEnvironment={selectedEnvironment}
              tickets={tickets}
              onSchedule={handleSchedule}
              onViewDetails={handleViewDetails}
              onAddNote={handleAddNote}
            />
          </div>
        )}

        {activeTab === "scheduled" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TicketsTable
                  selectedEnvironment={selectedEnvironment}
                  tickets={tickets}
                  onSchedule={handleSchedule}
                  onViewDetails={handleViewDetails}
                  onAddNote={handleAddNote}
                />
              </div>
              <ScheduledList selectedEnvironment={selectedEnvironment} tickets={tickets} />
            </div>
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsView tickets={tickets} />}
      </main>

      <ScheduleModal
        ticket={selectedTicket}
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onConfirm={handleConfirmSchedule}
      />

      <TicketDetailsModal
        ticket={selectedTicket}
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onSchedule={() => handleSchedule(selectedTicket!)}
        onAddNote={() => selectedTicket && void handleAddNote(selectedTicket)}
      />

      <ToastNotification
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
    </div>
  )
}
