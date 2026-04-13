import { Components, Theme } from '@mui/material';
import { SideBarVariant } from '@type/sidebar.types';

// Module augmentation to support custom sidebarVariant prop on MUI Accordion components
declare module '@mui/material/Accordion' {
    interface AccordionOwnProps {
        sidebarVariant?: SideBarVariant;
    }
}

declare module '@mui/material/AccordionSummary' {
    interface AccordionSummaryOwnProps {
        sidebarVariant?: SideBarVariant;
    }
}

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
                style: {
                    color: 'var(--mui-tokens-color-common-white)'
                }
            },
            {
                props: { sidebarVariant: 'light' },
                style: {
                    color: 'inherit'
                }
            }
        ]
    },
    MuiAccordionSummary: {
        styleOverrides: {
            root: {
                minHeight: 'unset',
                padding: '8px 12px',
                borderRadius: '8px',
                '&.Mui-expanded': { minHeight: 'unset' },
                '& .MuiAccordionSummary-content': {
                    margin: 0,
                    alignItems: 'center',
                    gap: '10px',
                    '&.Mui-expanded': { margin: 0 }
                },
                '& .MuiAccordionSummary-expandIconWrapper': {
                    transition: 'transform 200ms'
                }
            }
        },
        variants: [
            {
                props: { sidebarVariant: 'dark' },
                style: {
                    '&:hover': {
                        backgroundColor: 'var(--mui-tokens-color-brand-900)'
                    }
                }
            },
            {
                props: { sidebarVariant: 'light' },
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
                padding: '4px 0 0 0'
            }
        }
    }
};