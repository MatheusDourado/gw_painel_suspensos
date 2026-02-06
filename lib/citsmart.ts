type CitSmartLoginSession = {
    authToken: string | null;
    cookieHeader: string;
    baseUrl: string;
};

const getEnvOrDefault = (name: string, fallback?: string) => {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
    return fallback;
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

    const preflightResponse = await fetch(`${baseUrl}/4biz/`, {
        method: "GET",
        headers: {
            "User-Agent": "insomnia/11.4.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
    });

    const preflightCookies = extractCookies(
        getSetCookieHeaders(preflightResponse),
        ["JSESSIONID"],
    );
    const preflightCookieHeader =
        preflightCookies.size > 0
            ? buildCookieHeader(preflightCookies)
            : undefined;

    const loginResponse = await fetch(`${baseUrl}/4biz/services/login`, {
        method: "POST",
        headers: buildLoginHeaders(baseUrl, preflightCookieHeader),
        body: JSON.stringify({
            clientId,
            language,
            userName,
            password,
        }),
        cache: "no-store",
    });

    if (!loginResponse.ok) {
        const details = await loginResponse.text().catch(() => "");
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

    return { authToken, cookieHeader, baseUrl };
}

export async function citSmartRequest<T>(params: {
    session: CitSmartLoginSession;
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
}): Promise<T> {
    const { session, path, method = "GET", body } = params;
    const response = await fetch(`${session.baseUrl}${path}`, {
        method,
        headers: buildAuthHeaders(session.cookieHeader, session.authToken),
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(
            `CITSMART ${response.status}: ${details || response.statusText}`,
        );
    }

    return (await response.json()) as T;
}
