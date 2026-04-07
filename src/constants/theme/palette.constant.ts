import { TOKENS } from '@constants/theme/tokens.constant'; // Tokens dependency
import { PaletteOptions } from '@mui/material'; // Mui dependency

export const PALETTE: PaletteOptions = {
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
}; // Palette configuration