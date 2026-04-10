import { ComponentTheme } from '@type/common.type';

export const cardOverrides: ComponentTheme = {
    MuiCard: {
        defaultProps: {
            elevation: 0,
            variant: 'medium'
        },
        styleOverrides: {
            root: {
                backgroundColor: 'var(--mui-palette-common-white)',
                borderRadius: 'var(--mui-tokens-radius-lg)',
                boxShadow: '0px 0px 20px 0px #00000026',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mui-tokens-spacing-6)',
                padding: 'var(--mui-tokens-spacing-6)'
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
                style: { gap: 'var(--mui-tokens-spacing-5)' }
            },
            {
                props: { variant: 'medium' },
                style: { gap: 'var(--mui-tokens-spacing-4)' }
            },
            {
                props: { variant: 'large' },
                style: { gap: '6.25rem' }
            }
        ]
    },
    MuiCardHeader: {
        styleOverrides: {
            root: { padding: 0 },
            title: ({ theme }) => ({
                color: 'var(--mui-tokens-color-neutral-900)',
                ...theme.typography.h6
            }),
            subheader: ({ theme }) => ({
                color: 'var(--mui-tokens-color-neutral-500)',
                ...theme.typography.bodyExtraSmall
            })
        }
    }
};