import { CommonBadgeStatusProps } from '@type/common/badge.type';
import { TermStatus } from '@type/term/term.type';

export const TERM_STATUS_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Upcoming', value: 'Upcoming' },
    { label: 'Enrollment Open', value: 'Enrollment Open' },
    { label: 'Ongoing', value: 'Ongoing' },
    { label: 'Grading Period', value: 'Grading Period' },
    { label: 'Closed', value: 'Closed' }
];

export const TERM_STATUS_VARIANT_MAP: Record<TermStatus, CommonBadgeStatusProps['variant']> = {
    'Upcoming': 'info',
    'Enrollment Open': 'warning',
    'Ongoing': 'success',
    'Grading Period': 'warning',
    'Closed': 'error'
};

export const NEXT_STATUS_MAP: Partial<Record<TermStatus, TermStatus>> = {
    'Upcoming': 'Enrollment Open',
    'Enrollment Open': 'Ongoing',
    'Ongoing': 'Grading Period',
    'Grading Period': 'Closed'
};