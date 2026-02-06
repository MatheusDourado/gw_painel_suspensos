"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomTooltip, PieTooltip } from "@/components/custom-tooltip";
import {
    getStatsByPriority,
    getTimelineData,
    normalizeStatus,
    type SuspendedTicket,
} from "@/lib/tickets";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

const DAY_MS = 24 * 60 * 60 * 1000;

interface AnalyticsViewProps {
    tickets: SuspendedTicket[];
}

const getDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const inRange = (value: Date | null, from: number, to: number) => {
    if (!value) return false;
    const time = value.getTime();
    return time >= from && time <= to;
};

const getPercentDelta = (current: number, previous: number) => {
    if (current === 0 && previous === 0) return { label: "0%", up: null };
    if (previous === 0) return { label: "+100%", up: true };
    const percent = Math.round(((current - previous) / previous) * 100);
    if (percent === 0) return { label: "0%", up: null };
    return { label: `${percent > 0 ? "+" : ""}${percent}%`, up: percent > 0 };
};

export function AnalyticsView({ tickets }: AnalyticsViewProps) {
    const priorityData = getStatsByPriority(tickets);
    const timelineData = getTimelineData(tickets);

    const analystPerformance = Array.from(
        new Set(tickets.map((ticket) => ticket.analyst)),
    )
        .map((analyst) => ({
            name: analyst,
            total: tickets.filter((ticket) => ticket.analyst === analyst)
                .length,
            scheduled: tickets.filter(
                (ticket) =>
                    ticket.analyst === analyst &&
                    normalizeStatus(ticket.status) === "agendado",
            ).length,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    const totalTickets = tickets.length || 1;
    const scheduledTickets = tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "agendado",
    ).length;
    const schedulingRate = Math.round((scheduledTickets / totalTickets) * 100);
    const averageDays = (
        tickets.reduce(
            (accumulator, ticket) => accumulator + ticket.daysOpen,
            0,
        ) / totalTickets
    ).toFixed(1);

    const now = Date.now();
    const currentStart = now - 7 * DAY_MS;
    const previousStart = now - 14 * DAY_MS;

    const currentScheduled = tickets.filter(
        (ticket) =>
            normalizeStatus(ticket.status) === "agendado" &&
            inRange(getDate(ticket.scheduledDate), currentStart, now),
    ).length;

    const previousScheduled = tickets.filter(
        (ticket) =>
            normalizeStatus(ticket.status) === "agendado" &&
            inRange(getDate(ticket.scheduledDate), previousStart, currentStart),
    ).length;

    const currentAvg =
        tickets
            .filter((ticket) =>
                inRange(getDate(ticket.suspendedAt), currentStart, now),
            )
            .reduce((accumulator, ticket) => accumulator + ticket.daysOpen, 0) /
        (tickets.filter((ticket) =>
            inRange(getDate(ticket.suspendedAt), currentStart, now),
        ).length || 1);

    const previousAvg =
        tickets
            .filter((ticket) =>
                inRange(
                    getDate(ticket.suspendedAt),
                    previousStart,
                    currentStart,
                ),
            )
            .reduce((accumulator, ticket) => accumulator + ticket.daysOpen, 0) /
        (tickets.filter((ticket) =>
            inRange(getDate(ticket.suspendedAt), previousStart, currentStart),
        ).length || 1);

    const schedulingDelta = getPercentDelta(
        currentScheduled,
        previousScheduled,
    );
    const avgDelta = getPercentDelta(
        Number(currentAvg.toFixed(1)),
        Number(previousAvg.toFixed(1)),
    );

    const metrics = [
        {
            title: "Taxa de Agendamento",
            value: `${schedulingRate}%`,
            icon: TrendingUp,
            delta: schedulingDelta,
            goodWhenUp: true,
        },
        {
            title: "Tempo Médio Suspensão",
            value: `${averageDays} dias`,
            icon: Clock,
            delta: avgDelta,
            goodWhenUp: false,
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {metrics.map((metric) => (
                    <Card key={metric.title} className="border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-primary/10 p-2">
                                        <metric.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            {metric.title}
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {metric.value}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    className={
                                        metric.delta.up === null
                                            ? "border-0 bg-muted text-muted-foreground"
                                            : metric.delta.up ===
                                                metric.goodWhenUp
                                              ? "border-0 bg-success/20 text-success"
                                              : "border-0 bg-destructive/20 text-destructive"
                                    }
                                >
                                    {metric.delta.up === false && (
                                        <TrendingDown className="mr-1 h-3 w-3" />
                                    )}
                                    {metric.delta.up === true && (
                                        <TrendingUp className="mr-1 h-3 w-3" />
                                    )}
                                    {metric.delta.label}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">
                            Distribuição por Prioridade
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={92}
                                        dataKey="value"
                                    >
                                        {priorityData.map((item, index) => (
                                            <Cell
                                                key={`${item.name}-${index}`}
                                                fill={
                                                    COLORS[
                                                        index % COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        formatter={(value) => (
                                            <span className="text-xs text-muted-foreground">
                                                {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">
                            Tendência Semanal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={timelineData}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -10,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-border"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{
                                            className:
                                                "fill-muted-foreground text-xs",
                                        }}
                                        axisLine={{
                                            className: "stroke-border",
                                        }}
                                        tickLine={{
                                            className: "stroke-border",
                                        }}
                                    />
                                    <YAxis
                                        tick={{
                                            className:
                                                "fill-muted-foreground text-xs",
                                        }}
                                        axisLine={{
                                            className: "stroke-border",
                                        }}
                                        tickLine={{
                                            className: "stroke-border",
                                        }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        formatter={(value) => (
                                            <span className="text-xs text-muted-foreground">
                                                {value}
                                            </span>
                                        )}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="suspensos"
                                        name="Suspensos"
                                        stroke={COLORS[0]}
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="agendados"
                                        name="Agendados"
                                        stroke={COLORS[1]}
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="concluidos"
                                        name="Concluídos"
                                        stroke={COLORS[2]}
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                        Performance por Analista
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={analystPerformance}
                                layout="vertical"
                                margin={{
                                    top: 10,
                                    right: 20,
                                    left: 10,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-border"
                                />
                                <XAxis
                                    type="number"
                                    tick={{
                                        className:
                                            "fill-muted-foreground text-xs",
                                    }}
                                    axisLine={{ className: "stroke-border" }}
                                    tickLine={{ className: "stroke-border" }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={140}
                                    tick={{
                                        className:
                                            "fill-muted-foreground text-xs",
                                    }}
                                    axisLine={{ className: "stroke-border" }}
                                    tickLine={{ className: "stroke-border" }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    formatter={(value) => (
                                        <span className="text-xs text-muted-foreground">
                                            {value}
                                        </span>
                                    )}
                                />
                                <Bar
                                    dataKey="total"
                                    name="Total"
                                    fill={COLORS[0]}
                                    radius={[0, 4, 4, 0]}
                                />
                                <Bar
                                    dataKey="scheduled"
                                    name="Agendados"
                                    fill={COLORS[1]}
                                    radius={[0, 4, 4, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
