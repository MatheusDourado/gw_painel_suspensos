"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Building2 } from "lucide-react";
import type { SuspendedTicket } from "@/lib/tickets";

interface ScheduleModalProps {
    ticket: SuspendedTicket | null;
    open: boolean;
    onClose: () => void;
    onConfirm: (
        date: string,
        time: string,
        serviceType: string,
        notes: string,
    ) => void;
}

type ScheduleFormState = {
    date: string;
    time: string;
    serviceType: string;
    notes: string;
};

const toDateInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

const getInitialFormState = (ticket: SuspendedTicket | null): ScheduleFormState => ({
    date: toDateInputValue(ticket?.scheduledDate),
    time: toTimeInputValue(ticket?.scheduledDate),
    serviceType: ticket?.scheduleServiceType ?? "",
    notes: ticket?.scheduleObservation ?? ticket?.notes ?? "",
});

export function ScheduleModal({
    ticket,
    open,
    onClose,
    onConfirm,
}: ScheduleModalProps) {
    const [form, setForm] = useState<ScheduleFormState>(() =>
        getInitialFormState(ticket),
    );
    const hasExistingSchedule = Boolean(ticket?.scheduleId || ticket?.scheduledDate);

    if (!ticket) return null;
    const { date, time, serviceType, notes } = form;

    const handleConfirm = () => {
        onConfirm(date, time, serviceType, notes);
        setForm(getInitialFormState(ticket));
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {hasExistingSchedule
                            ? "Editar Agendamento"
                            : "Agendar Atendimento"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure o agendamento para o chamado {ticket.number}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Ticket Info */}
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium text-foreground">
                                    {ticket.number}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {ticket.title}
                                </p>
                            </div>
                            <Badge variant="outline" className="font-mono">
                                {ticket.environment}
                            </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {ticket.analyst}
                            </div>
                            <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {ticket.client}
                            </div>
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Data do Agendamento</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) =>
                                    setForm((current) => ({
                                        ...current,
                                        date: e.target.value,
                                    }))
                                }
                                className="bg-secondary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Horário</Label>
                            <Input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) =>
                                    setForm((current) => ({
                                        ...current,
                                        time: e.target.value,
                                    }))
                                }
                                className="bg-secondary"
                            />
                        </div>
                    </div>

                    {/* Service Type */}
                    <div className="space-y-2">
                        <Label>Tipo de Serviço</Label>
                        <Select
                            value={serviceType}
                            onValueChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    serviceType: value,
                                }))
                            }
                        >
                            <SelectTrigger className="bg-secondary">
                                <SelectValue placeholder="Selecione o tipo de serviço" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="remote">
                                    Atendimento Remoto
                                </SelectItem>
                                <SelectItem value="onsite">
                                    Atendimento Presencial
                                </SelectItem>
                                <SelectItem value="maintenance">
                                    Manutenção Programada
                                </SelectItem>
                                <SelectItem value="installation">
                                    Instalação
                                </SelectItem>
                                <SelectItem value="migration">
                                    Migração
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                            id="notes"
                            placeholder="Adicione observações sobre o agendamento..."
                            value={notes}
                            onChange={(e) =>
                                setForm((current) => ({
                                    ...current,
                                    notes: e.target.value,
                                }))
                            }
                            className="bg-secondary min-h-[80px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!date || !time || !serviceType}
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        {hasExistingSchedule
                            ? "Salvar Alterações"
                            : "Confirmar Agendamento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
