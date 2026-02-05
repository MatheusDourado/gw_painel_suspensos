import { NextResponse } from "next/server"
import { citSmartRequest, createCitSmartSession } from "@/lib/citsmart"

type CitSmartResponse<T = unknown> = {
  status?: string
  code?: string
  message?: string
  payload?: T[]
}

type NoteBody = {
  text?: string
  type?: string
}

export async function POST(request: Request, context: { params: Promise<{ ticketNumber: string }> }) {
  try {
    const { ticketNumber } = await context.params
    const body = (await request.json()) as NoteBody
    const text = body.text?.trim()
    const type = body.type?.trim() || "interna"

    if (!ticketNumber || !text) {
      return NextResponse.json({ error: "Texto da nota é obrigatório." }, { status: 400 })
    }

    const session = await createCitSmartSession()
    const actor = process.env.CITSMART_ACTION_USER ?? process.env.CITSMART_USERNAME ?? "painel_suspensos"

    await citSmartRequest<CitSmartResponse>({
      session,
      method: "POST",
      path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota/createOrUpdate.json",
      body: {
        ticket_numero: ticketNumber,
        texto_nota: text,
        tipo_nota: type,
        origem: "painel_suspensos",
        criado_por: actor,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const details = error instanceof Error ? error.message : "Erro inesperado."
    return NextResponse.json({ error: "Falha ao salvar nota no CITSMART.", details }, { status: 500 })
  }
}
