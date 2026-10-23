import { TOKENS } from '@constants/theme/tokens.constant'; // Tokens dependency
import { PaletteOptions } from '@mui/material'; // Mui dependency

export const LIGHT_PALETTE: PaletteOptions = {
    mode: 'light',
    primary: {
        main: TOKENS.color?.brand?.[900] as string,
        light: TOKENS.color?.brand?.[500],
        dark: TOKENS.color?.brand?.[950],
        contrastText: TOKENS.color?.common?.white
    },
    secondary: {
        main: TOKENS.color?.secondary?.main as string,
        light: TOKENS.color?.secondary?.light,
        dark: TOKENS.color?.brand?.[600],
        contrastText: TOKENS.color?.common?.white
    },
    error: {
        main: TOKENS.color?.state?.error as string,
        light: TOKENS.color?.state?.errorLight,
        dark: TOKENS.color?.state?.error,
        contrastText: TOKENS.color?.common?.white
    },
    success: {
        main: TOKENS.color?.state?.success as string,
        light: TOKENS.color?.state?.successLight,
        dark: TOKENS.color?.state?.success,
        contrastText: TOKENS.color?.common?.white
    },
    warning: {
        main: TOKENS.color?.state?.warning as string,
        light: TOKENS.color?.state?.warningLight,
        dark: TOKENS.color?.state?.warning,
        contrastText: TOKENS.color?.common?.black
    },
    grey: {
        50: TOKENS.color?.neutral?.[50],
        100: TOKENS.color?.neutral?.[100],
        200: TOKENS.color?.neutral?.[200],
        300: TOKENS.color?.neutral?.[300],
        400: TOKENS.color?.neutral?.[400],
        500: TOKENS.color?.neutral?.[500],
        600: TOKENS.color?.neutral?.[600],
        700: TOKENS.color?.neutral?.[700],
        800: TOKENS.color?.neutral?.[800],
        900: TOKENS.color?.neutral?.[900]
    },
    text: {
        primary: TOKENS.color?.neutral?.[900],
        secondary: TOKENS.color?.neutral?.[500]
    },
    background: {
        paper: TOKENS.color?.common?.white,
        default: TOKENS.color?.brand?.[100]
    }
};

export const DARK_PALETTE: PaletteOptions = {
    mode: 'dark',
    primary: {
        main: '#5196F6',
        light: '#81B5F3',
        dark: '#225DB4',
        contrastText: '#FFFFFF'
    },
    secondary: {
        main: '#81B5F3',
        light: '#DFEDFE',
        dark: '#5196F6',
        contrastText: '#011554'
    },
    error: {
        main: '#F87171',
        light: '#FCA5A5',
        dark: '#DC2626',
        contrastText: '#FFFFFF'
    },
    success: {
        main: '#4ADE80',
        light: '#86EFAC',
        dark: '#16A34A',
        contrastText: '#09090B'
    },
    warning: {
        main: '#FBBF24',
        light: '#FDE68A',
        dark: '#D97706',
        contrastText: '#09090B'
    },
    grey: {
        50: '#0B132B',
        100: '#172036',
        200: '#1E293B',
        300: '#334155',
        400: '#94A3B8',
        500: '#CBD5E1',
        600: '#E2E8F0',
        700: '#F1F5F9',
        800: '#F8FAFC',
        900: '#FFFFFF'
    },
    text: {
        primary: '#F8FAFC',
        secondary: '#CBD5E1',
        disabled: '#94A3B8'
    },
    background: {
        paper: '#131C31',
        default: '#0A0F1D'
    },
    divider: '#1E293B'
};

export const PALETTE: PaletteOptions = LIGHT_PALETTE; // Default export for backwards compatibility
