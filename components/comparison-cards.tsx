"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { normalizeStatus, type SuspendedTicket } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface ComparisonCardsProps {
    tickets: SuspendedTicket[];
    selectedEnvironment: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function ComparisonCards({
    tickets,
    selectedEnvironment,
}: ComparisonCardsProps) {
    const filteredTickets = selectedEnvironment
        ? tickets.filter((t) => t.environment === selectedEnvironment)
        : tickets;

    const now = new Date();
    const startOfCurrentWeek = new Date(
        now.setDate(now.getDate() - now.getDay()),
    );
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfCurrentWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfCurrentWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);

    const checkInWeek = (dateStr: string, start: Date, end?: Date) => {
        const date = new Date(dateStr);
        if (end) return date >= start && date <= end;
        return date >= start;
    };

    // Calculate metrics
    const currentWeekResolved = filteredTickets.filter(
        (t) =>
            normalizeStatus(t.status) === "concluido" &&
            checkInWeek(t.suspendedAt, startOfCurrentWeek), // Using suspendedAt as proxy for activity if resolved date notably missing, ideally use resolvedAt
    ).length;

    const lastWeekResolved = filteredTickets.filter(
        (t) =>
            normalizeStatus(t.status) === "concluido" &&
            checkInWeek(t.suspendedAt, startOfLastWeek, endOfLastWeek),
    ).length;

    const currentWeekNew = filteredTickets.filter((t) =>
        checkInWeek(t.suspendedAt, startOfCurrentWeek),
    ).length;

    const lastWeekNew = filteredTickets.filter((t) =>
        checkInWeek(t.suspendedAt, startOfLastWeek, endOfLastWeek),
    ).length;

    const currentWeekScheduled = filteredTickets.filter(
        (t) =>
            t.scheduledDate && checkInWeek(t.scheduledDate, startOfCurrentWeek),
    ).length;

    const lastWeekScheduled = filteredTickets.filter(
        (t) =>
            t.scheduledDate &&
            checkInWeek(t.scheduledDate, startOfLastWeek, endOfLastWeek),
    ).length;

    const getDelta = (current: number, previous: number) => {
        if (previous === 0)
            return {
                percent: current > 0 ? 100 : 0,
                direction: current > 0 ? "up" : "flat",
            };
        const diff = current - previous;
        const percent = Math.round((diff / previous) * 100);
        return {
            percent: Math.abs(percent),
            direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
        };
    };

    const metrics = [
        {
            title: "Novos Suspensos (Semanal)",
            current: currentWeekNew,
            previous: lastWeekNew,
            goodDirection: "down",
        },
        {
            title: "Agendamentos (Semanal)",
            current: currentWeekScheduled,
            previous: lastWeekScheduled,
            goodDirection: "up",
        },
        // We could add more here
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {metrics.map((metric, index) => {
                const delta = getDelta(metric.current, metric.previous);
                const isGood =
                    delta.direction === "flat"
                        ? null
                        : metric.goodDirection === delta.direction;

                return (
                    <Card key={index} className="border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {metric.title}
                                    </p>
                                    <h3 className="text-2xl font-bold mt-2">
                                        {metric.current}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        vs {metric.previous} semana passada
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "flex items-center gap-1",
                                        isGood === true &&
                                            "border-success/30 bg-success/10 text-success",
                                        isGood === false &&
                                            "border-destructive/30 bg-destructive/10 text-destructive",
                                        isGood === null &&
                                            "border-muted bg-muted/50 text-muted-foreground",
                                    )}
                                >
                                    {delta.direction === "up" && (
                                        <ArrowUp className="h-3 w-3" />
                                    )}
                                    {delta.direction === "down" && (
                                        <ArrowDown className="h-3 w-3" />
                                    )}
                                    {delta.direction === "flat" && (
                                        <Minus className="h-3 w-3" />
                                    )}
                                    {delta.percent}%
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
