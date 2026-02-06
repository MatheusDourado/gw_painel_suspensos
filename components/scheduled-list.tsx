"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeStatus, type SuspendedTicket } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface ScheduledListProps {
    selectedEnvironment: string | null;
    tickets: SuspendedTicket[];
}

export function ScheduledList({
    selectedEnvironment,
    tickets,
}: ScheduledListProps) {
    const scheduledTickets = tickets
        .filter(
            (t) => normalizeStatus(t.status) === "agendado" && t.scheduledDate,
        )
        .filter(
            (t) =>
                !selectedEnvironment || t.environment === selectedEnvironment,
        )
        .sort(
            (a, b) =>
                new Date(a.scheduledDate!).getTime() -
                new Date(b.scheduledDate!).getTime(),
        );

    const isToday = (date: string) => {
        const today = new Date();
        const scheduleDate = new Date(date);
        return today.toDateString() === scheduleDate.toDateString();
    };

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-success" />
                    Próximos Agendamentos
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {scheduledTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum agendamento encontrado
                    </p>
                ) : (
                    scheduledTickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            className={cn(
                                "flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50 cursor-pointer",
                                isToday(ticket.scheduledDate!) &&
                                    "border-success/50 bg-success/5",
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-lg",
                                        isToday(ticket.scheduledDate!)
                                            ? "bg-success/20"
                                            : "bg-primary/10",
                                    )}
                                >
                                    <Calendar
                                        className={cn(
                                            "h-5 w-5",
                                            isToday(ticket.scheduledDate!)
                                                ? "text-success"
                                                : "text-primary",
                                        )}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-foreground">
                                            {ticket.number}
                                        </p>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px]",
                                                normalizeStatus(
                                                    ticket.status,
                                                ) === "agendado"
                                                    ? "text-success border-success/30"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            {ticket.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-medium">
                                            {ticket.client}
                                        </span>
                                        <span>•</span>
                                        <span>{ticket.environment}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p
                                    className={cn(
                                        "text-sm font-medium",
                                        isToday(ticket.scheduledDate!)
                                            ? "text-success"
                                            : "text-foreground",
                                    )}
                                >
                                    {new Date(
                                        ticket.scheduledDate!,
                                    ).toLocaleDateString("pt-BR")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(
                                        ticket.scheduledDate!,
                                    ).toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
