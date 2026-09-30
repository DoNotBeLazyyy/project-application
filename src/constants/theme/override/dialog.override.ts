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
                    borderRadius: 0,
                    height: '100dvh',
                    margin: 0,
                    maxHeight: '100dvh',
                    maxWidth: '100vw',
                    width: '100vw'
                },
                '&.MuiDialog-paperFullScreen': {
                    borderRadius: 0,
                    height: '100dvh',
                    margin: 0,
                    maxHeight: '100dvh',
                    maxWidth: '100vw',
                    width: '100vw'
                }
            })
        }
    }
}; // Dialog component overrides