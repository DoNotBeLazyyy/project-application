import {
    BORDER_NEUTRAL, buildInputStateStyles, INPUT_HEIGHT_LARGE, INPUT_HEIGHT_MEDIUM, INPUT_HEIGHT_SMALL, INPUT_HEIGHT_TOUCH,
    INPUT_PADDING_LARGE, INPUT_PADDING_MEDIUM, INPUT_PADDING_SMALL, SURFACE_DISABLED
} from '@constants/theme/input-state.constant';
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
                '&.MuiInputBase-readOnly, &[readonly], &:has(input[readonly]), &:has(textarea[readonly]), &.common_input_readonly': {
                    color: 'var(--mui-tokens-color-neutral-900, #0f172a)',
                    WebkitTextFillColor: 'var(--mui-tokens-color-neutral-900, #0f172a)',
                    backgroundColor: 'transparent !important',
                    boxShadow: 'none !important',
                    border: 'none !important',
                    paddingLeft: '0 !important',
                    paddingRight: '0 !important'
                },
                '&.Mui-disabled .MuiInputAdornment-root svg, &.Mui-disabled .MuiSelect-icon': {
                    color: 'var(--mui-tokens-color-neutral-400) !important'
                },
                '&.MuiInputBase-readOnly .MuiInputAdornment-root, &[readonly] .MuiInputAdornment-root, &:has(input[readonly]) .MuiInputAdornment-root, &:has(textarea[readonly]) .MuiInputAdornment-root, &.common_input_readonly .MuiInputAdornment-root, &.MuiInputBase-readOnly .MuiSelect-icon, &.common_input_readonly .MuiSelect-icon': {
                    display: 'none !important'
                },
                '&.Mui-disabled .MuiChip-root': {
                    backgroundColor: 'var(--mui-tokens-color-common-white) !important',
                    borderColor: 'var(--mui-tokens-color-brand-500) !important',
                    color: 'var(--mui-tokens-color-brand-950) !important',
                    opacity: '1 !important',
                    '& .MuiChip-label': {
                        color: 'var(--mui-tokens-color-brand-950) !important',
                        opacity: '1 !important',
                        WebkitTextFillColor: 'var(--mui-tokens-color-brand-950) !important'
                    },
                    '& .MuiChip-deleteIcon': {
                        color: 'var(--mui-tokens-color-brand-600) !important',
                        opacity: '0.4 !important',
                        pointerEvents: 'none'
                    }
                },
                '&.MuiInputBase-readOnly .MuiChip-root, &.common_input_readonly .MuiChip-root': {
                    backgroundColor: 'transparent !important',
                    borderColor: 'transparent !important',
                    color: 'var(--mui-tokens-color-neutral-900, #0f172a) !important',
                    opacity: '1 !important',
                    padding: 0,
                    '& .MuiChip-label': {
                        color: 'var(--mui-tokens-color-neutral-900, #0f172a) !important',
                        opacity: '1 !important',
                        padding: 0,
                        WebkitTextFillColor: 'var(--mui-tokens-color-neutral-900, #0f172a) !important'
                    },
                    '& .MuiChip-deleteIcon': {
                        display: 'none !important'
                    }
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
                    height: INPUT_HEIGHT_SMALL,
                    maxHeight: INPUT_HEIGHT_SMALL,
                    padding: INPUT_PADDING_SMALL,
                    ...theme.typography.bodySmall,
                    '@media (pointer: coarse)': {
                        height: INPUT_HEIGHT_TOUCH,
                        maxHeight: INPUT_HEIGHT_TOUCH
                    },
                    '&.MuiSelect-root': { padding: 0 },
                    '& .MuiSelect-select': {
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        display: 'flex',
                        height: '100%',
                        padding: INPUT_PADDING_SMALL
                    },
                    '&.MuiAutocomplete-inputRoot': {
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: INPUT_HEIGHT_SMALL,
                        padding: 'var(--mui-tokens-spacing-1) var(--mui-tokens-spacing-2)'
                    },
                    '&.MuiInputBase-multiline': {
                        alignItems: 'flex-start',
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: '8.375rem',
                        minWidth: 'min(17rem, 100%)',
                        width: 'auto'
                    },
                    '&.common_textarea_input.MuiInputBase-multiline': {
                        minHeight: '8.375rem',
                        minWidth: 'min(17rem, 100%)',
                        width: '100%',
                        padding: 'var(--mui-tokens-spacing-3) var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-8) var(--mui-tokens-spacing-3)'
                    },
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: {
                        padding: INPUT_PADDING_SMALL
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
                    size: 'medium'
                },
                style: ({ theme }) => ({
                    height: INPUT_HEIGHT_MEDIUM,
                    maxHeight: INPUT_HEIGHT_MEDIUM,
                    padding: INPUT_PADDING_MEDIUM,
                    ...theme.typography.bodyNormal,
                    '&.MuiSelect-root': { padding: 0 },
                    '& .MuiSelect-select': {
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        display: 'flex',
                        height: '100%',
                        padding: INPUT_PADDING_MEDIUM
                    },
                    '&.MuiAutocomplete-inputRoot': {
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: INPUT_HEIGHT_MEDIUM,
                        padding: 'var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-3)'
                    },
                    '&.MuiInputBase-multiline': {
                        alignItems: 'flex-start',
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: '9.5rem',
                        minWidth: 'min(16.5rem, 100%)',
                        width: 'auto'
                    },
                    '&.common_textarea_input.MuiInputBase-multiline': {
                        minHeight: '9.5rem',
                        minWidth: 'min(16.5rem, 100%)',
                        width: '100%',
                        padding: 'var(--mui-tokens-spacing-3) var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-8) var(--mui-tokens-spacing-4)'
                    },
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: {
                        padding: INPUT_PADDING_MEDIUM
                    },
                    '& .MuiInputAdornment-positionStart': {
                        '& svg': {
                            height: '1.375rem',
                            width: '1.375rem'
                        }
                    },
                    '& .MuiInputAdornment-positionEnd': {
                        '& svg': {
                            height: '1.125rem',
                            width: '1.125rem'
                        }
                    }
                })
            },
            {
                props: {
                    size: 'large'
                },
                style: ({ theme }) => ({
                    height: INPUT_HEIGHT_LARGE,
                    maxHeight: INPUT_HEIGHT_LARGE,
                    padding: INPUT_PADDING_LARGE,
                    ...theme.typography.bodyNormal,
                    '&.MuiSelect-root': { padding: 0 },
                    '& .MuiSelect-select': {
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        display: 'flex',
                        height: '100%',
                        padding: INPUT_PADDING_LARGE
                    },
                    '&.MuiAutocomplete-inputRoot': {
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: INPUT_HEIGHT_LARGE,
                        padding: 'var(--mui-tokens-spacing-1) var(--mui-tokens-spacing-3)'
                    },
                    '&.MuiInputBase-multiline': {
                        alignItems: 'flex-start',
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: '10.625rem',
                        minWidth: 'min(16.5rem, 100%)',
                        width: 'auto'
                    },
                    '&.common_textarea_input.MuiInputBase-multiline': {
                        minHeight: '10.625rem',
                        minWidth: 'min(16.5rem, 100%)',
                        width: '100%',
                        padding: 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-8) var(--mui-tokens-spacing-5)'
                    },
                    [`
                        &.MuiInputBase-adornedStart,
                        &.MuiInputBase-adornedEnd
                    `]: {
                        padding: INPUT_PADDING_LARGE
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
                ...buildInputStateStyles('MuiOutlinedInput-notchedOutline'),
                '& .MuiInputAdornment-positionStart svg, & .MuiInputAdornment-positionEnd svg': {
                    color: 'var(--mui-tokens-color-neutral-700)'
                },
                '&.Mui-error.common_textarea_input.MuiInputBase-multiline': {
                    backgroundColor: 'var(--mui-tokens-color-red-100)'
                },
                '&.common_textarea_input.MuiInputBase-multiline': {
                    backgroundColor: 'var(--mui-tokens-color-common-white)'
                },
                '&.Mui-disabled.common_textarea_input.MuiInputBase-multiline, &.MuiInputBase-readOnly.common_textarea_input.MuiInputBase-multiline, &[readonly].common_textarea_input.MuiInputBase-multiline, &:has(textarea[readonly]).common_textarea_input.MuiInputBase-multiline, &.common_input_readonly.common_textarea_input.MuiInputBase-multiline': {
                    backgroundColor: SURFACE_DISABLED
                },
                [`
                    &.common_textarea_input.MuiInputBase-multiline:not(.Mui-focused):not(.Mui-error):not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly]):not(:has(textarea[readonly])):not(.common_input_readonly) .MuiOutlinedInput-notchedOutline,
                    &.common_textarea_input.MuiInputBase-multiline:not(.Mui-focused):not(.Mui-error):not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly]):not(:has(textarea[readonly])):not(.common_input_readonly):hover .MuiOutlinedInput-notchedOutline
                `]: {
                    border: BORDER_NEUTRAL
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
                ...buildInputStateStyles(),
                borderRadius: 'var(--mui-tokens-radius-md)',
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
                    color: 'var(--mui-tokens-color-neutral-700)'
                }
            }
        }
    }
}; // TextField component overrides