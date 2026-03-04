import { NextResponse } from "next/server";
import { citSmartRequest, createCitSmartSession } from "@/lib/citsmart";
import { createRequestLogger, toErrorLogMeta } from "@/lib/logger";

type CitSmartResponse<T = unknown> = {
    status?: string;
    code?: string;
    message?: string;
    payload?: T[] | T;
};

type NoteBody = {
    text?: string;
    type?: string;
    origin?: string;
    noteId?: number | string;
    scheduleId?: number | string;
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

export async function POST(
    request: Request,
    context: { params: Promise<{ ticketNumber: string }> },
) {
    const logger = createRequestLogger("API_TICKET_NOTES_POST", request);
    try {
        const { ticketNumber } = await context.params;
        const body = (await request.json()) as NoteBody;
        const text = body.text?.trim();
        const type = body.type?.trim() || "interna";
        const origin = body.origin?.trim() || "painel_suspensos";
        const noteId = toOptionalNumber(body.noteId);
        const scheduleId = toOptionalNumber(body.scheduleId);
        logger.info("Requisição de nota recebida.", {
            ticketNumber,
            hasText: Boolean(text),
            type,
            origin,
            noteId: noteId ?? null,
            scheduleId: scheduleId ?? null,
        });

        if (!ticketNumber || !text) {
            logger.warn("Requisição inválida para nota.", {
                ticketNumber,
                hasText: Boolean(text),
            });
            return NextResponse.json(
                { error: "Texto da nota é obrigatório." },
                { status: 400 },
            );
        }

        const session = await createCitSmartSession();
        const actor =
            process.env.CITSMART_ACTION_USER ??
            process.env.CITSMART_USERNAME ??
            "painel_suspensos";
        logger.debug("Sessão CITSMART criada para nota.", {
            ticketNumber,
            actor,
        });

        await citSmartRequest<CitSmartResponse>({
            session,
            method: "POST",
            path: "/cit-esi-web/rest/dynamic/relatorios/gw_ticket_nota/createOrUpdate.json",
            body: {
                ...(noteId ? { id_nota: noteId } : {}),
                ...(scheduleId ? { id_agendamento: scheduleId } : {}),
                ticket_numero: ticketNumber,
                texto_nota: text,
                tipo_nota: type,
                origem: origin,
                criado_por: actor,
            },
        });
        logger.info("Nota salva/atualizada com sucesso.", {
            ticketNumber,
            noteId: noteId ?? null,
            scheduleId: scheduleId ?? null,
        });

        return NextResponse.json({ ok: true, noteId });
    } catch (error) {
        logger.error("Falha ao salvar nota no CITSMART.", {
            error: toErrorLogMeta(error),
        });
        const details =
            error instanceof Error ? error.message : "Erro inesperado.";
        return NextResponse.json(
            { error: "Falha ao salvar nota no CITSMART.", details },
            { status: 500 },
        );
    }
}
