import { createLogger, toErrorLogMeta } from "@/lib/logger";

type CitSmartLoginSession = {
    authToken: string | null;
    cookieHeader: string;
    baseUrl: string;
};

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_NETWORK_RETRIES = 2;
const RETRYABLE_CODES = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_SOCKET",
]);
const citSmartLogger = createLogger("CITSMART");

const getEnvOrDefault = (name: string, fallback?: string) => {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
    return fallback;
};

const toPositiveInteger = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const getTimeoutMs = () =>
    toPositiveInteger(
        getEnvOrDefault("CITSMART_REQUEST_TIMEOUT_MS"),
        DEFAULT_TIMEOUT_MS,
    );

const getNetworkRetries = () =>
    toPositiveInteger(
        getEnvOrDefault("CITSMART_REQUEST_RETRIES"),
        DEFAULT_NETWORK_RETRIES,
    );

const delay = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

const getErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object") return undefined;
    const directCode = (error as { code?: unknown }).code;
    if (typeof directCode === "string") return directCode;
    const cause = (error as { cause?: unknown }).cause;
    if (!cause || typeof cause !== "object") return undefined;
    const causeCode = (cause as { code?: unknown }).code;
    return typeof causeCode === "string" ? causeCode : undefined;
};

const isAbortError = (error: unknown) => {
    if (!(error instanceof Error)) return false;
    return error.name === "AbortError";
};

const shouldRetryNetworkError = (error: unknown) => {
    if (isAbortError(error)) return true;
    if (error instanceof TypeError) return true;
    const code = getErrorCode(error);
    return Boolean(code && RETRYABLE_CODES.has(code));
};

const formatNetworkError = (
    context: string,
    error: unknown,
    timeoutMs: number,
) => {
    if (isAbortError(error)) {
        return `Falha de rede no CITSMART (${context}): timeout após ${timeoutMs}ms.`;
    }

    const code = getErrorCode(error);
    const message =
        error instanceof Error ? error.message : "erro de rede desconhecido";

    if (code) {
        return `Falha de rede no CITSMART (${context}): ${message} [${code}].`;
    }

    return `Falha de rede no CITSMART (${context}): ${message}.`;
};

const fetchWithRetry = async (
    url: string,
    init: RequestInit,
    context: string,
) => {
    const timeoutMs = getTimeoutMs();
    const retries = getNetworkRetries();
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const attemptStart = Date.now();
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
        try {
            citSmartLogger.debug("Iniciando tentativa de request", {
                context,
                url,
                method: init.method ?? "GET",
                attempt: attempt + 1,
                totalAttempts: retries + 1,
            });
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
            });
            citSmartLogger.debug("Request concluido", {
                context,
                url,
                method: init.method ?? "GET",
                attempt: attempt + 1,
                status: response.status,
                durationMs: Date.now() - attemptStart,
            });
            return response;
        } catch (error) {
            lastError = error;
            const willRetry =
                attempt < retries && shouldRetryNetworkError(error);
            citSmartLogger.warn("Falha de rede em request", {
                context,
                url,
                method: init.method ?? "GET",
                attempt: attempt + 1,
                totalAttempts: retries + 1,
                willRetry,
                durationMs: Date.now() - attemptStart,
                error: toErrorLogMeta(error),
            });
            if (attempt >= retries || !shouldRetryNetworkError(error)) {
                throw new Error(
                    formatNetworkError(context, error, timeoutMs),
                );
            }
            await delay(300 * (attempt + 1));
        } finally {
            clearTimeout(timeoutHandle);
        }
    }

    throw new Error(
        formatNetworkError(context, lastError, getTimeoutMs()),
    );
};

const getSetCookieHeaders = (response: Response) => {
    if (typeof response.headers.getSetCookie === "function") {
        return response.headers.getSetCookie();
    }
    const legacy = response.headers.get("set-cookie");
    return legacy ? [legacy] : [];
};

const extractCookies = (setCookieHeaders: string[], names: string[]) => {
    const cookies = new Map<string, string>();
    for (const header of setCookieHeaders) {
        const [cookiePair] = header.split(";");
        const [name, ...rest] = cookiePair.split("=");
        if (!name || rest.length === 0) continue;
        const trimmedName = name.trim();
        if (names.includes(trimmedName)) {
            cookies.set(trimmedName, rest.join("=").trim());
        }
    }
    return cookies;
};

const mergeCookies = (
    base: Map<string, string>,
    incoming: Map<string, string>,
) => {
    for (const [name, value] of incoming.entries()) {
        base.set(name, value);
    }
    return base;
};

const buildCookieHeader = (cookies: Map<string, string>) => {
    return Array.from(cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
};

const parseSessionIdFromXml = (xmlText: string) => {
    const match = xmlText.match(/<SessionID>([^<]+)<\/SessionID>/i);
    if (!match) return null;
    return match[1].trim() || null;
};

const buildLoginHeaders = (baseUrl: string, cookieHeader?: string) => {
    const headers = new Headers();
    headers.set("Accept", "application/xml, text/xml, */*");
    headers.set("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.8");
    headers.set("Content-Type", "application/json; charset=UTF-8");
    headers.set("Origin", baseUrl);
    headers.set("Referer", `${baseUrl}/4biz/`);
    headers.set("User-Agent", "insomnia/11.4.0");
    if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
    }
    return headers;
};

