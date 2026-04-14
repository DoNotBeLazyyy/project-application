import { Components, Theme } from '@mui/material';

export const sidebarOverrides: Components<Omit<Theme, 'components'>> = {
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
                '&:before': { display: 'none' },
                '&.Mui-expanded': { margin: 0 }
            }
        },
        variants: [
            {
                props: { sidebarVariant: 'dark' },
                style: { color: 'var(--mui-tokens-color-common-white)' }
            },
            {
                props: { sidebarVariant: 'light' },
                style: { color: 'inherit' }
            }
        ]
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
                }
            }
        },
        variants: [
            {
                props: {
                    sidebarVariant: 'dark'
                },
                style: {
                    '&:hover': {
                        backgroundColor: 'var(--mui-tokens-color-brand-900)'
                    }
                }
            },
            {
                props: {
                    sidebarVariant: 'light'
                },
                style: {
                    '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.04)'
                    }
                }
            }
        ]
    },
    MuiAccordionDetails: {
        styleOverrides: {
            root: {
                padding: 'var(--mui-tokens-spacing-2) 0 0 0'
            }
        }
    }
};