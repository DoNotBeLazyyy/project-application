import { ComponentTheme } from '@type/common.type';

export const dialogOverrides: ComponentTheme = {
    MuiDialog: {
        styleOverrides: {
            root: { zIndex: 9999 },
            paper: {
                maxHeight: 'calc(100% - 4rem)',
                overflowY: 'auto',
                width: '100%'
            }
        }
    }
}; // Dialog component overrides