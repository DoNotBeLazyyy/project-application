export interface CookieOptions {
    maxAge?: number;
    path?: string;
    sameSite?: 'Strict' | 'Lax' | 'None';
    secure?: boolean;
}

const DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CHUNK_SIZE = 3000;
const CHUNK_MANIFEST_SUFFIX = '___chunks';
const CHUNK_PREFIX = '___chunk_';

function isSecureContext(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    return window.location.protocol === 'https:';
}

function parseCookieString(): Record<string, string> {
    if (typeof document === 'undefined' || !document.cookie) {
        return {};
    }

    const cookies: Record<string, string> = {};
    const pairs = document.cookie.split(';');

    for (const pair of pairs) {
        const trimmed = pair.trim();
        if (!trimmed) {
            continue;
        }
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) {
            continue;
        }

        const rawKey = trimmed.slice(0, eqIdx);
        const rawValue = trimmed.slice(eqIdx + 1);

        try {
            const key = decodeURIComponent(rawKey);
            const value = decodeURIComponent(rawValue);
            cookies[key] = value;
        }
        catch {
            // Malformed cookie key or value, ignore
        }
    }

    return cookies;
}

export function getRawCookie(name: string): string | null {
    const cookies = parseCookieString();
    return cookies[name] ?? null;
}

export function setRawCookie(name: string, value: string, options?: CookieOptions): void {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE_SECONDS;
    const path = options?.path ?? '/';
    const sameSite = options?.sameSite ?? 'Strict';
    const secure = options?.secure ?? isSecureContext();

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}`;

    if (secure) {
        cookieStr += '; Secure';
    }

    document.cookie = cookieStr;
}

export function removeRawCookie(name: string, options?: CookieOptions): void {
    if (typeof document === 'undefined') {
        return;
    }

    const path = options?.path ?? '/';
    const sameSite = options?.sameSite ?? 'Strict';
    const secure = options?.secure ?? isSecureContext();

    let cookieStr = `${encodeURIComponent(name)}=; path=${path}; max-age=0; SameSite=${sameSite}`;

    if (secure) {
        cookieStr += '; Secure';
    }

    document.cookie = cookieStr;
}

/**
 * Reads a value from cookie storage, reconstructing chunked values if present.
 */
export function getCookie(key: string): string | null {
    const manifestKey = `${key}${CHUNK_MANIFEST_SUFFIX}`;
    const chunkCountStr = getRawCookie(manifestKey);

    if (chunkCountStr) {
        const chunkCount = parseInt(chunkCountStr, 10);
        if (!isNaN(chunkCount) && chunkCount > 0) {
            let combined = '';
            for (let i = 0; i < chunkCount; i++) {
                const chunkVal = getRawCookie(`${key}${CHUNK_PREFIX}${i}`);
                if (chunkVal === null) {
                    return null;
                }
                combined += chunkVal;
            }
            return combined;
        }
    }

    return getRawCookie(key);
}

/**
 * Writes a value to cookie storage, chunking across multiple cookies if length exceeds threshold.
 */
export function setCookie(key: string, value: string, options?: CookieOptions): void {
    const manifestKey = `${key}${CHUNK_MANIFEST_SUFFIX}`;

    // Clean up any previously stored chunks for this key
    const oldChunkCountStr = getRawCookie(manifestKey);
    if (oldChunkCountStr) {
        const oldChunkCount = parseInt(oldChunkCountStr, 10);
        if (!isNaN(oldChunkCount)) {
            for (let i = 0; i < oldChunkCount; i++) {
                removeRawCookie(`${key}${CHUNK_PREFIX}${i}`, options);
            }
        }
        removeRawCookie(manifestKey, options);
    }

    if (value.length > CHUNK_SIZE) {
        const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
        setRawCookie(manifestKey, String(chunkCount), options);

        for (let i = 0; i < chunkCount; i++) {
            const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            setRawCookie(`${key}${CHUNK_PREFIX}${i}`, chunk, options);
        }

        // Also remove legacy single cookie if it exists
        removeRawCookie(key, options);
    }
    else {
        setRawCookie(key, value, options);
    }
}

/**
 * Removes a value and any associated chunks from cookie storage.
 */
export function removeCookie(key: string, options?: CookieOptions): void {
    const manifestKey = `${key}${CHUNK_MANIFEST_SUFFIX}`;
    const chunkCountStr = getRawCookie(manifestKey);

    if (chunkCountStr) {
        const chunkCount = parseInt(chunkCountStr, 10);
        if (!isNaN(chunkCount)) {
            for (let i = 0; i < chunkCount; i++) {
                removeRawCookie(`${key}${CHUNK_PREFIX}${i}`, options);
            }
        }
        removeRawCookie(manifestKey, options);
    }

    removeRawCookie(key, options);
}

/**
 * Implements the standard Web Storage interface (getItem, setItem, removeItem, clear, key, length)
 * backed by browser cookies with SameSite=Strict and automatic chunking.
 */
export class CookieStorage implements Storage {
    private getLogicalKeys(): string[] {
        const cookies = parseCookieString();
        const rawKeys = Object.keys(cookies);
        const logicalKeySet = new Set<string>();

        for (const rawKey of rawKeys) {
            if (rawKey.endsWith(CHUNK_MANIFEST_SUFFIX)) {
                const baseKey = rawKey.slice(0, -CHUNK_MANIFEST_SUFFIX.length);
                logicalKeySet.add(baseKey);
            }
            else if (rawKey.includes(CHUNK_PREFIX)) {
                const prefixIdx = rawKey.indexOf(CHUNK_PREFIX);
                const baseKey = rawKey.slice(0, prefixIdx);
                logicalKeySet.add(baseKey);
            }
            else {
                logicalKeySet.add(rawKey);
            }
        }

        return Array.from(logicalKeySet);
    }

    get length(): number {
        return this.getLogicalKeys().length;
    }

    getItem(key: string): string | null {
        return getCookie(key);
    }

    setItem(key: string, value: string): void {
        setCookie(key, value);
    }

    removeItem(key: string): void {
        removeCookie(key);
    }

    clear(): void {
        const keys = this.getLogicalKeys();
        for (const key of keys) {
            this.removeItem(key);
        }
    }

    key(index: number): string | null {
        const keys = this.getLogicalKeys();
        return keys[index] ?? null;
    }
}

export const cookieStorage = new CookieStorage();