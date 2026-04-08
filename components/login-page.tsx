"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export function LoginPage() {
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // simulate async for UX
        setTimeout(() => {
            const ok = login(username.trim(), password);
            if (!ok) {
                setError("Usuário ou senha inválidos.");
            }
            setLoading(false);
        }, 300);
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={toggleTheme}
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
                {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                ) : (
                    <Moon className="h-5 w-5" />
                )}
            </Button>

            <div className="mb-8 flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold text-foreground">
                        Monitoramento de Chamados Suspensos
                    </span>
                    <Badge
                        variant="outline"
                        className="border-primary/30 text-primary"
                    >
                        ITSM
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Acesso restrito — faça login para continuar
                </p>
            </div>

            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Entrar</CardTitle>
                    <CardDescription>
                        Use suas credenciais de acesso ao painel
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="username">Usuário</Label>
                            <Input
                                id="username"
                                type="text"
                                autoComplete="username"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
