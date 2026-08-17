import { ComponentTheme } from '@type/common/theme.type';

export const dialogOverrides: ComponentTheme = {
    MuiDialog: {
        styleOverrides: {
            root: { zIndex: 999 },
            paper: {
                maxHeight: 'calc(100% - 4rem)',
                maxWidth: '100%',
                overflowY: 'auto',
                width: '100%',
                '&.MuiDialog-paperFullScreen': {
                    borderRadius: 0,
                    maxHeight: '100%'
                }
            }
        }
    }
}; // Dialog component overrides