import { Components, Theme } from '@mui/material/styles';

export const tabOverrides: Components<Omit<Theme, 'components'>> = {
    MuiTabs: {
        styleOverrides: {
            root: {
                minHeight: 'unset'
            }
        },
        variants: [
            {
                props: { tabVariant: 'filled' },
                style: {
                    width: 'fit-content',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '10px',
                    padding: '4px',
                    '& .MuiTabs-indicator': { display: 'none' }
                }
            },
            {
                props: { tabVariant: 'filled', orientation: 'vertical' },
                style: { gap: '4px' }
            },
            {
                props: { tabVariant: 'outlined' },
                style: {
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--mui-tokens-color-brand-900)',
                        height: '2px'
                    }
                }
            },
            {
                props: { tabVariant: 'outlined', orientation: 'vertical' },
                style: {
                    borderRight: '2px solid #E5E7EB',
                    '& .MuiTabs-indicator': { width: '2px' }
                }
            },
            {
                props: { tabVariant: 'pill' },
                style: {
                    width: 'fit-content',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '999px',
                    padding: '4px',
                    '& .MuiTabs-indicator': { display: 'none' }
                }
            },
            {
                props: { tabVariant: 'pill', orientation: 'vertical' },
                style: { gap: '4px' }
            },
            {
                props: { tabVariant: 'soft' },
                style: {
                    width: 'fit-content',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '10px',
                    padding: '4px',
                    '& .MuiTabs-indicator': { display: 'none' }
                }
            },
            {
                props: { tabVariant: 'soft', orientation: 'vertical' },
                style: { gap: '4px' }
            }
        ]
    },
    MuiTab: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                minHeight: 'unset',
                minWidth: 'unset',
                padding: '7px 10px',
                fontSize: '13px',
                fontWeight: 700,
                transition: 'all 0.2s ease',
                color: 'var(--mui-tokens-color-neutral-400)',
                backgroundColor: 'transparent',
                boxShadow: 'none',
                gap: '0.375rem',
                '& .MuiTab-iconWrapper': {
                    color: 'var(--mui-tokens-color-neutral-400)',
                    marginRight: 0
                },
                '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
            }
        },
        variants: [
            {
                props: { tabVariant: 'filled' },
                style: {
                    borderRadius: '8px',
                    '&.Mui-selected': {
                        color: 'var(--mui-tokens-color-common-white)',
                        backgroundColor: 'var(--mui-tokens-color-brand-900)',
                        boxShadow: 'none',
                        '& .MuiTab-iconWrapper': {
                            color: 'var(--mui-tokens-color-common-white)'
                        },
                        '&:hover': {
                            backgroundColor: 'var(--mui-tokens-color-brand-900)'
                        }
                    }
                }
            },
            {
                props: { tabVariant: 'outlined' },
                style: {
                    borderRadius: 0,
                    '&.Mui-selected': {
                        color: 'var(--mui-tokens-color-neutral-700)',
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                        '& .MuiTab-iconWrapper': {
                            color: 'var(--mui-tokens-color-brand-900)'
                        },
                        '&:hover': {
                            backgroundColor: 'transparent'
                        }
                    }
                }
            },
            {
                props: { tabVariant: 'pill' },
                style: {
                    borderRadius: '999px',
                    '&.Mui-selected': {
                        color: 'var(--mui-tokens-color-common-white)',
                        backgroundColor: 'var(--mui-tokens-color-brand-900)',
                        boxShadow: 'none',
                        '& .MuiTab-iconWrapper': {
                            color: 'var(--mui-tokens-color-common-white)'
                        },
                        '&:hover': {
                            backgroundColor: 'var(--mui-tokens-color-brand-900)'
                        }
                    }
                }
            },
            {
                props: { tabVariant: 'soft' },
                style: {
                    borderRadius: '8px',
                    '&.Mui-selected': {
                        color: 'var(--mui-tokens-color-neutral-700)',
                        backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
                        '& .MuiTab-iconWrapper': {
                            color: 'var(--mui-tokens-color-brand-900)'
                        },
                        '&:hover': {
                            backgroundColor: 'var(--mui-tokens-color-common-white)'
                        }
                    }
                }
            }
        ]
    }
}; // tabs overides