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

interface CredentialConfig {
    password: string;
    role: UserRole;
    displayName: string;
    canonicalUsername: string;
}

const SERVICE_DESK_CREDENTIAL: CredentialConfig = {
    password: process.env.NEXT_PUBLIC_AUTH_SERVICEDESK_PASSWORD ?? "",
    role: "servicedesk",
    displayName: "Service Desk",
    canonicalUsername: "servicedesk",
};

const NOC_CREDENTIAL: CredentialConfig = {
    password: process.env.NEXT_PUBLIC_AUTH_NOC_PASSWORD ?? "",
    role: "noc",
    displayName: "NOC",
    canonicalUsername: "noc",
};

const CREDENTIALS: Record<string, CredentialConfig> = {
    servicedesk: SERVICE_DESK_CREDENTIAL,
    user_servicedesk: SERVICE_DESK_CREDENTIAL,
    noc: NOC_CREDENTIAL,
    user_noc: NOC_CREDENTIAL,
};

const normalizeValue = (value: string) =>
    value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

export const SERVICEDESK_ENVIRONMENTS = ["COPASA", "MCTI", "CAOA", "MEC"];

const SERVICEDESK_ENVIRONMENT_SET = new Set(
    SERVICEDESK_ENVIRONMENTS.map((environment) => normalizeValue(environment)),
);

export const canAccessEnvironment = (role: UserRole, environment: string) => {
    if (role === "noc") return true;
    return SERVICEDESK_ENVIRONMENT_SET.has(normalizeValue(environment));
};

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
        const normalizedUsername = username.trim().toLowerCase();
        const cred = CREDENTIALS[normalizedUsername];
        if (!cred || cred.password !== password) return false;
        setUser({
            username: cred.canonicalUsername,
            role: cred.role,
            displayName: cred.displayName,
        });
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
