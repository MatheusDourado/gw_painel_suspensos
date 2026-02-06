"use client";

import { CustomTooltip } from "@/components/custom-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getMonthlyTimelineData,
    getTimelineData,
    type SuspendedTicket,
} from "@/lib/tickets";
import { useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const CHART_COLORS = {
    suspensos: "var(--chart-1)",
    agendados: "var(--chart-2)",
    concluidos: "var(--chart-3)",
};

interface TimelineChartProps {
    tickets: SuspendedTicket[];
    selectedEnvironment: string | null;
}

export function TimelineChart({
    tickets,
    selectedEnvironment,
}: TimelineChartProps) {
    const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");

    const filteredTickets = selectedEnvironment
        ? tickets.filter((t) => t.environment === selectedEnvironment)
        : tickets;

    const data =
        period === "weekly"
            ? getTimelineData(filteredTickets)
            : getMonthlyTimelineData(filteredTickets);

    return (
        <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">
                    Evolução {period === "weekly" ? "Semanal" : "Mensal"}
                </CardTitle>
                <Select
                    value={period}
                    onValueChange={(value: "weekly" | "monthly") =>
                        setPeriod(value)
                    }
                >
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: -10,
                                bottom: 0,
                            }}
                        >
                            <defs>
                                <linearGradient
                                    id="colorSuspensos"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={CHART_COLORS.suspensos}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={CHART_COLORS.suspensos}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                                <linearGradient
                                    id="colorAgendados"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={CHART_COLORS.agendados}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={CHART_COLORS.agendados}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                                <linearGradient
                                    id="colorConcluidos"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={CHART_COLORS.concluidos}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={CHART_COLORS.concluidos}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-border"
                            />
                            <XAxis
                                dataKey="date"
                                tick={{
                                    className: "fill-muted-foreground text-xs",
                                }}
                                axisLine={{ className: "stroke-border" }}
                                tickLine={{ className: "stroke-border" }}
                            />
                            <YAxis
                                tick={{
                                    className: "fill-muted-foreground text-xs",
                                }}
                                axisLine={{ className: "stroke-border" }}
                                tickLine={{ className: "stroke-border" }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: "10px" }}
                                formatter={(value) => (
                                    <span className="text-xs text-muted-foreground">
                                        {value}
                                    </span>
                                )}
                            />
                            <Area
                                type="monotone"
                                dataKey="suspensos"
                                name="Suspensos"
                                stroke={CHART_COLORS.suspensos}
                                fillOpacity={1}
                                fill="url(#colorSuspensos)"
                            />
                            <Area
                                type="monotone"
                                dataKey="agendados"
                                name="Agendados"
                                stroke={CHART_COLORS.agendados}
                                fillOpacity={1}
                                fill="url(#colorAgendados)"
                            />
                            <Area
                                type="monotone"
                                dataKey="concluidos"
                                name="Concluídos"
                                stroke={CHART_COLORS.concluidos}
                                fillOpacity={1}
                                fill="url(#colorConcluidos)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
