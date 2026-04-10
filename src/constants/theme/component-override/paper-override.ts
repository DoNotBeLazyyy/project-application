import { Components, Theme } from '@mui/material';

export const paperOverrides: Components<Omit<Theme, 'components'>> = {
    MuiPaper: {
        styleOverrides: {
            root: { borderRadius: 'var(--mui-tokens-radius-md)' }
        }
    }
}; // Paper component overrides