"use client";

import { useMemo, useState } from "react";
import { Moon, Search, Sun, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme-context";
import {
    normalizePriority,
    normalizeStatus,
    type SuspendedTicket,
} from "@/lib/tickets";

interface HeaderProps {
    tickets: SuspendedTicket[];
    onSelectTicket?: (ticket: SuspendedTicket) => void;
}

const getStatusBadgeClass = (status: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "agendado") return "bg-success text-success-foreground";
    if (normalized === "suspenso")
        return "bg-warning/20 text-warning border-warning/30";
    return "";
};

export function Header({ tickets, onSelectTicket }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return tickets.filter(
            (ticket) =>
                ticket.number.toLowerCase().includes(query) ||
                ticket.title.toLowerCase().includes(query) ||
                ticket.client.toLowerCase().includes(query) ||
                ticket.analyst.toLowerCase().includes(query) ||
                ticket.environment.toLowerCase().includes(query),
        );
    }, [searchQuery, tickets]);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-border bg-sidebar px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-primary-foreground">
                                ST
                            </span>
                        </div>
                        <span className="text-lg font-semibold text-foreground">
                            Dashboard Chamados Suspensos
                        </span>
                        <Badge
                            variant="outline"
                            className="ml-2 border-primary/30 text-primary"
                        >
                            ITSM
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="w-64 justify-start bg-transparent text-muted-foreground"
                            onClick={() => setSearchOpen(true)}
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Buscar chamados...
                            {/* <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd> */}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            title={
                                theme === "dark" ? "Modo claro" : "Modo escuro"
                            }
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Buscar Chamados</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Digite numero, titulo, cliente ou analista..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                                    onClick={() => setSearchQuery("")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {searchQuery && searchResults.length === 0 && (
                                <div className="py-8 text-center text-muted-foreground">
                                    Nenhum chamado encontrado para &quot;
                                    {searchQuery}&quot;
                                </div>
                            )}
                            {searchResults.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                                    onClick={() => {
                                        onSelectTicket?.(ticket);
                                        setSearchOpen(false);
                                        setSearchQuery("");
                                    }}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-medium">
                                                {ticket.number}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    normalizePriority(
                                                        ticket.priority,
                                                    ) === "critica"
                                                        ? "border-destructive text-destructive"
                                                        : normalizePriority(
                                                                ticket.priority,
                                                            ) === "alta"
                                                          ? "border-warning text-warning"
                                                          : "border-muted-foreground text-muted-foreground"
                                                }
                                            >
                                                {ticket.priority}
                                            </Badge>
                                            <Badge variant="secondary">
                                                {ticket.environment}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-foreground">
                                            {ticket.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Cliente: {ticket.client} | Analista:{" "}
                                            {ticket.analyst}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={getStatusBadgeClass(
                                            ticket.status,
                                        )}
                                    >
                                        {ticket.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        {!searchQuery && (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                                Digite para buscar por numero, titulo, cliente,
                                analista ou ambiente
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
