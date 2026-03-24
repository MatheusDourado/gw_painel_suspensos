import { NextResponse } from "next/server";
import { citSmartRequest, createCitSmartSession } from "@/lib/citsmart";
import { createRequestLogger, toErrorLogMeta } from "@/lib/logger";

type CitSmartResponse<T = unknown> = {
    status?: string;
    code?: string;
    message?: string;
    payload?: T[] | T;
};

type CitSmartSchedulePayload = {
    id_agendamento?: number;
    ticket_numero?: string;
    data_hora_agendada?: string;
};

type CitSmartNotePayload = {
    id_nota?: number;
    ticket_numero?: string;
    id_agendamento?: number;
    origem?: string;
    criado_em?: string;
};

type ScheduleBody = {
    date?: string;
    time?: string;
    serviceType?: string;
    notes?: string;
    scheduleId?: number | string;
    scheduleNoteId?: number | string;
};

const toOptionalNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
};

const toPayloadArray = <T>(payload: T[] | T | undefined): T[] => {
    if (Array.isArray(payload)) return payload;
    if (payload) return [payload];
    return [];
};

const toTimestamp = (value?: string) => {
    if (!value) return 0;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 0;
    return parsed.getTime();
};

const nowFormatted = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const pickLatestSchedule = (
    payload: CitSmartSchedulePayload[],
    ticketNumber: string,
) => {
    const schedules = payload.filter((item) => item.ticket_numero === ticketNumber);
    return schedules.reduce<CitSmartSchedulePayload | undefined>(
        (current, schedule) => {
            if (!current) return schedule;
            const currentDate = toTimestamp(current.data_hora_agendada);
            const nextDate = toTimestamp(schedule.data_hora_agendada);
            if (nextDate > currentDate) return schedule;
            if (nextDate < currentDate) return current;
            const currentId = current.id_agendamento ?? 0;
            const nextId = schedule.id_agendamento ?? 0;
            return nextId >= currentId ? schedule : current;
        },
        undefined,
    );
};

const pickLatestScheduleNote = (
    payload: CitSmartNotePayload[],
    ticketNumber: string,
    scheduleId?: number,
) => {
    const notes = payload.filter((item) => {
        if (item.ticket_numero !== ticketNumber) return false;
        if ((item.origem ?? "").toLowerCase() !== "agendamento") return false;
        if (scheduleId && item.id_agendamento !== scheduleId) return false;
        return true;
    });

    return notes.reduce<CitSmartNotePayload | undefined>((current, note) => {
        if (!current) return note;
        const currentDate = toTimestamp(current.criado_em);
        const nextDate = toTimestamp(note.criado_em);
        if (nextDate > currentDate) return note;
        if (nextDate < currentDate) return current;
        const currentId = current.id_nota ?? 0;
        const nextId = note.id_nota ?? 0;
        return nextId >= currentId ? note : current;
    }, undefined);
};

