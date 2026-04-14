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
                '&.MuiInputAdornment-positionStart': { marginRight: 'var(--mui-tokens-spacing-4)' },
                '.common_input_rounded_full &': { borderRadius: 'var(--mui-tokens-radius-full) ' }
            },
            input: { boxSizing: 'border-box' }
        },
        variants: [
            {
                props: { size: 'small' },
                style: {
                    fontSize: 'var(--mui-tokens-fontSize-sm)',
                    height: '100%',
                    lineHeight: 'var(--mui-tokens-lineHeight-sm)',
                    maxHeight: '2.25rem',
                    padding: 'var(--mui-tokens-spacing-3)',
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: { padding: 'var(--mui-tokens-spacing-3)' },
                    '& .MuiInputAdornment-positionStart': {
                        '& svg': {
                            fontSize: 'var(--mui-tokens-fontSize-lg)',
                            height: 'var(--mui-tokens-spacing-6)',
                            width: 'var(--mui-tokens-spacing-6)'
                        }
                    },
                    '& .MuiInputAdornment-positionEnd': {
                        '& svg': {
                            fontSize: 'var(--mui-tokens-fontSize-nm)',
                            height: 'var(--mui-tokens-spacing-5)',
                            width: 'var(--mui-tokens-spacing-5)'
                        }
                    }
                }
            },
            {
                props: { size: 'large' },
                style: {
                    fontSize: 'var(--mui-tokens-fontSize-nm)',
                    height: '100%',
                    lineHeight: 'var(--mui-tokens-lineHeight-md)',
                    maxHeight: '3rem',
                    padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)',
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: { padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)' },
                    '& .MuiInputAdornment-positionStart': {
                        '& svg': {
                            fontSize: 'var(--mui-tokens-fontSize-h5)',
                            height: 'var(--mui-tokens-spacing-7)',
                            width: 'var(--mui-tokens-spacing-7)'
                        }
                    },
                    '& .MuiInputAdornment-positionEnd': {
                        '& svg': {
                            fontSize: 'var(--mui-tokens-fontSize-lg)',
                            height: 'var(--mui-tokens-spacing-6)',
                            width: 'var(--mui-tokens-spacing-6)'
                        }
                    }
                }
            }
        ]
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                backgroundColor: 'var(--mui-tokens-color-neutral-50)',
                '&.Mui-disabled': { backgroundColor: 'var(--mui-tokens-color-neutral-200)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline, &.Mui-focused:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'var(--mui-tokens-stroke-1) solid var(--mui-tokens-color-brand-900)'
                },
                '& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline, &.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                    border: 'var(--mui-tokens-stroke-0) solid var(--mui-tokens-color-neutral-300)'
                },
                '& .MuiInputAdornment-positionStart svg, & .MuiInputAdornment-positionEnd svg': { color: 'var(--mui-tokens-color-neutral-700)' },
                '&.CommonTextarea-input.MuiInputBase-multiline': { backgroundColor: 'var(--mui-tokens-color-common-white)' },
                '& .MuiInputAdornment-root.MuiInputAdornment-positionStart:not(.MuiInputAdornment-hiddenLabel)': {
                    marginTop: 'var(--mui-tokens-spacing-0)'
                }
            },
            input: {
                padding: 0,
                '&::placeholder': { color: 'var(--mui-tokens-color-neutral-700)' }
            }
        }
    },
    MuiFilledInput: {
        defaultProps: { disableUnderline: true },
        styleOverrides: {
            root: {
                backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                borderRadius: 'var(--mui-tokens-radius-md)',
                '&.Mui-focused': { backgroundColor: 'var(--mui-tokens-color-brand-100)' },
                '&.Mui-disabled': { backgroundColor: 'var(--mui-tokens-color-neutral-200)' },
                '& .MuiInputAdornment-positionStart svg': { color: 'var(--mui-tokens-color-brand-950)' },
                '& .MuiInputAdornment-positionEnd svg': { color: 'var(--mui-tokens-color-neutral-900)' },
                '& .MuiInputAdornment-root.MuiInputAdornment-positionStart:not(.MuiInputAdornment-hiddenLabel)': {
                    marginTop: 'var(--mui-tokens-spacing-0) !important'
                }
            },
            input: {
                padding: 0,
                '&::placeholder': { color: 'var(--mui-tokens-color-neutral-600)' }
            }
        }
    }
};