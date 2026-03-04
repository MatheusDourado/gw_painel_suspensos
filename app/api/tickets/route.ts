import { citSmartRequest, createCitSmartSession } from "@/lib/citsmart";
import { createRequestLogger, toErrorLogMeta } from "@/lib/logger";
import type { SuspendedTicket } from "@/lib/tickets";
import { NextResponse } from "next/server";

type CitSmartTicketPayload = {
    data_abertura?: string;
    data_abertura_str?: string;
    projeto?: string;
    ticket?: string;
    motivo_suspensao?: string;
    analista?: string;
    equipe?: string;
    status?: string;
    semalteracao_48hs?: string;
    diff_ultima_atualizacao?: string;
};

type CitSmartSchedulePayload = {
    id_agendamento?: number;
    ticket_numero?: string;
    data_hora_agendada?: string;
    observacao?: string;
    tipo_servico?: string;
};

type CitSmartNotePayload = {
    id_nota?: number;
    ticket_numero?: string;
    id_agendamento?: number;
    texto_nota?: string;
    criado_em?: string;
    criado_por?: string;
    tipo_nota?: string;
    origem?: string;
};

type CitSmartResponse<T> = {
    status?: string;
    code?: string;
    message?: string;
    payload?: T[];
};

type CitSmartFlowVariable = {
    name?: string;
    variableType?: string;
    value?: unknown;
};

type CitSmartFlowResponse = {
    outputVariables?: CitSmartFlowVariable[];
};

const toDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const parseFlowOutputArray = <T>(
    response: CitSmartFlowResponse,
    variableName: string,
): T[] => {
    const output = response.outputVariables?.find(
        (variable) => variable.name === variableName,
    );

    if (!output || output.value == null) return [];

    if (Array.isArray(output.value)) {
        return output.value as T[];
    }

    if (typeof output.value === "string") {
        let parsed: unknown;
        try {
            parsed = JSON.parse(output.value);
        } catch {
            throw new Error(
                `A variavel ${variableName} do fluxo CITSMART nao contem JSON valido.`,
            );
        }

        if (!Array.isArray(parsed)) {
            throw new Error(
                `A variavel ${variableName} do fluxo CITSMART nao retornou uma lista.`,
            );
        }
        return parsed as T[];
    }

    throw new Error(
        `A variavel ${variableName} do fluxo CITSMART retornou formato nao suportado.`,
    );
};

