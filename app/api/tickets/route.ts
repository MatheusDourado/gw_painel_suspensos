import { NextResponse } from "next/server"
import { citSmartRequest, createCitSmartSession } from "@/lib/citsmart"
import type { SuspendedTicket } from "@/lib/tickets"

type CitSmartTicketPayload = {
  data_abertura?: string
  data_abertura_str?: string
  projeto?: string
  ticket?: string
  motivo_suspensao?: string
  analista?: string
  equipe?: string
  status?: string
}

type CitSmartSchedulePayload = {
  id_agendamento?: number
  ticket_numero?: string
  data_hora_agendada?: string
  observacao?: string
}

type CitSmartNotePayload = {
  id_nota?: number
  ticket_numero?: string
  texto_nota?: string
  criado_em?: string
}

type CitSmartResponse<T> = {
  status?: string
  code?: string
  message?: string
  payload?: T[]
}

const toDate = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const calculateDaysOpen = (openedAt: Date) => {
  const now = new Date()
  const diff = Math.floor((now.getTime() - openedAt.getTime()) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff)
}

const toSuspendedTicket = (item: CitSmartTicketPayload): SuspendedTicket => {
  const openedAt = toDate(item.data_abertura_str) ?? toDate(item.data_abertura) ?? new Date()
  const slaDeadline = new Date(openedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
  const titleSource = item.motivo_suspensao?.split("\n").find((line) => line.trim().length > 0)

  return {
    id: item.ticket ?? `${openedAt.getTime()}`,
    number: item.ticket ?? "Sem numero",
    title: titleSource?.trim() ?? "Sem descricao",
    environment: item.projeto ?? "N/A",
    priority: "Media",
    suspensionReason: item.motivo_suspensao?.trim() ?? "Sem motivo",
    status: item.status ?? "Suspenso",
    suspendedAt: openedAt.toISOString(),
    daysOpen: calculateDaysOpen(openedAt),
    analyst: item.analista ?? "Sem responsavel",
    client: item.equipe ?? "Sem equipe",
    slaDeadline: slaDeadline.toISOString(),
    notes: item.motivo_suspensao?.trim() ?? undefined,
  }
}

export async function GET() {
  try {
    const session = await createCitSmartSession()

    const [ticketsResult, schedulesResult, notesResult] = await Promise.all([
      citSmartRequest<CitSmartResponse<CitSmartTicketPayload>>({
        session,
        path: "/cit-esi-web/rest/dynamic/relatorios/view_unificada_tickets_suspenso_service_desk.json",
      }),
      citSmartRequest<CitSmartResponse<CitSmartSchedulePayload>>({
        session,
        path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_agendamento.json",
      }),
      citSmartRequest<CitSmartResponse<CitSmartNotePayload>>({
        session,
        path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota.json",
      }),
    ])

    const scheduleByTicket = new Map<string, CitSmartSchedulePayload>()
    for (const schedule of schedulesResult.payload ?? []) {
      if (!schedule.ticket_numero) continue
      const current = scheduleByTicket.get(schedule.ticket_numero)
      if (!current) {
        scheduleByTicket.set(schedule.ticket_numero, schedule)
        continue
      }

      const currentDate = toDate(current.data_hora_agendada)?.getTime() ?? 0
      const nextDate = toDate(schedule.data_hora_agendada)?.getTime() ?? 0
      if (nextDate >= currentDate) {
        scheduleByTicket.set(schedule.ticket_numero, schedule)
      }
    }

    const noteByTicket = new Map<string, CitSmartNotePayload>()
    for (const note of notesResult.payload ?? []) {
      if (!note.ticket_numero) continue
      const current = noteByTicket.get(note.ticket_numero)
      if (!current) {
        noteByTicket.set(note.ticket_numero, note)
        continue
      }

      const currentDate = toDate(current.criado_em)?.getTime() ?? 0
      const nextDate = toDate(note.criado_em)?.getTime() ?? 0
      if (nextDate >= currentDate) {
        noteByTicket.set(note.ticket_numero, note)
      }
    }

    const tickets = (ticketsResult.payload ?? []).map((item) => {
      const baseTicket = toSuspendedTicket(item)
      const schedule = scheduleByTicket.get(baseTicket.number)
      const note = noteByTicket.get(baseTicket.number)

      const merged: SuspendedTicket = {
        ...baseTicket,
      }

      if (schedule?.data_hora_agendada) {
        merged.scheduledDate = schedule.data_hora_agendada
        merged.status = "Agendado"
      }

      if (note?.texto_nota) {
        merged.notes = note.texto_nota
      } else if (schedule?.observacao) {
        merged.notes = schedule.observacao
      }

      return merged
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    const details = error instanceof Error ? error.message : "Erro inesperado ao consultar CITSMART."
    return NextResponse.json({ error: "Falha ao carregar relatório do CITSMART.", details }, { status: 500 })
  }
}
