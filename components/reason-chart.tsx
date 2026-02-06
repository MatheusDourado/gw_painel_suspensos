"use client";

import { PieTooltip } from "@/components/custom-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatsByReason, type SuspendedTicket } from "@/lib/tickets";
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

interface ReasonChartProps {
    tickets: SuspendedTicket[];
    selectedEnvironment: string | null;
}

type LegendEntry = {
    color?: string;
    value?: string | number;
};

const renderLegend = ({ payload }: { payload?: readonly LegendEntry[] }) => {
    if (!payload?.length) return null;

    return (
        <div className="mt-2 max-h-24 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {payload.map((item) => (
                    <div
                        key={String(item.value)}
                        className="flex max-w-[220px] items-center gap-2"
                    >
                        <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span
                            className="truncate text-xs text-muted-foreground"
                            title={String(item.value ?? "")}
                        >
                            {String(item.value ?? "")}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export function ReasonChart({
    tickets,
    selectedEnvironment,
}: ReasonChartProps) {
    const filteredTickets = selectedEnvironment
        ? tickets.filter((t) => t.environment === selectedEnvironment)
        : tickets;
    const data = getStatsByReason(filteredTickets);

    return (
        <Card className="border-border bg-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Motivos de Suspensão
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="42%"
                                innerRadius={56}
                                outerRadius={86}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${entry.name}-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                content={renderLegend}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
