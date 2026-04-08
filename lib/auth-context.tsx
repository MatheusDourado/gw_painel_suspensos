"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

export type UserRole = "servicedesk" | "noc";

export interface AuthUser {
    username: string;
    role: UserRole;
    displayName: string;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const CREDENTIALS: Record<string, { password: string; role: UserRole; displayName: string }> = {
    user_servicedesk: {
        password: process.env.NEXT_PUBLIC_AUTH_SERVICEDESK_PASSWORD ?? "",
        role: "servicedesk",
        displayName: "Service Desk",
    },
    user_noc: {
        password: process.env.NEXT_PUBLIC_AUTH_NOC_PASSWORD ?? "",
        role: "noc",
        displayName: "NOC",
    },
};

export const NOC_ENVIRONMENTS = ["Paineis N1", "Copasa", "MCTI", "CAOA", "MEC"];

const AUTH_STORAGE_KEY = "gw_painel_auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
        return null;
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

    useEffect(() => {
        if (user) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }, [user]);

    const login = useCallback((username: string, password: string): boolean => {
        const cred = CREDENTIALS[username];
        if (!cred || cred.password !== password) return false;
        setUser({ username, role: cred.role, displayName: cred.displayName });
        return true;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
