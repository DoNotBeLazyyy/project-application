import { ComponentTheme } from '@type/common/theme.type';

export const buttonOverrides: ComponentTheme = {
    MuiButton: {
        defaultProps: {
            color: 'primary',
            disableElevation: true,
            disableFocusRipple: true,
            disableRipple: true,
            size: 'medium',
            variant: 'contained'
        },
        styleOverrides: {
            root: {
                alignItems: 'center',
                border: 'var(--mui-tokens-stroke-1) solid transparent',
                display: 'inline-flex',
                justifyContent: 'center',
                minWidth: 'unset',
                textTransform: 'none',
                '& .MuiButton-icon': {
                    margin: 0
                }
            }
        },
        variants: [
            {
                props: {
                    size: 'xsmall'
                },
                style: ({ theme }) => ({
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    gap: 'var(--mui-tokens-spacing-2)',
                    maxHeight: '1.5rem',
                    padding: 'var(--mui-tokens-spacing-2)',
                    ...theme.typography.bodyExtraSmallBold,
                    '& .MuiButton-icon svg': {
                        height: '1rem',
                        width: '1rem'
                    }
                })
            },
            {
                props: {
                    size: 'small'
                },
                style: ({ theme }) => ({
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    gap: 'var(--mui-tokens-spacing-3)',
                    maxHeight: '2.25rem',
                    padding: 'var(--mui-tokens-spacing-3)',
                    ...theme.typography.bodySmallBold,
                    '& .MuiButton-icon svg': {
                        height: '1.25rem',
                        width: '1.25rem'
                    }
                })
            },
            {
                props: {
                    size: 'medium'
                },
                style: ({ theme }) => ({
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    gap: 'var(--mui-tokens-spacing-4)',
                    maxHeight: '3rem',
                    padding: 'var(--mui-tokens-spacing-4)',
                    ...theme.typography.bodyNormalBold,
                    '& .MuiButton-icon svg': {
                        height: '1.5rem',
                        width: '1.5rem'
                    }
                })
            },
            {
                props: {
                    size: 'large'
                },
                style: ({ theme }) => ({
                    borderRadius: 'var(--mui-tokens-radius-lg)',
                    gap: 'var(--mui-tokens-spacing-5)',
                    maxHeight: '3.5rem',
                    padding: 'var(--mui-tokens-spacing-5)',
                    ...theme.typography.bodyMediumBold,
                    '& .MuiButton-icon svg': {
                        height: '1.5rem',
                        width: '1.5rem'
                    }
                })
            },
            {
                props: {
                    color: 'primary',
                    variant: 'contained'
                },
                style: {
                    backgroundColor: 'var(--mui-palette-primary-main)',
                    color: 'var(--mui-palette-primary-contrastText)',
                    '&:hover': {
                        backgroundColor: 'var(--mui-palette-primary-dark)',
                        boxShadow: '0 0 20px 0 #00000040'
                    },
                    '&:active': {
                        backgroundColor: 'var(--mui-palette-primary-light)',
                        boxShadow: 'none'
                    },
                    '&.Mui-disabled': {
                        backgroundColor: 'var(--mui-palette-action-disabledBackground)',
                        color: 'var(--mui-palette-action-disabled)'
                    },
                    '&.is_loading.Mui-disabled': {
                        backgroundColor: 'var(--mui-palette-primary-main)',
                        color: 'var(--mui-palette-primary-contrastText)'
                    }
                }
            },
            {
                props: {
                    color: 'secondary',
                    variant: 'contained'
                },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-neutral-200)',
                    color: 'var(--mui-tokens-color-neutral-900)',
                    '&:hover': {
                        backgroundColor: 'var(--mui-tokens-color-neutral-300)',
                        boxShadow: '0 0 20px 0 #A9CEF740'
                    },
                    '&:active': {
                        backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                        borderColor: 'var(--mui-tokens-color-neutral-300)',
                        boxShadow: '0 0 10px 0 #00000040 inset'
                    },
                    '&.Mui-disabled': {
                        backgroundColor: 'var(--mui-tokens-color-neutral-200)',
                        color: 'var(--mui-tokens-color-neutral-400)'
                    },
                    '&.is_loading.Mui-disabled': {
                        backgroundColor: 'var(--mui-tokens-color-neutral-300)',
                        color: 'var(--mui-tokens-color-neutral-800)'
                    }
                }
            },
            {
                props: {
                    color: 'primary',
                    variant: 'outlined'
                },
                style: {
                    borderColor: 'var(--mui-palette-primary-main)',
                    color: 'var(--mui-palette-primary-main)',
                    '&:hover': {
                        backgroundColor: 'rgba(81, 150, 246, 0.12)',
                        borderColor: 'var(--mui-palette-primary-main)'
                    },
                    '&:active': {
                        backgroundColor: 'rgba(81, 150, 246, 0.24)',
                        borderColor: 'var(--mui-palette-primary-main)',
                        boxShadow: '0 0 10px 0 #00000040 inset'
                    },
                    '&.Mui-disabled': {
                        borderColor: 'var(--mui-tokens-color-neutral-400)',
                        color: 'var(--mui-tokens-color-neutral-400)'
                    },
                    '&.is_loading.Mui-disabled': {
                        borderColor: 'var(--mui-palette-primary-main)'
                    }
                }
            },
            {
                props: {
                    color: 'primary',
                    variant: 'text'
                },
                style: {
                    color: 'var(--mui-palette-primary-main)',
                    '&:hover': {
                        backgroundColor: 'rgba(81, 150, 246, 0.12)'
                    },
                    '&:active': {
                        backgroundColor: 'rgba(81, 150, 246, 0.24)'
                    },
                    '&.Mui-disabled': {
                        color: 'var(--mui-tokens-color-neutral-400)'
                    },
                    '&.is_loading.Mui-disabled': {
                        borderColor: 'var(--mui-palette-primary-main)'
                    }
                }
            },
            {
                props: {
                    color: 'error',
                    variant: 'contained'
                },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-red-500)',
                    color: 'var(--mui-tokens-color-common-white)',
                    '&:hover': {
                        backgroundColor: 'var(--mui-tokens-color-red-600)',
                        boxShadow: '0 0 20px 0 #00000040'
                    },
                    '&:active': {
                        backgroundColor: 'var(--mui-tokens-color-red-300)',
                        boxShadow: 'none'
                    },
                    '&.Mui-disabled': {
                        backgroundColor: 'var(--mui-palette-action-disabledBackground)',
                        color: 'var(--mui-palette-action-disabled)'
                    },
                    '&.is_loading.Mui-disabled': {
                        backgroundColor: 'var(--mui-tokens-color-red-500)',
                        color: 'var(--mui-tokens-color-common-white)'
                    }
                }
            },
            {
                props: {
                    color: 'error',
                    variant: 'outlined'
                },
                style: {
                    borderColor: 'var(--mui-tokens-color-red-500)',
                    color: 'var(--mui-tokens-color-red-500)',
                    '&:hover': {
                        backgroundColor: '#FFDDDD33',
                        borderColor: 'var(--mui-tokens-color-red-500)'
                    },
                    '&:active': {
                        backgroundColor: '#FCA5A580',
                        borderColor: 'var(--mui-tokens-color-red-500)',
                        boxShadow: '0 0 10px 0 #00000040 inset'
                    },
                    '&.Mui-disabled': {
                        borderColor: 'var(--mui-tokens-color-neutral-400)',
                        color: 'var(--mui-tokens-color-neutral-400)'
                    },
                    '&.is_loading.Mui-disabled': {
                        borderColor: 'var(--mui-tokens-color-red-500)'
                    }
                }
            },
            {
                props: {
                    variant: 'outlined',
                    color: 'lightGrey'
                },
                style: {
                    '&.MuiButton-outlined': {
                        borderColor: 'var(--mui-palette-grey-300)',
                        color: 'var(--mui-palette-grey-500)'
                    },
                    '&:hover': {
                        borderColor: 'var(--mui-palette-grey-400)',
                        backgroundColor: 'rgba(81, 150, 246, 0.12)'
                    }
                }
            }
        ]
    }
}; // Button component overrides
