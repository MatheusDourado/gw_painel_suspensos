import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Painel de Chamados Suspensos | Globalweb ITSM",
    description:
        "Monitoramento em tempo real de chamados suspensos no ITSM da Globalweb. Acompanhe agendamentos, prioridades e status por ambiente.",
    keywords: ["ITSM", "chamados", "suspensos", "monitoramento", "Globalweb", "service desk", "NOC"],
    authors: [{ name: "Globalweb" }],
    openGraph: {
        title: "Painel de Chamados Suspensos | Globalweb ITSM",
        description:
            "Monitoramento em tempo real de chamados suspensos no ITSM da Globalweb.",
        type: "website",
        locale: "pt_BR",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" className="dark">
            <body
                className={`${geist.className} ${geistMono.className} antialiased`}
            >
                <ThemeProvider>
                    <AuthProvider>{children}</AuthProvider>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    );
}
