"use client";

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
    }>;
    label?: string;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
            {label && (
                <p className="mb-2 font-medium text-popover-foreground">
                    {label}
                </p>
            )}
            <div className="space-y-1">
                {payload.map((entry, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                    >
                        <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                            {entry.name}:
                        </span>
                        <span className="font-medium text-popover-foreground">
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface PieTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        payload: {
            fill: string;
        };
    }>;
}

export function PieTooltip({ active, payload }: PieTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0];
    return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
                <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: data.payload.fill }}
                />
                <span className="text-muted-foreground">{data.name}:</span>
                <span className="font-medium text-popover-foreground">
                    {data.value}
                </span>
            </div>
        </div>
    );
}
