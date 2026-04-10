import { Components, Theme } from '@mui/material';

export const cardOverrides: Components<Omit<Theme, 'components'>> = {
    MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
            root: {
                backgroundColor: 'var(--mui-palette-common-white)',
                borderRadius: 'calc(var(--mui-tokens-radius-lg) + var(--mui-tokens-radius-sm))',
                boxShadow: '0px 0px 20px 0px #00000026',
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--mui-tokens-spacing-5) + var(--mui-tokens-radius-sm))',
                padding: 'calc(var(--mui-tokens-spacing-5) + var(--mui-tokens-radius-sm))'
            }
        },
        variants: [
            {
                props: { variant: 'xsmall' },
                style: {
                    borderRadius: '5px',
                    gap: '1.625rem'
                }
            },
            {
                props: { variant: 'small' },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-lg)',
                    gap: 'calc(var(--mui-tokens-spacing-4) + var(--mui-tokens-radius-sm))'
                }
            },
            {
                props: { variant: 'medium' },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-lg)',
                    gap: 'var(--mui-tokens-spacing-4)'
                }
            },
            {
                props: { variant: 'large' },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-lg)',
                    gap: '6.25rem'
                }
            }
        ]
    },
    MuiCardHeader: {
        styleOverrides: {
            root: { padding: 0 },
            title: {
                color: 'var(--mui-tokens-color-neutral-900)',
                fontSize: 'var(--mui-tokens-fontSize-h6)',
                fontWeight: 'var(--mui-tokens-fontWeight-bold)',
                lineHeight: 'var(--mui-tokens-lineHeight-h6)'
            },
            subheader: {
                color: 'var(--mui-tokens-color-neutral-500)',
                fontSize: 'var(--mui-tokens-fontSize-xs)',
                lineHeight: 'var(--mui-tokens-lineHeight-xs)'
            }
        }
    }
};