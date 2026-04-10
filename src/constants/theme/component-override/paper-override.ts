import { ComponentTheme } from '@type/common.type';

export const paperOverrides: ComponentTheme = {
    MuiPaper: {
        styleOverrides: {
            root: { borderRadius: 'var(--mui-tokens-radius-md)' }
        }
    }
}; // Paper component overrides