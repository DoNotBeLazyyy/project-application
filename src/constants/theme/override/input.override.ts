import { ComponentTheme } from '@type/common/theme.type';

export const inputOverrides: ComponentTheme = {
    MuiTextField: {
        defaultProps: {
            size: 'large',
            variant: 'filled'
        }
    },
    MuiInputBase: {
        styleOverrides: {
            root: {
                borderRadius: 'var(--mui-tokens-radius-md)',
                boxSizing: 'border-box',
                '&.Mui-disabled': {
                    color: 'var(--mui-tokens-color-neutral-400)',
                    WebkitTextFillColor: 'var(--mui-tokens-color-neutral-400)'
                },
                '&.MuiInputAdornment-positionStart': {
                    marginRight: 'var(--mui-tokens-spacing-4)'
                },
                '.common_input_rounded_full &': {
                    borderRadius: 'var(--mui-tokens-radius-full) '
                }
            },
            input: {
                boxSizing: 'border-box'
            }
        },
        variants: [
            {
                props: {
                    size: 'small'
                },
                style: ({ theme }) => ({
                    height: '100%',
                    maxHeight: '2.25rem',
                    padding: 'var(--mui-tokens-spacing-3)',
                    ...theme.typography.bodySmall,
                    '&.MuiSelect-root': { padding: 0 },
                    '& .MuiSelect-select': { padding: 'var(--mui-tokens-spacing-3)' },
                    '&.MuiInputBase-multiline': {
                        alignItems: 'flex-start',
                        height: 'auto',
                        minHeight: '8.375rem',
                        minWidth: '17rem',
                        width: 'auto'
                    },
                    '&.common_textarea_input.MuiInputBase-multiline': {
                        minHeight: '8.375rem',
                        minWidth: '17rem',
                        width: '100%',
                        padding: 'var(--mui-tokens-spacing-3) var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-8) var(--mui-tokens-spacing-3)'
                    },
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: {
                        padding: 'var(--mui-tokens-spacing-3)'
                    },
                    '& .MuiInputAdornment-positionStart': {
                        '& svg': {
                            height: '1.25rem',
                            width: '1.25rem'
                        }
                    },
                    '& .MuiInputAdornment-positionEnd': {
                        '& svg': {
                            height: '1rem',
                            width: '1rem'
                        }
                    }
                })
            },
            {
                props: {
                    size: 'large'
                },
                style: ({ theme }) => ({
                    height: '100%',
                    maxHeight: '3rem',
                    padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)',
                    ...theme.typography.bodyNormal,
                    '&.MuiSelect-root': { padding: 0 },
                    '& .MuiSelect-select': { padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)' },
                    '&.MuiInputBase-multiline': {
                        alignItems: 'flex-start',
                        height: 'auto',
                        minHeight: '10.625rem',
                        minWidth: '16.5rem',
                        width: 'auto'
                    },
                    '&.common_textarea_input.MuiInputBase-multiline': {
                        minHeight: '10.625rem',
                        minWidth: '16.5rem',
                        width: '100%',
                        padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-8) var(--mui-tokens-spacing-5)'
                    },
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: {
                        padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)'
                    },
                    '& .MuiInputAdornment-positionStart': {
                        '& svg': {
                            height: '1.5rem',
                            width: '1.5rem'
                        }
                    },
                    '& .MuiInputAdornment-positionEnd': {
                        '& svg': {
                            height: '1.25rem',
                            width: '1.25rem'
                        }
                    }
                })
            }
        ]
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                backgroundColor: 'var(--mui-tokens-color-neutral-50)',
                '&.Mui-disabled': {
                    backgroundColor: 'var(--mui-tokens-color-neutral-200)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline, &.Mui-focused:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'var(--mui-tokens-stroke-1) solid var(--mui-tokens-color-brand-900)'
                },
                '& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline, &.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                    border: 'var(--mui-tokens-stroke-0) solid var(--mui-tokens-color-neutral-300)'
                },
                '& .MuiInputAdornment-positionStart svg, & .MuiInputAdornment-positionEnd svg': {
                    color: 'var(--mui-tokens-color-neutral-700)'
                },
                '&.common_textarea_input.MuiInputBase-multiline': {
                    backgroundColor: 'var(--mui-tokens-color-common-white)'
                },
                '& .MuiInputAdornment-root.MuiInputAdornment-positionStart:not(.MuiInputAdornment-hiddenLabel)': {
                    marginTop: 'var(--mui-tokens-spacing-0)'
                }
            },
            input: {
                padding: 0,
                '&::placeholder': {
                    color: 'var(--mui-tokens-color-neutral-700)'
                }
            }
        }
    },
    MuiFilledInput: {
        defaultProps: {
            disableUnderline: true
        },
        styleOverrides: {
            root: {
                backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                borderRadius: 'var(--mui-tokens-radius-md)',
                '&.Mui-focused': {
                    backgroundColor: 'var(--mui-tokens-color-brand-100)'
                },
                '&.Mui-disabled': {
                    backgroundColor: 'var(--mui-tokens-color-neutral-200)'
                },
                '& .MuiInputAdornment-positionStart svg': {
                    color: 'var(--mui-tokens-color-brand-950)'
                },
                '& .MuiInputAdornment-positionEnd svg': {
                    color: 'var(--mui-tokens-color-neutral-900)'
                },
                '& .MuiInputAdornment-root.MuiInputAdornment-positionStart:not(.MuiInputAdornment-hiddenLabel)': {
                    marginTop: 'var(--mui-tokens-spacing-0) !important'
                }
            },
            input: {
                padding: 0,
                '&::placeholder': {
                    color: 'var(--mui-tokens-color-neutral-600)'
                }
            }
        }
    }
}; // TextField component overrides