import { PaletteOptions } from '@mui/material'; // Mui dependency

export const PALETTE: PaletteOptions = {
    primary: {
        main: 'var(--mui-tokens-color-brand-900)',
        light: 'var(--mui-tokens-color-brand-500)',
        dark: 'var(--mui-tokens-color-brand-950)',
        contrastText: 'var(--mui-tokens-color-common-white)'
    },
    secondary: {
        main: 'var(--mui-tokens-color-secondary-main)',
        light: 'var(--mui-tokens-color-secondary-light)',
        dark: 'var(--mui-tokens-color-brand-600)',
        contrastText: 'var(--mui-tokens-color-common-white)'
    },
    error: {
        main: 'var(--mui-tokens-color-state-error)',
        light: 'var(--mui-tokens-color-state-errorLight)',
        dark: 'var(--mui-tokens-color-state-error)',
        contrastText: 'var(--mui-tokens-color-common-white)'
    },
    success: {
        main: 'var(--mui-tokens-color-state-success)',
        light: 'var(--mui-tokens-color-state-successLight)',
        dark: 'var(--mui-tokens-color-state-success)',
        contrastText: 'var(--mui-tokens-color-common-white)'
    },
    warning: {
        main: 'var(--mui-tokens-color-state-warning)',
        light: 'var(--mui-tokens-color-state-warningLight)',
        dark: 'var(--mui-tokens-color-state-warning)',
        contrastText: 'var(--mui-tokens-color-common-black)'
    },
    grey: {
        50: 'var(--mui-tokens-color-neutral-50)',
        100: 'var(--mui-tokens-color-neutral-100)',
        200: 'var(--mui-tokens-color-neutral-200)',
        300: 'var(--mui-tokens-color-neutral-300)',
        400: 'var(--mui-tokens-color-neutral-400)',
        500: 'var(--mui-tokens-color-neutral-500)',
        600: 'var(--mui-tokens-color-neutral-600)',
        700: 'var(--mui-tokens-color-neutral-700)',
        800: 'var(--mui-tokens-color-neutral-800)',
        900: 'var(--mui-tokens-color-neutral-900)'
    },
    text: {
        primary: 'var(--mui-tokens-color-neutral-900)',
        secondary: 'var(--mui-tokens-color-neutral-500)'
    },
    background: {
        paper: 'var(--mui-tokens-color-common-white)',
        default: 'var(--mui-tokens-color-brand-100)'
    }
}; // Palette configuration