const buildAuthHeaders = (
    cookieHeader: string,
    authToken?: string | null,
    accept = "application/json",
) => {
    const headers = new Headers();
    headers.set("Cookie", cookieHeader);
    headers.set("Accept", accept);
    headers.set("Content-Type", "application/json; charset=UTF-8");
    headers.set("User-Agent", "insomnia/11.4.0");
    if (authToken) {
        headers.set("Authorization", `Bearer ${authToken}`);
    }
    return headers;
};

export async function createCitSmartSession(): Promise<CitSmartLoginSession> {
    const baseUrl =
        getEnvOrDefault("CITSMART_BASE_URL") ??
        "https://cco.4biz.globalweb.com.br";
    const clientId = getEnvOrDefault("CITSMART_CLIENT_ID", "Ativo");
    const language = getEnvOrDefault("CITSMART_LANGUAGE", "pt_BR");
    const userName = getEnvOrDefault("CITSMART_USERNAME");
    const password = getEnvOrDefault("CITSMART_PASSWORD");

    if (!userName || !password) {
        throw new Error(
            "Configure CITSMART_USERNAME e CITSMART_PASSWORD no ambiente do servidor.",
        );
    }

    citSmartLogger.info("Iniciando criação de sessão CITSMART", {
        baseUrl,
        clientId,
        language,
        userName,
    });

    let preflightCookies = new Map<string, string>();
    try {
        const preflightResponse = await fetchWithRetry(
            `${baseUrl}/4biz/`,
            {
                method: "GET",
                headers: {
                    "User-Agent": "insomnia/11.4.0",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
                cache: "no-store",
            },
            "preflight",
        );
        if (preflightResponse.ok) {
            preflightCookies = extractCookies(
                getSetCookieHeaders(preflightResponse),
                ["JSESSIONID"],
            );
        }
    } catch {
        citSmartLogger.warn(
            "Preflight falhou, seguindo para login direto.",
        );
    }

    const preflightCookieHeader =
        preflightCookies.size > 0
            ? buildCookieHeader(preflightCookies)
            : undefined;

    const loginResponse = await fetchWithRetry(
        `${baseUrl}/4biz/services/login`,
        {
            method: "POST",
            headers: buildLoginHeaders(baseUrl, preflightCookieHeader),
            body: JSON.stringify({
                clientId,
                language,
                userName,
                password,
            }),
            cache: "no-store",
        },
        "login",
    );

    if (!loginResponse.ok) {
        const details = await loginResponse.text().catch(() => "");
        citSmartLogger.error("Falha no login do CITSMART", {
            status: loginResponse.status,
            statusText: loginResponse.statusText,
            details,
        });
        throw new Error(
            `Falha no login do CITSMART: ${details || loginResponse.statusText}`,
        );
    }

    const loginBodyText = await loginResponse.text();
    const cookies = mergeCookies(
        new Map<string, string>(preflightCookies),
        extractCookies(getSetCookieHeaders(loginResponse), [
            "JSESSIONID",
            "AUTH-TOKEN",
        ]),
    );

    if (!cookies.get("AUTH-TOKEN")) {
        const sessionId = parseSessionIdFromXml(loginBodyText);
        if (sessionId) {
            cookies.set("AUTH-TOKEN", sessionId);
        }
    }

    const authToken = cookies.get("AUTH-TOKEN") ?? null;
    const cookieHeader = buildCookieHeader(cookies);
    if (!cookieHeader) {
        throw new Error(
            "Cookies de autenticação não encontrados no login do CITSMART.",
        );
    }

    citSmartLogger.info("Sessão CITSMART criada com sucesso", {
        hasAuthToken: Boolean(authToken),
        hasCookieHeader: Boolean(cookieHeader),
    });

    return { authToken, cookieHeader, baseUrl };
}

export async function citSmartRequest<T>(params: {
    session: CitSmartLoginSession;
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
}): Promise<T> {
    const { session, path, method = "GET", body } = params;
    citSmartLogger.debug("Executando request autenticada", {
        method,
        path,
        hasBody: body != null,
    });
    const response = await fetchWithRetry(
        `${session.baseUrl}${path}`,
        {
            method,
            headers: buildAuthHeaders(session.cookieHeader, session.authToken),
            body: body ? JSON.stringify(body) : undefined,
            cache: "no-store",
        },
        `request ${path}`,
    );

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        citSmartLogger.error("Request CITSMART retornou erro HTTP", {
            method,
            path,
            status: response.status,
            statusText: response.statusText,
            details,
        });
        throw new Error(
            `CITSMART ${response.status}: ${details || response.statusText}`,
        );
    }

    citSmartLogger.debug("Request autenticada concluída", {
        method,
        path,
        status: response.status,
    });

    return (await response.json()) as T;
}
