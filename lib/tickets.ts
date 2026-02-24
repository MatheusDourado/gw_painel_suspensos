export type TicketStatus =
    | "Suspenso"
    | "Agendado"
    | "Em Atendimento"
    | "Concluido"
    | string;
export type Priority = "Critica" | "Alta" | "Media" | "Baixa" | string;

export interface Note {
    text: string;
    author: string;
    type: string;
    createdAt: string;
    origin?: string;
}

export interface SuspendedTicket {
    id: string;
    number: string;
    title: string;
    environment: string;
    priority: Priority;
    suspensionReason: string;
    status: TicketStatus;
    suspendedAt: string;
    scheduledDate?: string;
    daysOpen: number;
    analyst: string;
    client: string;
    slaDeadline: string;
    notes?: string;
    notesList?: Note[];
    semalteracao_48hs?: string;
    diff_ultima_atualizacao?: string;
}

export const getEnvironments = (tickets: SuspendedTicket[]) => {
    const unique = new Set<string>();
    for (const ticket of tickets) {
        if (ticket.environment) {
            unique.add(ticket.environment);
        }
    }
    return Array.from(unique).sort();
};

export const getStatsByEnvironment = (tickets: SuspendedTicket[]) => {
    const environments = getEnvironments(tickets);
    return environments.map((env) => ({
        name: env,
        total: tickets.filter((t) => t.environment === env).length,
        critical: tickets.filter(
            (t) =>
                t.environment === env &&
                normalizePriority(t.priority) === "critica",
        ).length,
        scheduled: tickets.filter(
            (t) =>
                t.environment === env &&
                normalizeStatus(t.status) === "agendado",
        ).length,
    }));
};

export const getStatsByReason = (tickets: SuspendedTicket[]) => {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
        const reason = ticket.suspensionReason || "Sem motivo";
        counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({
        name,
        value,
    }));
};

export const getStatsByPriority = (tickets: SuspendedTicket[]) => {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
        const priority = normalizePriorityLabel(ticket.priority);
        counts.set(priority, (counts.get(priority) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({
        name,
        value,
    }));
};

export const getTimelineData = (tickets: SuspendedTicket[]) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * dayMs);
        const label = date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
        });
        return { date, label };
    });

    return days.map(({ date, label }) => {
        const sameDay = (d: Date) =>
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate();

        const suspensos = tickets.filter((t) =>
            sameDay(new Date(t.suspendedAt)),
        ).length;
        const agendados = tickets.filter(
            (t) =>
                t.scheduledDate &&
                sameDay(new Date(t.scheduledDate)) &&
                normalizeStatus(t.status) === "agendado",
        ).length;
        const concluidos = tickets.filter(
            (t) =>
                sameDay(new Date(t.suspendedAt)) &&
                normalizeStatus(t.status) === "concluido",
        ).length;

        return { date: label, suspensos, agendados, concluidos };
    });
};

export const normalizePriority = (priority: string) => {
    return priority
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export const normalizeStatus = (status: string) => {
    return status
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

export const normalizePriorityLabel = (priority: string) => {
    const normalized = normalizePriority(priority);
    if (normalized === "critica") return "Critica";
    if (normalized === "alta") return "Alta";
    if (normalized === "media") return "Media";
    if (normalized === "baixa") return "Baixa";
    return priority || "Sem prioridade";
};

export const getMonthlyTimelineData = (tickets: SuspendedTicket[]) => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = date.toLocaleDateString("pt-BR", {
            month: "short",
            year: "numeric",
        });
        return { date, label };
    });

    return months.map(({ date, label }) => {
        const sameMonth = (d: Date) =>
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth();

        const suspensos = tickets.filter((t) =>
            sameMonth(new Date(t.suspendedAt)),
        ).length;
        const agendados = tickets.filter(
            (t) =>
                t.scheduledDate &&
                sameMonth(new Date(t.scheduledDate)) &&
                normalizeStatus(t.status) === "agendado",
        ).length;
        const concluidos = tickets.filter(
            (t) =>
                sameMonth(new Date(t.suspendedAt)) &&
                normalizeStatus(t.status) === "concluido",
        ).length;

        return { date: label, suspensos, agendados, concluidos };
    });
};
