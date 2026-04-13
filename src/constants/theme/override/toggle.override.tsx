import { Components, Theme } from '@mui/material';

export const toggleOverrides: Components<Omit<Theme, 'components'>> = {
    MuiSwitch: {
        styleOverrides: {
            root: {
                width: '2.75rem',
                height: '1.5rem',
                padding: '0',
                '& .MuiSwitch-switchBase': {
                    padding: 'var(--mui-tokens-spacing-1)',
                    color: 'var(--mui-tokens-color-common-white)',
                    '&.Mui-checked': {
                        transform: 'translateX(1.25rem)',
                        color: 'var(--mui-tokens-color-common-white)',
                        '& + .MuiSwitch-track': {
                            backgroundColor: 'var(--mui-tokens-color-brand-900)',
                            opacity: 1
                        }
                    },
                    '&.Mui-disabled': {
                        color: 'var(--mui-tokens-color-common-white)',
                        '& + .MuiSwitch-track': {
                            backgroundColor: 'var(--mui-tokens-color-neutral-200)',
                            opacity: 1
                        }
                    },
                    '&.Mui-checked.Mui-disabled': {
                        '& + .MuiSwitch-track': {
                            backgroundColor: 'var(--mui-tokens-color-neutral-400)',
                            opacity: 1
                        }
                    },
                    '&:hover': {
                        backgroundColor: 'transparent'
                    }
                }
            },
            thumb: {
                width: '1.25rem',
                height: '1.25rem',
                boxShadow: 'none'
            },
            track: {
                backgroundColor: 'var(--mui-tokens-color-neutral-300)',
                borderRadius: 'var(--mui-tokens-radius-lg)',
                opacity: 1
            }
        }
    }
};