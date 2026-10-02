import {
    buildInputStateStyles,
    INPUT_HEIGHT_LARGE,
    INPUT_HEIGHT_MEDIUM,
    INPUT_HEIGHT_SMALL,
    INPUT_HEIGHT_TOUCH,
    INPUT_PADDING_LARGE,
    INPUT_PADDING_MEDIUM,
    INPUT_PADDING_SMALL
} from '@constants/theme/input-state.constant';
import { ComponentTheme } from '@type/common/theme.type';
import type {} from '@mui/x-date-pickers/themeAugmentation';

const pickersInputRootStyles = ({ theme }: { theme: any }) => ({
    ...buildInputStateStyles('MuiPickersOutlinedInput-notchedOutline'),
    ...theme.typography.bodyNormal,
    borderRadius: 'var(--mui-tokens-radius-md)',
    boxSizing: 'border-box' as const,
    height: INPUT_HEIGHT_LARGE,
    maxHeight: INPUT_HEIGHT_LARGE,
    padding: INPUT_PADDING_LARGE,
    '&.Mui-disabled *': {
        color: 'var(--mui-tokens-color-neutral-400)',
        WebkitTextFillColor: 'var(--mui-tokens-color-neutral-400)'
    },
    '&.MuiInputBase-readOnly *, &[readonly] *': {
        color: 'var(--mui-tokens-color-neutral-800)',
        WebkitTextFillColor: 'var(--mui-tokens-color-neutral-800)'
    },
    '& .MuiInputAdornment-root': {
        marginLeft: 'var(--mui-tokens-spacing-3)'
    },
    '& .MuiInputAdornment-root .MuiIconButton-root': {
        padding: 'var(--mui-tokens-spacing-0)'
    },
    '& .MuiInputAdornment-root svg': {
        color: 'var(--mui-tokens-color-neutral-700)',
        height: '1.25rem',
        width: '1.25rem'
    },
    '&.Mui-disabled .MuiInputAdornment-root svg': {
        color: 'var(--mui-tokens-color-neutral-400) !important'
    }
});

const pickersInputVariants = [
    {
        props: {
            size: 'small'
        },
        style: ({ theme }: { theme: any }) => ({
            height: INPUT_HEIGHT_SMALL,
            maxHeight: INPUT_HEIGHT_SMALL,
            padding: INPUT_PADDING_SMALL,
            ...theme.typography.bodySmall,
            '@media (pointer: coarse)': {
                height: INPUT_HEIGHT_TOUCH,
                maxHeight: INPUT_HEIGHT_TOUCH
            }
        })
    },
    {
        props: {
            size: 'medium'
        },
        style: ({ theme }: { theme: any }) => ({
            height: INPUT_HEIGHT_MEDIUM,
            maxHeight: INPUT_HEIGHT_MEDIUM,
            padding: INPUT_PADDING_MEDIUM,
            ...theme.typography.bodyNormal
        })
    },
    {
        props: {
            size: 'large'
        },
        style: ({ theme }: { theme: any }) => ({
            height: INPUT_HEIGHT_LARGE,
            maxHeight: INPUT_HEIGHT_LARGE,
            padding: INPUT_PADDING_LARGE,
            ...theme.typography.bodyNormal
        })
    }
];

export const datePickerOverrides: ComponentTheme = {
    MuiDatePicker: {
        defaultProps: {
            slotProps: {
                textField: {
                    size: 'large',
                    variant: 'outlined'
                }
            }
        }
    },
    MuiDateTimePicker: {
        defaultProps: {
            slotProps: {
                textField: {
                    size: 'large',
                    variant: 'outlined'
                }
            }
        }
    },
    MuiPickersTextField: {
        defaultProps: {
            size: 'large',
            variant: 'outlined'
        }
    },
    MuiPickersInputBase: {
        styleOverrides: {
            root: pickersInputRootStyles,
            sectionsContainer: {
                padding: 'var(--mui-tokens-spacing-0)'
            },
            input: {
                boxSizing: 'border-box',
                padding: 'var(--mui-tokens-spacing-0)'
            }
        },
        variants: pickersInputVariants
    },
    MuiPickersOutlinedInput: {
        styleOverrides: {
            root: pickersInputRootStyles,
            sectionsContainer: {
                padding: 'var(--mui-tokens-spacing-0)'
            },
            input: {
                boxSizing: 'border-box',
                padding: 'var(--mui-tokens-spacing-0)'
            }
        },
        variants: pickersInputVariants
    }
};