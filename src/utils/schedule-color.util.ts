export const SCHEDULE_COLOR_PALETTE: string[] = [
    '#3b6fb6',
    '#2f7fa8',
    '#2e8b8b',
    '#3f8f5b',
    '#6e8f2e',
    '#c08a17',
    '#c96a21',
    '#c0453f',
    '#b23a6b',
    '#8b5cc7',
    '#5b62c4',
    '#5f6b7a'
];

const MIN_ALLOWED_LUMINANCE = 0.05;
const MAX_ALLOWED_LUMINANCE = 0.62;
const DARK_INK = '#1f2933';
const LIGHT_INK = '#ffffff';

export function normalizeHexColor(value: string | null | undefined): string | null {
    const raw = (value ?? '')
        .trim()
        .toLowerCase();
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(raw);

    if (!match) return null;

    const digits = match[1];
    const expanded = digits.length === 3
        ? digits.split('')
            .map((channel) => channel + channel)
            .join('')
        : digits;

    return `#${expanded}`;
}

export function getColorLuminance(value: string | null | undefined): number {
    const hex = normalizeHexColor(value);

    if (!hex) return 0;

    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((channel) => channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4);

    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function isScheduleColorAllowed(value: string | null | undefined): boolean {
    const hex = normalizeHexColor(value);

    if (!hex) return false;

    const luminance = getColorLuminance(hex);

    return luminance >= MIN_ALLOWED_LUMINANCE && luminance <= MAX_ALLOWED_LUMINANCE;
}

export function resolveScheduleColor(value: string | null | undefined, index: number): string {
    const fallback = SCHEDULE_COLOR_PALETTE[Math.abs(index) % SCHEDULE_COLOR_PALETTE.length];
    const hex = normalizeHexColor(value);

    if (!hex || !isScheduleColorAllowed(hex)) return fallback;

    return hex;
}

export function getContrastTextColor(value: string): string {
    const luminance = getColorLuminance(value);
    const lightContrast = 1.05 / (luminance + 0.05);
    const darkContrast = (luminance + 0.05) / (getColorLuminance(DARK_INK) + 0.05);

    return lightContrast >= darkContrast
        ? LIGHT_INK
        : DARK_INK;
}

export function shadeColor(value: string, ratio: number): string {
    const hex = normalizeHexColor(value);

    if (!hex) return value;

    const factor = Math.min(Math.max(ratio, -1), 1);
    const shaded = [1, 3, 5].map((offset) => {
        const channel = parseInt(hex.slice(offset, offset + 2), 16);
        const target = factor < 0
            ? channel * (1 + factor)
            : channel + (255 - channel) * factor;

        return Math.round(Math.min(Math.max(target, 0), 255))
            .toString(16)
            .padStart(2, '0');
    });

    return `#${shaded.join('')}`;
}

export function withAlpha(value: string, alpha: number): string {
    const hex = normalizeHexColor(value) ?? '#000000';
    const clamped = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
        .toString(16)
        .padStart(2, '0');

    return `${hex}${clamped}`;
}

export const SCHEDULE_COLOR_RULE_MESSAGE = 'Pick a color that is not white, black, or too close to either — it would be unreadable on the schedule.';