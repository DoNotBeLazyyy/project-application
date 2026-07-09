import { BadgeStatusVariant } from '@type/common/badge.type';

export function gradeStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Released':
        return 'success';
    case 'Approved':
        return 'info';
    case 'Submitted':
        return 'warning';
    default:
        return 'info';
    }
}

export function submissionStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Graded':
        return 'success';
    case 'Submitted':
        return 'info';
    case 'Late':
        return 'warning';
    case 'In Progress':
        return 'warning';
    default:
        return 'error';
    }
}

export function attendanceStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Present':
        return 'success';
    case 'Late':
        return 'warning';
    case 'Excused':
        return 'info';
    default:
        return 'error';
    }
}

export function formatScore(value: number | null): string {
    if (value === null || value === undefined) {
        return '—';
    }

    return String(value);
}

export function formatPercent(earned: number | null, max: number): string {
    if (earned === null || earned === undefined || max <= 0) {
        return '—';
    }

    return `${Math.round((earned / max) * 100)}%`;
}

export function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value)
        .toLocaleDateString();
}

export function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value)
        .toLocaleString();
}

export function formatSessionDate(value: string): string {
    return new Date(value)
        .toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
}