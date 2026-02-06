"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    normalizePriority,
    normalizeStatus,
    type SuspendedTicket,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    BarChart3,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clock,
    LayoutDashboard,
    Ticket,
} from "lucide-react";
import { useState } from "react";

interface SidebarNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    selectedEnvironment: string | null;
    onEnvironmentChange: (env: string | null) => void;
    environments: string[];
    tickets: SuspendedTicket[];
}

export function SidebarNav({
    activeTab,
    onTabChange,
    selectedEnvironment,
    onEnvironmentChange,
    environments,
    tickets,
}: SidebarNavProps) {
    const [environmentsOpen, setEnvironmentsOpen] = useState(true);

    const navItems = [
        { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
        { id: "tickets", label: "Chamados Suspensos", icon: Ticket },
        { id: "scheduled", label: "Agendamentos", icon: Calendar },
        {
            id: "upcoming-schedules",
            label: "Próximos Agendamentos",
            icon: Clock,
        },
        { id: "analytics", label: "Análise de Dados", icon: BarChart3 },
    ];

    const statusCounts = {
        critical: tickets.filter(
            (t) => normalizePriority(t.priority) === "critica",
        ).length,
        pending: tickets.filter((t) => normalizeStatus(t.status) === "suspenso")
            .length,
        scheduled: tickets.filter(
            (t) => normalizeStatus(t.status) === "agendado",
        ).length,
    };

    return (
        <aside className="fixed left-0 top-[57px] z-40 h-[calc(100vh-57px)] w-64 border-r border-sidebar-border bg-sidebar">
            <nav className="flex h-full flex-col p-4">
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <Button
                            key={item.id}
                            variant={
                                activeTab === item.id ? "secondary" : "ghost"
                            }
                            className={cn(
                                "w-full justify-start gap-3",
                                activeTab === item.id && "bg-sidebar-accent",
                            )}
                            onClick={() => onTabChange(item.id)}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Button>
                    ))}
                </div>

                <div className="mt-6">
                    <Button
                        variant="ghost"
                        className="w-full justify-between px-3"
                        onClick={() => setEnvironmentsOpen(!environmentsOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="text-sm font-medium">
                                Ambientes
                            </span>
                        </div>
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 transition-transform",
                                environmentsOpen && "rotate-180",
                            )}
                        />
                    </Button>

                    {environmentsOpen && (
                        <div className="mt-2 space-y-1 pl-2">
                            <Button
                                variant={
                                    selectedEnvironment === null
                                        ? "secondary"
                                        : "ghost"
                                }
                                size="sm"
                                className="w-full justify-between"
                                onClick={() => onEnvironmentChange(null)}
                            >
                                <span>Todos</span>
                                <Badge variant="outline" className="ml-auto">
                                    {tickets.length}
                                </Badge>
                            </Button>
                            {environments.map((env) => {
                                const count = tickets.filter(
                                    (t) => t.environment === env,
                                ).length;
                                return (
                                    <Button
                                        key={env}
                                        variant={
                                            selectedEnvironment === env
                                                ? "secondary"
                                                : "ghost"
                                        }
                                        size="sm"
                                        className="w-full justify-between"
                                        onClick={() => onEnvironmentChange(env)}
                                    >
                                        <span>{env}</span>
                                        <Badge
                                            variant="outline"
                                            className="ml-auto"
                                        >
                                            {count}
                                        </Badge>
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
                    <div className="text-xs font-medium uppercase text-muted-foreground px-3 mb-2">
                        Status Rápido
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm">Críticos</span>
                        </div>
                        <Badge variant="destructive">
                            {statusCounts.critical}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-warning/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-warning" />
                            <span className="text-sm">Pendentes</span>
                        </div>
                        <Badge className="bg-warning text-warning-foreground">
                            {statusCounts.pending}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-success/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-sm">Agendados</span>
                        </div>
                        <Badge className="bg-success text-success-foreground">
                            {statusCounts.scheduled}
                        </Badge>
                    </div>
                </div>
            </nav>
        </aside>
    );
}
