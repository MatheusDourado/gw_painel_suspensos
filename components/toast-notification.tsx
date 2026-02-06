"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastNotificationProps {
    message: string;
    type?: "success" | "error" | "warning";
    show: boolean;
    onClose: () => void;
}

export function ToastNotification({
    message,
    type = "success",
    show,
    onClose,
}: ToastNotificationProps) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div
            className={cn(
                "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all animate-in slide-in-from-bottom-5",
                type === "success" &&
                    "bg-success/10 border-success/30 text-success",
                type === "error" &&
                    "bg-destructive/10 border-destructive/30 text-destructive",
                type === "warning" &&
                    "bg-warning/10 border-warning/30 text-warning",
            )}
        >
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-medium">{message}</p>
            <button onClick={onClose} className="ml-2 hover:opacity-70">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