export async function POST(
    request: Request,
    context: { params: Promise<{ ticketNumber: string }> },
) {
    const logger = createRequestLogger("API_TICKET_SCHEDULE_POST", request);
    try {
        const { ticketNumber } = await context.params;
        const body = (await request.json()) as ScheduleBody;
        logger.info("Requisição de agendamento recebida.", {
            ticketNumber,
            hasNotes: Boolean(body.notes?.trim()),
            hasScheduleId: body.scheduleId != null,
            hasScheduleNoteId: body.scheduleNoteId != null,
            date: body.date,
            time: body.time,
            serviceType: body.serviceType,
        });

        if (!ticketNumber || !body.date || !body.time || !body.serviceType) {
            logger.warn("Requisição inválida para agendamento.", {
                ticketNumber,
                date: body.date,
                time: body.time,
                serviceType: body.serviceType,
            });
            return NextResponse.json(
                { error: "Dados de agendamento incompletos." },
                { status: 400 },
            );
        }

        // Valida o formato sem criar um objeto Date (evita conversão de timezone)
        const localDateTimeStr = `${body.date}T${body.time}:00`;
        const scheduledAt = new Date(localDateTimeStr);
        if (Number.isNaN(scheduledAt.getTime())) {
            logger.warn("Data/hora inválida para agendamento.", {
                ticketNumber,
                date: body.date,
                time: body.time,
            });
            return NextResponse.json(
                { error: "Data ou horário inválido." },
                { status: 400 },
            );
        }
        // Usa a string local diretamente (sem .toISOString() que converte para UTC e
        // acrescenta 3h em servidores configurados em UTC quando o usuário está em UTC-3).
        // Formato PostgreSQL: 'yyyy-mm-dd hh:mm:ss' (espaço no lugar do T)
        const scheduledAtFormatted = localDateTimeStr.replace("T", " ");

        const session = await createCitSmartSession();
        const actor =
            process.env.CITSMART_ACTION_USER ??
            process.env.CITSMART_USERNAME ??
            "painel_suspensos";
        logger.debug("Sessão CITSMART criada para salvar agendamento.", {
            ticketNumber,
            actor,
        });

        let scheduleId = toOptionalNumber(body.scheduleId);
        if (!scheduleId) {
            logger.debug("Buscando agendamento existente no CITSMART.", {
                ticketNumber,
            });
            const schedulesResult =
                await citSmartRequest<CitSmartResponse<CitSmartSchedulePayload>>({
                    session,
                    path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_agendamento.json",
                });
            const currentSchedule = pickLatestSchedule(
                toPayloadArray(schedulesResult.payload),
                ticketNumber,
            );
            scheduleId = currentSchedule?.id_agendamento;
            logger.debug("Agendamento existente identificado.", {
                ticketNumber,
                scheduleId: scheduleId ?? null,
            });
        }

        const now = nowFormatted();
        const scheduleSaveResponse =
            await citSmartRequest<CitSmartResponse<CitSmartSchedulePayload>>({
                session,
                method: "POST",
                path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_agendamento/createOrUpdate.json",
                body: {
                    ...(scheduleId ? { id_agendamento: scheduleId } : {}),
                    ticket_numero: ticketNumber,
                    data_hora_agendada: scheduledAtFormatted,
                    tipo_servico: body.serviceType,
                    observacao: body.notes ?? "",
                    status_ticket_destino: "Agendado",
                    ...(!scheduleId
                        ? { criado_por: actor, criado_em: now }
                        : {}),
                    atualizado_por: actor,
                    atualizado_em: now,
                    ativo: true,
                },
            });

        const savedSchedule =
            toPayloadArray(scheduleSaveResponse.payload)[0];
        const effectiveScheduleId = scheduleId ?? savedSchedule?.id_agendamento;
        logger.info("Agendamento salvo/atualizado.", {
            ticketNumber,
            effectiveScheduleId: effectiveScheduleId ?? null,
            updated: Boolean(scheduleId),
        });

        if (body.notes?.trim()) {
            let scheduleNoteId = toOptionalNumber(body.scheduleNoteId);
            if (!scheduleNoteId) {
                logger.debug("Buscando nota de agendamento existente.", {
                    ticketNumber,
                    effectiveScheduleId: effectiveScheduleId ?? null,
                });
                const notesResult =
                    await citSmartRequest<CitSmartResponse<CitSmartNotePayload>>({
                        session,
                        path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota.json",
                    });
                const currentNote = pickLatestScheduleNote(
                    toPayloadArray(notesResult.payload),
                    ticketNumber,
                    effectiveScheduleId,
                );
                scheduleNoteId = currentNote?.id_nota;
                logger.debug("Nota de agendamento identificada.", {
                    ticketNumber,
                    scheduleNoteId: scheduleNoteId ?? null,
                });
            }

            await citSmartRequest<CitSmartResponse<CitSmartNotePayload>>({
                session,
                method: "POST",
                path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota/createOrUpdate.json",
                body: {
                    ...(scheduleNoteId ? { id_nota: scheduleNoteId } : {}),
                    ...(effectiveScheduleId
                        ? { id_agendamento: effectiveScheduleId }
                        : {}),
                    ticket_numero: ticketNumber,
                    texto_nota: body.notes.trim(),
                    tipo_nota: "interna",
                    origem: "agendamento",
                    ...(!scheduleNoteId
                        ? { criado_por: actor, criado_em: now }
                        : {}),
                    atualizado_por: actor,
                    atualizado_em: now,
                },
            });
            logger.info("Nota vinculada ao agendamento salva/atualizada.", {
                ticketNumber,
                effectiveScheduleId: effectiveScheduleId ?? null,
                scheduleNoteId: scheduleNoteId ?? null,
            });
        }

        return NextResponse.json({
            ok: true,
            scheduleId: effectiveScheduleId,
        });
    } catch (error) {
        logger.error("Falha ao salvar agendamento no CITSMART.", {
            error: toErrorLogMeta(error),
        });
        const details =
            error instanceof Error ? error.message : "Erro inesperado.";
        return NextResponse.json(
            { error: "Falha ao salvar agendamento no CITSMART.", details },
            { status: 500 },
        );
    }
}
