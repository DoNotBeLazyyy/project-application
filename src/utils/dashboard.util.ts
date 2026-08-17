export function resolveStatValue(value: number | null | undefined): number | string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '—';
    }

    return value;
}