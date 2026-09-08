import { ComponentTheme } from '@type/common/theme.type';

export const dialogOverrides: ComponentTheme = {
    MuiDialog: {
        styleOverrides: {
            root: { zIndex: 999 },
            paper: ({ theme }) => ({
                borderRadius: 'var(--mui-tokens-radius-lg)',
                maxHeight: 'calc(100% - 4rem)',
                maxWidth: '100%',
                overflowY: 'auto',
                width: '100%',
                [theme.breakpoints.down('sm')]: {
                    borderRadius: 'var(--mui-tokens-radius-lg)',
                    margin: '1rem',
                    maxHeight: 'calc(100% - 2rem)',
                    width: 'calc(100% - 2rem)'
                },
                '&.MuiDialog-paperFullScreen': {
                    borderRadius: 0,
                    height: '100%',
                    margin: 0,
                    maxHeight: '100%',
                    maxWidth: '100%',
                    width: '100%'
                }
            })
        }
    }
}; // Dialog component overrides