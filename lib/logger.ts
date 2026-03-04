type LogLevel = "debug" | "info" | "warn" | "error";

type LogMetadata = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const SENSITIVE_KEY_FRAGMENTS = [
    "password",
    "passwd",
    "token",
    "authorization",
    "cookie",
    "secret",
    "session",
];

const normalizeLevel = (value?: string): LogLevel => {
    const lower = value?.trim().toLowerCase();
    if (lower === "debug") return "debug";
    if (lower === "warn") return "warn";
    if (lower === "error") return "error";
    return "info";
};

const getCurrentLogLevel = (): LogLevel => {
    return normalizeLevel(process.env.LOG_LEVEL ?? process.env.CITSMART_LOG_LEVEL);
};

const shouldRedact = (key: string) => {
    const lower = key.toLowerCase();
    return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
};

const serializeLogValue = (value: unknown) => {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (key, currentValue) => {
        if (key && shouldRedact(key)) {
            return "[REDACTED]";
        }

        if (currentValue instanceof Error) {
            return {
                name: currentValue.name,
                message: currentValue.message,
                stack: currentValue.stack,
            };
        }

        if (
            typeof currentValue === "object" &&
            currentValue !== null
        ) {
            if (seen.has(currentValue as object)) {
                return "[Circular]";
            }
            seen.add(currentValue as object);
        }

        return currentValue;
    });
};

const createRequestId = () => {
    if (
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
    ) {
        return globalThis.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const emitLog = (
    level: LogLevel,
    scope: string,
    message: string,
    metadata?: LogMetadata,
) => {
    const configuredLevel = getCurrentLogLevel();
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[configuredLevel]) {
        return;
    }

    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}`;
    const withMetadata =
        metadata && Object.keys(metadata).length > 0
            ? `${base} ${serializeLogValue(metadata)}`
            : base;

    if (level === "error") {
        console.error(withMetadata);
        return;
    }

    if (level === "warn") {
        console.warn(withMetadata);
        return;
    }

    console.log(withMetadata);
};

export type Logger = {
    debug: (message: string, metadata?: LogMetadata) => void;
    info: (message: string, metadata?: LogMetadata) => void;
    warn: (message: string, metadata?: LogMetadata) => void;
    error: (message: string, metadata?: LogMetadata) => void;
    child: (suffix: string, metadata?: LogMetadata) => Logger;
};

export const createLogger = (
    scope: string,
    baseMetadata: LogMetadata = {},
): Logger => {
    const log =
        (level: LogLevel) => (message: string, metadata?: LogMetadata) => {
            emitLog(level, scope, message, {
                ...baseMetadata,
                ...(metadata ?? {}),
            });
        };

    return {
        debug: log("debug"),
        info: log("info"),
        warn: log("warn"),
        error: log("error"),
        child: (suffix, metadata = {}) =>
            createLogger(`${scope}:${suffix}`, {
                ...baseMetadata,
                ...metadata,
            }),
    };
};

export const createRequestLogger = (
    scope: string,
    request: Request,
    metadata: LogMetadata = {},
) => {
    const requestId = request.headers.get("x-request-id") ?? createRequestId();
    return createLogger(scope, {
        requestId,
        ...metadata,
    });
};

export const toErrorLogMeta = (error: unknown) => {
    if (error instanceof Error) {
        const maybeCause = error as Error & { cause?: unknown };
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: maybeCause.cause,
        };
    }

    return { error };
};
