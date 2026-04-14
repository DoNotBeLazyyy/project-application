import { ChipProps } from '@mui/material';

// Status badge color variants
export type BadgeVariant = 'error' | 'info' | 'success' | 'warning';

export interface StatusBadgeProps extends Omit<ChipProps, 'label' | 'variant'> {
    // The badge label text (e.g. "Pending", "2 Issues")
    label: string;

    // The badge color variant
    variant?: BadgeVariant;
}