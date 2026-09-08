import { ComponentTheme } from '@type/common/theme.type';

export const cardOverrides: ComponentTheme = {
    MuiCard: {
        defaultProps: {
            elevation: 0,
            variant: 'medium'
        },
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: 'var(--mui-palette-common-white)',
                borderRadius: 'var(--mui-tokens-radius-lg)',
                boxShadow: '0px 0px 20px 0px #00000026',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mui-tokens-spacing-6)',
                padding: 'var(--mui-tokens-spacing-6)',
                [theme.breakpoints.down('md')]: {
                    gap: 'var(--mui-tokens-spacing-4)',
                    padding: 'var(--mui-tokens-spacing-4)'
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
        },
        variants: [
            {
                props: {
                    variant: 'xsmall'
                },
                style: {
                    borderRadius: '5px',
                    gap: '1.625rem'
                }
            },
            {
                props: {
                    variant: 'small'
                },
                style: {
                    gap: 'var(--mui-tokens-spacing-5)'
                }
            },
            {
                props: {
                    variant: 'medium'
                },
                style: {
                    gap: 'var(--mui-tokens-spacing-4)'
                }
            },
            {
                props: {
                    variant: 'large'
                },
                style: ({ theme }) => ({
                    gap: '6.25rem',
                    [theme.breakpoints.down('md')]: {
                        gap: 'var(--mui-tokens-spacing-6)'
                    }
                })
            }
        ]
    },
    MuiCardHeader: {
        styleOverrides: {
            root: {
                alignItems: 'flex-start',
                display: 'flex',
                flexDirection: 'row',
                gap: 'var(--mui-tokens-spacing-3)',
                justifyContent: 'space-between',
                padding: 0
            },
            content: {
                flex: '1 1 auto',
                minWidth: 0
            },
            action: {
                alignSelf: 'flex-start',
                flexShrink: 0,
                margin: 0,
                minWidth: 0
            },
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
}; // Card component overrides