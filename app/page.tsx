'use client';

import { AnalyticsView } from '@/components/analytics-view';
import { EnvironmentChart } from '@/components/environment-chart';
import { Header } from '@/components/header';
import { KPICards } from '@/components/kpi-cards';
import { LoginPage } from '@/components/login-page';
import { ScheduleModal } from '@/components/schedule-modal';
import { ScheduledList } from '@/components/scheduled-list';
import { SidebarNav } from '@/components/sidebar-nav';
import { TicketDetailsModal } from '@/components/ticket-details-modal';
import { TicketsTable } from '@/components/tickets-table';
import { TimelineChart } from '@/components/timeline-chart';
import { ToastNotification } from '@/components/toast-notification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UpcomingSchedulesTable } from '@/components/upcoming-schedules-table';
import { useAuth, NOC_ENVIRONMENTS } from '@/lib/auth-context';
import {
	getEnvironments,
	type Note,
	type SuspendedTicket,
} from '@/lib/tickets';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function Dashboard() {
	const { user } = useAuth();

	if (!user) {
		return <LoginPage />;
	}

	return <DashboardContent />;
}

function DashboardContent() {
	const { user } = useAuth();
	const [activeTab, setActiveTab] = useState('overview');
	const [selectedEnvironment, setSelectedEnvironment] = useState<
		string | null
	>(null);
	const [selectedTicket, setSelectedTicket] =
		useState<SuspendedTicket | null>(null);
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [detailsModalOpen, setDetailsModalOpen] = useState(false);
	const [toast, setToast] = useState({ show: false, message: '' });
	const [tickets, setTickets] = useState<SuspendedTicket[]>([]);
	const [ticketsLoading, setTicketsLoading] = useState(true);
	const [ticketsError, setTicketsError] = useState<string | null>(null);
	const [isFullScreen, setIsFullScreen] = useState(false);

	const loadTickets = useCallback(
		async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
			if (showLoading) {
				setTicketsLoading(true);
			}
			setTicketsError(null);
			try {
				const response = await fetch('/api/tickets', {
					cache: 'no-store',
				});
				if (!response.ok) {
					throw new Error(`Erro ${response.status}`);
				}
				const data = (await response.json()) as {
					tickets?: SuspendedTicket[];
				};
				setTickets(data.tickets ?? []);
			} catch (error) {
				setTicketsError(
					error instanceof Error
						? error.message
						: 'Falha ao carregar tickets',
				);
			} finally {
				if (showLoading) {
					setTicketsLoading(false);
				}
			}
		},
		[],
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				document
					.querySelector<HTMLButtonElement>('[data-search-trigger]')
					?.click();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	useEffect(() => {
		void loadTickets();
		const intervalId = window.setInterval(() => {
			void loadTickets({ showLoading: false });
		}, 300000);
		return () => window.clearInterval(intervalId);
	}, [loadTickets]);

	useEffect(() => {
		if (!selectedTicket) return;
		const updatedTicket = tickets.find(
			(ticket) => ticket.number === selectedTicket.number,
		);
		if (!updatedTicket) return;
		if (updatedTicket !== selectedTicket) {
			setSelectedTicket(updatedTicket);
		}
	}, [tickets, selectedTicket]);

	const visibleTickets = useMemo(() => {
		if (user?.role === 'noc') {
			return tickets.filter((t) =>
				NOC_ENVIRONMENTS.includes(t.environment),
			);
		}
		return tickets;
	}, [tickets, user]);

	const environments = useMemo(() => getEnvironments(visibleTickets), [visibleTickets]);

	const handleSchedule = (ticket: SuspendedTicket) => {
		setSelectedTicket(ticket);
		setDetailsModalOpen(false);
		setScheduleModalOpen(true);
	};

	const handleViewDetails = (ticket: SuspendedTicket) => {
		setSelectedTicket(ticket);
		setDetailsModalOpen(true);
	};

	const handleSearchSelect = (ticket: SuspendedTicket) => {
		setSelectedTicket(ticket);
		setDetailsModalOpen(true);
	};

	const handleConfirmSchedule = async (
		date: string,
		time: string,
		serviceType: string,
		notes: string,
	) => {
		if (!selectedTicket) return;
		try {
			const response = await fetch(
				`/api/tickets/${selectedTicket.number}/schedule`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						date,
						time,
						serviceType,
						notes,
						scheduleId: selectedTicket.scheduleId,
						scheduleNoteId: selectedTicket.scheduleNoteId,
					}),
				},
			);
			if (!response.ok) {
				const errorBody = (await response.json().catch(() => ({}))) as {
					error?: string;
					details?: string;
				};
				throw new Error(
					errorBody.details ||
						errorBody.error ||
						`Erro ${response.status}`,
				);
			}

			await loadTickets();
			const actionText = selectedTicket.scheduledDate
				? 'Agendamento atualizado'
				: 'Agendamento confirmado';
			setToast({
				show: true,
				message: `${actionText} para ${new Date(date).toLocaleDateString('pt-BR')} as ${time}`,
			});
		} catch (error) {
			setToast({
				show: true,
				message: `Falha ao salvar agendamento: ${error instanceof Error ? error.message : 'Erro inesperado'}`,
			});
		}
	};

	const handleAddNote = async (
		ticket: SuspendedTicket,
		noteToEdit?: Note,
	) => {
		const isEditing = typeof noteToEdit?.id === 'number';
		const promptMessage = isEditing
			? `Editar nota #${noteToEdit.id} de ${ticket.number}:`
			: `Adicionar nota para ${ticket.number}:`;
		const noteText = window.prompt(promptMessage, noteToEdit?.text ?? '');
		if (!noteText || !noteText.trim()) return;

		try {
			const response = await fetch(
				`/api/tickets/${ticket.number}/notes`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: noteText.trim(),
						type: noteToEdit?.type ?? 'interna',
						origin: noteToEdit?.origin ?? 'painel_suspensos',
						noteId: noteToEdit?.id,
						scheduleId: noteToEdit?.scheduleId,
					}),
				},
			);
			if (!response.ok) {
				const errorBody = (await response.json().catch(() => ({}))) as {
					error?: string;
					details?: string;
				};
				throw new Error(
					errorBody.details ||
						errorBody.error ||
						`Erro ${response.status}`,
				);
			}

			await loadTickets();
			setToast({
				show: true,
				message: isEditing
					? 'Nota atualizada com sucesso.'
					: 'Nota salva com sucesso.',
			});
		} catch (error) {
			setToast({
				show: true,
				message: `Falha ao salvar nota: ${error instanceof Error ? error.message : 'Erro inesperado'}`,
			});
		}
	};

	return (
		<div className="min-h-screen bg-background">
			{!isFullScreen && (
				<Header tickets={visibleTickets} onSelectTicket={handleSearchSelect} />
			)}
			{!isFullScreen && (
				<SidebarNav
					activeTab={activeTab}
					onTabChange={setActiveTab}
					selectedEnvironment={selectedEnvironment}
					onEnvironmentChange={setSelectedEnvironment}
					environments={environments}
					tickets={visibleTickets}
				/>
			)}

			<main className={isFullScreen ? 'p-6' : 'ml-64 p-6'}>
				{ticketsError && (
					<div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
						Erro ao carregar dados do CITSMART: {ticketsError}
					</div>
				)}
				{ticketsLoading && (
					<div className="mb-4 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
						Carregando tickets...
					</div>
				)}

				<div className="mb-6">
					<div className="flex items-center justify-between">
						<div>
							{!isFullScreen && (
								<>
									<h1 className="text-2xl font-bold text-foreground">
										{activeTab === 'overview' &&
											'Visao Geral'}
										{activeTab === 'tickets' &&
											'Chamados Suspensos'}
										{activeTab === 'scheduled' &&
											'Agendamentos'}
										{activeTab === 'without-changes-48h' &&
											'Sem modificações (Últimas 48h)'}
										{activeTab === 'upcoming-schedules' &&
											'Próximos Agendamentos'}
										{activeTab === 'analytics' &&
											'Analise de Dados'}
									</h1>
									<p className="mt-1 text-muted-foreground">
										{selectedEnvironment
											? `Filtrando por ambiente: ${selectedEnvironment}`
											: 'Todos os ambientes ITSM'}
									</p>
								</>
							)}
						</div>
						<div className="flex items-center gap-2">
							{selectedEnvironment && (
								<Badge
									variant="outline"
									className="cursor-pointer hover:bg-secondary"
									onClick={() => setSelectedEnvironment(null)}
								>
									{selectedEnvironment} x
								</Badge>
							)}
							{activeTab === 'scheduled' && (
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setIsFullScreen(!isFullScreen)
									}
									title={
										isFullScreen
											? 'Sair da tela cheia'
											: 'Tela cheia'
									}
								>
									{isFullScreen ? (
										<Minimize2 className="h-4 w-4" />
									) : (
										<Maximize2 className="h-4 w-4" />
									)}
								</Button>
							)}
						</div>
					</div>
				</div>

				{activeTab === 'overview' && (
					<div className="space-y-6">
						<KPICards
							selectedEnvironment={selectedEnvironment}
							tickets={visibleTickets}
						/>

						<div className="grid gap-6 md:grid-cols-2">
							<TimelineChart
								tickets={visibleTickets}
								selectedEnvironment={selectedEnvironment}
							/>

							<EnvironmentChart
								tickets={visibleTickets}
								selectedEnvironment={selectedEnvironment}
							/>
						</div>

						<div className="grid gap-6 lg:grid-cols-3">
							<div className="lg:col-span-2">
								<h2 className="mb-4 text-lg font-semibold text-foreground">
									Chamados Recentes
								</h2>
								<TicketsTable
									selectedEnvironment={selectedEnvironment}
									tickets={visibleTickets}
									onSchedule={handleSchedule}
									onViewDetails={handleViewDetails}
									onAddNote={handleAddNote}
								/>
							</div>
							<ScheduledList
								selectedEnvironment={selectedEnvironment}
								tickets={visibleTickets}
							/>
						</div>
					</div>
				)}

				{activeTab === 'tickets' && (
					<div className="space-y-6">
						<KPICards
							selectedEnvironment={selectedEnvironment}
							tickets={visibleTickets}
						/>
						<TicketsTable
							selectedEnvironment={selectedEnvironment}
							tickets={visibleTickets}
							onSchedule={handleSchedule}
							onViewDetails={handleViewDetails}
							onAddNote={handleAddNote}
							useDiffUltimaAtualizacao
						/>
					</div>
				)}

				{activeTab === 'scheduled' && (
					<div className="space-y-6">
						<div
							className={
								isFullScreen ? '' : 'grid gap-6 lg:grid-cols-3'
							}
						>
							<div
								className={
									isFullScreen ? '' : 'lg:col-span-2'
								}
							>
								<TicketsTable
									selectedEnvironment={selectedEnvironment}
									tickets={visibleTickets.filter(
										(t) =>
											t.status === 'Agendado' ||
											t.scheduledDate,
									)}
									onSchedule={handleSchedule}
									onViewDetails={handleViewDetails}
									onAddNote={handleAddNote}
									showReason={false}
								/>
							</div>
							{!isFullScreen && (
								<ScheduledList
									selectedEnvironment={selectedEnvironment}
									tickets={visibleTickets}
								/>
							)}
						</div>
					</div>
				)}

				{activeTab === 'upcoming-schedules' && (
					<div className="space-y-6">
						<UpcomingSchedulesTable
							selectedEnvironment={selectedEnvironment}
							tickets={visibleTickets}
						/>
					</div>
				)}
				{activeTab === 'without-changes-48h' && (
					<div className="space-y-6">
						<TicketsTable
							selectedEnvironment={selectedEnvironment}
							tickets={visibleTickets.filter(
								(ticket) =>
									ticket.semalteracao_48hs
										?.trim()
										.toUpperCase() === 'SIM',
							)}
							onSchedule={handleSchedule}
							onViewDetails={handleViewDetails}
							onAddNote={handleAddNote}
							useDiffUltimaAtualizacao
						/>
					</div>
				)}
				{activeTab === 'analytics' && (
					<AnalyticsView tickets={visibleTickets} />
				)}
			</main>

			<ScheduleModal
				key={
					selectedTicket
						? [
								selectedTicket.number,
								scheduleModalOpen ? 'open' : 'closed',
							].join(':')
						: 'schedule-modal-empty'
				}
				ticket={selectedTicket}
				open={scheduleModalOpen}
				onClose={() => setScheduleModalOpen(false)}
				onConfirm={handleConfirmSchedule}
			/>

			<TicketDetailsModal
				ticket={selectedTicket}
				open={detailsModalOpen}
				onClose={() => setDetailsModalOpen(false)}
				onSchedule={() => handleSchedule(selectedTicket!)}
				onAddNote={() =>
					selectedTicket && void handleAddNote(selectedTicket)
				}
				onEditNote={(note) => {
					if (!selectedTicket) return;
					void handleAddNote(selectedTicket, note);
				}}
			/>

			<ToastNotification
				message={toast.message}
				show={toast.show}
				onClose={() => setToast({ show: false, message: '' })}
			/>
		</div>
	);
}
