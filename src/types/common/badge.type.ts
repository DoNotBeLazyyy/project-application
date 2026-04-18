import { ChipProps } from '@mui/material';
import { ReactElement } from 'react';

export interface CommonBadgeStateProps {
    // Text displayed inside the badge
    label: string;

    // Size of the MUI
    size?: MuiChipSize;

    // Visual state variant of the badge
    variant: StateVariant;
}

export interface CommonBadgeStatusProps extends Omit<ChipProps, 'variant'> {
    // Text displayed inside the badge
    label: string;

    // Chip size
    size?: MuiChipSize;

    // Visual status variant that controls styling
    variant: BadgeStatusVariant;
}

export interface CommonChipProps {
    // Optional leading icon displayed inside the chip
    icon?: ReactElement;

    // Text content shown inside the chip
    label: string;

    // Size of the chip
    size?: MuiChipSize;

    // Visual style variant of the chip
    variant: ChipVariant;
}

// Badge props
export type StateVariant = 'active' | 'inactive';
export type BadgeStatusVariant = 'info' | 'success' | 'warning' | 'error';
export type ChipVariant = 'light' | 'dark' | 'ghost' | 'outline';
export type MuiChipColor = ChipProps['color'];
export type MuiChipSize = ChipProps['size'];
export type StateVariantColorMap = Record<StateVariant, MuiChipColor>;
export type ChipSizeToIconSizeMap = Record<NonNullable<MuiChipSize>, number>;
export type BadgeStatusVariantElementMap = Record<BadgeStatusVariant, ReactElement>;
export type ChipVariantColorMap = Record<ChipVariant, MuiChipColor>;