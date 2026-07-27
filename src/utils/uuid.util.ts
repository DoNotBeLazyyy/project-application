export function sanitizeUuidArray(ids: string[] | null | undefined): string[] | null {
    if (!ids) {
        return null;
    }

    const cleaned = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);

    return cleaned.length > 0
        ? cleaned
        : null;
}