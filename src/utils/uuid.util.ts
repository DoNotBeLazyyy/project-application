let fallbackCounter = 0;

function toHex(value: number): string {
    return value.toString(16)
        .padStart(2, '0');
}

function randomFromCrypto(): string | null {
    const source = typeof globalThis.crypto !== 'undefined'
        ? globalThis.crypto
        : null;

    if (!source || typeof source.getRandomValues !== 'function') {
        return null;
    }

    const bytes = new Uint8Array(16);

    source.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, toHex)
        .join('');

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20)
    ].join('-');
}

export function generateId(): string {
    const source = typeof globalThis.crypto !== 'undefined'
        ? globalThis.crypto
        : null;

    if (source && typeof source.randomUUID === 'function') {
        return source.randomUUID();
    }

    const fromCrypto = randomFromCrypto();

    if (fromCrypto) {
        return fromCrypto;
    }

    fallbackCounter += 1;

    const stamp = Date.now()
        .toString(36);

    return `id-${stamp}-${fallbackCounter.toString(36)}`;
}

export function nullIfBlank(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return value ?? null;
    }

    return value.trim().length > 0
        ? value
        : null;
}

export function sanitizeUuidArray(ids: string[] | null | undefined): string[] | null {
    if (!ids) {
        return null;
    }

    const cleaned = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);

    return cleaned.length > 0
        ? cleaned
        : null;
}