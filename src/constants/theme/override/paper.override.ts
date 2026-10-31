import { ComponentTheme } from '@type/common/theme.type';

export const paperOverrides: ComponentTheme = {
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 'var(--mui-tokens-radius-md)',
                backgroundColor: 'var(--mui-palette-background-paper)',
                color: 'var(--mui-palette-text-primary)'
            }
        }
    }
}; // Paper component overrides