"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
    normalizeStatus,
    type SuspendedTicket,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";
import {
    Calendar,
    Ticket,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

interface KPICardsProps {
    selectedEnvironment: string | null;
    tickets: SuspendedTicket[];
}

type Delta = {
    direction: "up" | "down" | "flat";
    label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const inRange = (value: Date | null, from: number, to: number) => {
    if (!value) return false;
    const time = value.getTime();
    return time >= from && time <= to;
};

const getDelta = (current: number, previous: number): Delta => {
    if (current === 0 && previous === 0)
        return { direction: "flat", label: "0%" };
    if (previous === 0) return { direction: "up", label: "+100%" };

    const percent = ((current - previous) / previous) * 100;
    if (Math.abs(percent) < 0.5) return { direction: "flat", label: "0%" };

    const rounded = Math.round(percent);
    return {
        direction: rounded > 0 ? "up" : "down",
        label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    };
};

const getDeltaClass = (delta: Delta, increaseIsGood: boolean) => {
    if (delta.direction === "flat") return "text-muted-foreground";
    if (delta.direction === "up")
        return increaseIsGood ? "text-success" : "text-destructive";
    return increaseIsGood ? "text-destructive" : "text-success";
};

export function KPICards({ selectedEnvironment, tickets }: KPICardsProps) {
	const filteredTickets = selectedEnvironment
		? tickets.filter((ticket) => ticket.environment === selectedEnvironment)
		: tickets;

	const now = new Date();
	const currentStart = now.getTime() - 7 * DAY_MS;
	const previousStart = now.getTime() - 14 * DAY_MS;

	// KPI 1 & 2 Logic (Total & Agendados)
	const openedCurrent = filteredTickets.filter((ticket) =>
		inRange(toDate(ticket.suspendedAt), currentStart, now.getTime()),
	);
	const openedPrevious = filteredTickets.filter((ticket) =>
		inRange(toDate(ticket.suspendedAt), previousStart, currentStart),
	);

	const scheduledCurrent = filteredTickets.filter(
		(ticket) =>
			normalizeStatus(ticket.status) === 'agendado' &&
			inRange(
				toDate(ticket.scheduledDate),
				currentStart,
				now.getTime(),
			),
	);
	const scheduledPrevious = filteredTickets.filter(
		(ticket) =>
			normalizeStatus(ticket.status) === 'agendado' &&
			inRange(
				toDate(ticket.scheduledDate),
				previousStart,
				currentStart,
			),
	);

	// KPI 3 & 4 Logic (ComparisonCards merge)
	const startOfCurrentWeek = new Date(now);
	startOfCurrentWeek.setDate(now.getDate() - now.getDay());
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

	const currentWeekNew = filteredTickets.filter((t) =>
		checkInWeek(t.suspendedAt, startOfCurrentWeek),
	).length;

	const lastWeekNew = filteredTickets.filter((t) =>
		checkInWeek(t.suspendedAt, startOfLastWeek, endOfLastWeek),
	).length;

	const currentWeekScheduledWeek = filteredTickets.filter(
		(t) =>
			t.scheduledDate &&
			checkInWeek(t.scheduledDate, startOfCurrentWeek),
	).length;

	const lastWeekScheduledWeek = filteredTickets.filter(
		(t) =>
			t.scheduledDate &&
			checkInWeek(t.scheduledDate, startOfLastWeek, endOfLastWeek),
	).length;

	const kpis = [
		{
			title: 'Total Suspensos',
			value: filteredTickets.length,
			delta: getDelta(openedCurrent.length, openedPrevious.length),
			increaseIsGood: false,
			icon: Ticket,
			color: 'text-primary',
			bgColor: 'bg-primary/10',
		},
		{
			title: 'Agendados',
			value: filteredTickets.filter(
				(ticket) => normalizeStatus(ticket.status) === 'agendado',
			).length,
			delta: getDelta(scheduledCurrent.length, scheduledPrevious.length),
			increaseIsGood: true,
			icon: Calendar,
			color: 'text-success',
			bgColor: 'bg-success/10',
		},
		{
			title: 'Novos Suspensos (Semanal)',
			value: currentWeekNew,
			delta: getDelta(currentWeekNew, lastWeekNew),
			increaseIsGood: false,
			icon: TrendingDown, 
			color: 'text-destructive', 
			bgColor: 'bg-destructive/10',
		},
		{
			title: 'Agendamentos (Semanal)',
			value: currentWeekScheduledWeek,
			delta: getDelta(currentWeekScheduledWeek, lastWeekScheduledWeek),
			increaseIsGood: true,
			icon: TrendingUp,
			color: 'text-success', 
			bgColor: 'bg-success/10',
		},
	];

	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
			{kpis.map((kpi) => (
				<Card key={kpi.title} className="border-border bg-card">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div
								className={cn(
									'rounded-lg p-2',
									kpi.bgColor,
								)}
							>
								<kpi.icon
									className={cn(
										'h-5 w-5',
										kpi.color,
									)}
								/>
							</div>
							<div
								className={cn(
									'flex items-center gap-1 text-xs font-medium',
									getDeltaClass(
										kpi.delta,
										kpi.increaseIsGood,
									),
								)}
							>
								{kpi.delta.direction === 'up' && (
									<TrendingUp className="h-3 w-3" />
								)}
								{kpi.delta.direction === 'down' && (
									<TrendingDown className="h-3 w-3" />
								)}
								<span>{kpi.delta.label}</span>
							</div>
						</div>
						<div className="mt-3">
							<p className="text-2xl font-bold text-foreground">
								{kpi.value}
							</p>
							<p className="text-sm text-muted-foreground">
								{kpi.title}
							</p>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
