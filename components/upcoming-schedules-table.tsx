"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { normalizeStatus, type SuspendedTicket } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Calendar, Clock, Server, User } from "lucide-react";

interface UpcomingSchedulesTableProps {
    tickets: SuspendedTicket[];
    selectedEnvironment: string | null;
}

export function UpcomingSchedulesTable({
	tickets,
	selectedEnvironment,
}: UpcomingSchedulesTableProps) {
	const filteredTickets = tickets
		.filter((ticket) => {
			if (
				selectedEnvironment &&
				ticket.environment !== selectedEnvironment
			) {
				return false;
			}

			const isScheduled =
				normalizeStatus(ticket.status) === 'agendado' ||
				Boolean(ticket.scheduledDate);

			return isScheduled;
		})
		.sort((a, b) => {
			const dateA = a.scheduledDate
				? new Date(a.scheduledDate).getTime()
				: 0;
			const dateB = b.scheduledDate
				? new Date(b.scheduledDate).getTime()
				: 0;
			// Ascending order (next appointments first)
			return dateA - dateB;
		});

	const isOverdue = (date?: string | null, status?: string) => {
		if (!date) return false;
		if (normalizeStatus(status || '') === 'concluido') return false;
		return new Date(date) < new Date();
	};

	return (
		<div className="rounded-md border border-border bg-card">
			<div className="p-4 border-b border-border">
				<p className="text-sm text-muted-foreground">
					Lista de chamados agendados ordenada por data
				</p>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Data/Hora</TableHead>
						<TableHead>Ticket</TableHead>
						<TableHead>Cliente/Ambiente</TableHead>
						<TableHead>Analista</TableHead>
						<TableHead>Motivo</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredTickets.length === 0 ? (
						<TableRow>
							<TableCell colSpan={5} className="h-24 text-center">
								Nenhum agendamento encontrado.
							</TableCell>
						</TableRow>
					) : (
						filteredTickets.map((ticket) => {
							const scheduleDate = ticket.scheduledDate
								? new Date(ticket.scheduledDate)
								: null;
							const overdue = isOverdue(
								ticket.scheduledDate,
								ticket.status,
							);

							return (
								<TableRow
									key={ticket.id}
									className={cn(
										overdue && 'bg-destructive/10',
									)}
								>
									<TableCell>
										<div className="flex flex-col gap-1">
											{scheduleDate ? (
												<>
													<div
														className={cn(
															'flex items-center gap-1 font-medium',
															overdue
																? 'text-destructive'
																: 'text-primary',
														)}
													>
														<Calendar className="h-3 w-3" />
														{format(
															scheduleDate,
															'dd/MM/yyyy',
															{
																locale: ptBR,
															},
														)}
													</div>
													<div className="flex items-center gap-1 text-xs text-muted-foreground">
														<Clock className="h-3 w-3" />
														{format(
															scheduleDate,
															'HH:mm',
															{
																locale: ptBR,
															},
														)}
													</div>
												</>
											) : (
												<span className="text-muted-foreground">
													-
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium">
											{ticket.number}
										</div>
										<div
											className="text-xs text-muted-foreground truncate max-w-[200px]"
											title={ticket.title}
										>
											{ticket.title}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-1 text-xs font-medium">
												<Building2 className="h-3 w-3 text-muted-foreground" />
												{ticket.client}
											</div>
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Server className="h-3 w-3" />
												{ticket.environment}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<User className="h-3 w-3 text-muted-foreground" />
											{ticket.analyst}
										</div>
									</TableCell>
									<TableCell>
										<div
											className="max-w-[200px] truncate text-sm"
											title={ticket.suspensionReason}
										>
											{ticket.suspensionReason || '-'}
										</div>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}