const calculateDaysOpen = (openedAt: Date) => {
    const now = new Date();
    const diff = Math.floor(
        (now.getTime() - openedAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.max(0, diff);
};

const toSuspendedTicket = (item: CitSmartTicketPayload): SuspendedTicket => {
    const openedAt =
        toDate(item.data_abertura_str) ??
        toDate(item.data_abertura) ??
        new Date();
    const slaDeadline = new Date(openedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const titleSource = item.motivo_suspensao
        ?.split("\n")
        .find((line) => line.trim().length > 0);

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
        semalteracao_48hs: item.semalteracao_48hs ?? "N/A",
        diff_ultima_atualizacao: item.diff_ultima_atualizacao ?? "N/A"
    };
};

export async function GET(request: Request) {
    const logger = createRequestLogger("API_TICKETS_GET", request);
    try {
        logger.info("Iniciando consulta de tickets no CITSMART.");
        const session = await createCitSmartSession();
        logger.debug("Sessão CITSMART criada.");

        const [ticketsResult, schedulesResult, notesResult] = await Promise.all(
            [
                citSmartRequest<CitSmartFlowResponse>({
                    session,
                    path: "/cit-esi-web/rest/esi/start.json",
                    method: "POST",
                    body: {
                        flowName: "execucao_sql_banconoc",
                        inputMap: {
                            _sql: "SELECT * FROM view_unificada_tickets_suspenso_cco",
                        },
                    },
                }),
                citSmartRequest<CitSmartResponse<CitSmartSchedulePayload>>({
                    session,
                    path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_agendamento.json",
                }),
                citSmartRequest<CitSmartResponse<CitSmartNotePayload>>({
                    session,
                    path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota.json",
                }),
            ],
        );
        logger.debug("Dados brutos recebidos do CITSMART.", {
            scheduleCount: schedulesResult.payload?.length ?? 0,
            noteCount: notesResult.payload?.length ?? 0,
            flowOutputCount: ticketsResult.outputVariables?.length ?? 0,
        });

        const scheduleByTicket = new Map<string, CitSmartSchedulePayload>();
        for (const schedule of schedulesResult.payload ?? []) {
            if (!schedule.ticket_numero) continue;
            const current = scheduleByTicket.get(schedule.ticket_numero);
            if (!current) {
                scheduleByTicket.set(schedule.ticket_numero, schedule);
                continue;
            }

            const currentDate =
                toDate(current.data_hora_agendada)?.getTime() ?? 0;
            const nextDate =
                toDate(schedule.data_hora_agendada)?.getTime() ?? 0;
            if (nextDate >= currentDate) {
                scheduleByTicket.set(schedule.ticket_numero, schedule);
            }
        }

        const ticketsPayload = parseFlowOutputArray<CitSmartTicketPayload>(
            ticketsResult,
            "_response",
        );
        logger.debug("Payload de tickets processado.", {
            ticketPayloadCount: ticketsPayload.length,
        });
        const tickets = ticketsPayload.map((item) => {
            const baseTicket = toSuspendedTicket(item);
            const schedule = scheduleByTicket.get(baseTicket.number);

            const allNotes = (notesResult.payload ?? [])
                .filter((n) => n.ticket_numero === baseTicket.number)
                .map((n) => ({
                    id: n.id_nota,
                    text: n.texto_nota ?? "",
                    author: n.criado_por ?? "Sistema",
                    type: n.tipo_nota ?? "interna",
                    createdAt: n.criado_em ?? new Date().toISOString(),
                    origin: n.origem,
                    scheduleId: n.id_agendamento,
                }))
                .sort((a, b) => {
                    const dateA = toDate(a.createdAt)?.getTime() ?? 0;
                    const dateB = toDate(b.createdAt)?.getTime() ?? 0;
                    return dateB - dateA;
                });

            if (schedule?.observacao) {
                const scheduleNoteExists = allNotes.some(
                    (n) => n.text === schedule.observacao,
                );
                if (!scheduleNoteExists) {
                    allNotes.unshift({
                        id: undefined,
                        text: schedule.observacao,
                        author: "Agendamento",
                        type: "agendamento",
                        createdAt:
                            schedule.data_hora_agendada ??
                            new Date().toISOString(),
                        origin: "agendamento",
                        scheduleId: schedule.id_agendamento,
                    });
                }
            }

            const merged: SuspendedTicket = {
                ...baseTicket,
                notesList: allNotes,
            };

            if (schedule?.data_hora_agendada) {
                merged.scheduledDate = schedule.data_hora_agendada;
                merged.status = "Agendado";
            }

            if (typeof schedule?.id_agendamento === "number") {
                merged.scheduleId = schedule.id_agendamento;
            }

            if (schedule?.tipo_servico) {
                merged.scheduleServiceType = schedule.tipo_servico;
            }

            if (schedule?.observacao) {
                merged.scheduleObservation = schedule.observacao;
            }

            const scheduleNote = allNotes.find(
                (note) =>
                    note.origin?.toLowerCase() === "agendamento" &&
                    (!merged.scheduleId || note.scheduleId === merged.scheduleId),
            );
            if (typeof scheduleNote?.id === "number") {
                merged.scheduleNoteId = scheduleNote.id;
            }

            if (allNotes.length > 0) {
                merged.notes = allNotes[0].text;
            } else if (schedule?.observacao) {
                merged.notes = schedule.observacao;
            }

            return merged;
        });
        logger.info("Consulta de tickets concluída com sucesso.", {
            totalTickets: tickets.length,
        });

        return NextResponse.json({ tickets });
    } catch (error) {
        logger.error("Falha ao carregar relatório do CITSMART.", {
            error: toErrorLogMeta(error),
        });
        const details =
            error instanceof Error
                ? error.message
                : "Erro inesperado ao consultar CITSMART.";
        return NextResponse.json(
            { error: "Falha ao carregar relatório do CITSMART.", details },
            { status: 500 },
        );
    }
}
