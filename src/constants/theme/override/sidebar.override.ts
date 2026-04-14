import { ComponentTheme } from '@type/common/theme.type';

export const sidebarOverrides: ComponentTheme = {
    MuiAccordion: {
        defaultProps: {
            disableGutters: true
        },
        styleOverrides: {
            root: {
                backgroundColor: 'transparent',
                backgroundImage: 'none',
                boxShadow: 'none',
                margin: 0,
                '&:before': {
                    display: 'none'
                },
                '&.Mui-expanded': {
                    margin: 0
                },
                '&.sidebar_dark': {
                    color: 'var(--mui-tokens-color-common-white)'
                },
                '&.sidebar_light': {
                    color: 'inherit'
                }
            }
        }
    },
    MuiAccordionSummary: {
        styleOverrides: {
            root: {
                minHeight: 'unset',
                padding: 'var(--mui-tokens-spacing-3) var(--mui-tokens-spacing-4)',
                borderRadius: 'var(--mui-tokens-radius-md)',
                '&.Mui-expanded': {
                    minHeight: 'unset'
                },
                '& .MuiAccordionSummary-content': {
                    margin: 0,
                    alignItems: 'center',
                    gap: '10px',
                    '&.Mui-expanded': {
                        margin: 0
                    }
                },
                '& .MuiAccordionSummary-expandIconWrapper': {
                    transition: 'transform 200ms'
                },
                '&.sidebar_dark:hover': {
                    backgroundColor: 'var(--mui-tokens-color-brand-900)'
                },
                '&.sidebar_light:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)'
                }
            }
        }
    },
    MuiAccordionDetails: {
        styleOverrides: {
            root: {
                padding: 'var(--mui-tokens-spacing-2) 0 0 0'
            }
        }
    }
};