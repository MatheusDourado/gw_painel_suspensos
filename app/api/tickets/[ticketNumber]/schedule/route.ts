import { NextResponse } from "next/server";
import { citSmartRequest, createCitSmartSession } from "@/lib/citsmart";

type CitSmartResponse<T = unknown> = {
    status?: string;
    code?: string;
    message?: string;
    payload?: T[];
};

type ScheduleBody = {
    date?: string;
    time?: string;
    serviceType?: string;
    notes?: string;
};

export async function POST(
    request: Request,
    context: { params: Promise<{ ticketNumber: string }> },
) {
    try {
        const { ticketNumber } = await context.params;
        const body = (await request.json()) as ScheduleBody;

        if (!ticketNumber || !body.date || !body.time || !body.serviceType) {
            return NextResponse.json(
                { error: "Dados de agendamento incompletos." },
                { status: 400 },
            );
        }

        const scheduledAt = new Date(`${body.date}T${body.time}:00`);
        if (Number.isNaN(scheduledAt.getTime())) {
            return NextResponse.json(
                { error: "Data ou horário inválido." },
                { status: 400 },
            );
        }

        const session = await createCitSmartSession();
        const actor =
            process.env.CITSMART_ACTION_USER ??
            process.env.CITSMART_USERNAME ??
            "painel_suspensos";

        await citSmartRequest<CitSmartResponse>({
            session,
            method: "POST",
            path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_agendamento/createOrUpdate.json",
            body: {
                ticket_numero: ticketNumber,
                data_hora_agendada: scheduledAt.toISOString(),
                tipo_servico: body.serviceType,
                observacao: body.notes ?? "",
                status_ticket_destino: "Agendado",
                atualizado_por: actor,
            },
        });

        if (body.notes?.trim()) {
            await citSmartRequest<CitSmartResponse>({
                session,
                method: "POST",
                path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota/createOrUpdate.json",
                body: {
                    ticket_numero: ticketNumber,
                    texto_nota: body.notes.trim(),
                    tipo_nota: "interna",
                    origem: "agendamento",
                    criado_por: actor,
                },
            });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        const details =
            error instanceof Error ? error.message : "Erro inesperado.";
        return NextResponse.json(
            { error: "Falha ao salvar agendamento no CITSMART.", details },
            { status: 500 },
        );
    }
}
