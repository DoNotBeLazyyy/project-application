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
    padding: `0 ${INPUT_PADDING_LARGE}`,
    display: 'flex',
    alignItems: 'center',
    '&.MuiPickersInputBase-sizeSmall, &.MuiPickersOutlinedInput-sizeSmall, &.MuiInputBase-sizeSmall, .MuiPickersTextField-root.MuiPickersTextField-sizeSmall &, .MuiPickersTextField-root:has(&.MuiInputBase-sizeSmall) &, .MuiFormControl-root:has(&.MuiInputBase-sizeSmall) &': {
        height: `${INPUT_HEIGHT_SMALL} !important`,
        maxHeight: `${INPUT_HEIGHT_SMALL} !important`,
        paddingLeft: 'var(--mui-tokens-spacing-3) !important',
        paddingRight: 'var(--mui-tokens-spacing-2) !important',
        paddingTop: '0 !important',
        paddingBottom: '0 !important',
        ...theme.typography.bodySmall,
        '@media (pointer: coarse)': {
            height: `${INPUT_HEIGHT_TOUCH} !important`,
            maxHeight: `${INPUT_HEIGHT_TOUCH} !important`
        },
        '& .MuiInputAdornment-root': {
            marginLeft: 'var(--mui-tokens-spacing-2) !important',
            marginRight: '0 !important'
        },
        '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
            margin: '0 !important',
            marginRight: '0 !important',
            padding: 'var(--mui-tokens-spacing-1) !important',
            width: '1.75rem !important',
            height: '1.75rem !important'
        },
        '& .MuiInputAdornment-root svg': {
            height: '1rem !important',
            width: '1rem !important'
        }
    },
    '&.MuiPickersInputBase-sizeMedium, &.MuiPickersOutlinedInput-sizeMedium, &.MuiInputBase-sizeMedium': {
        height: `${INPUT_HEIGHT_MEDIUM} !important`,
        maxHeight: `${INPUT_HEIGHT_MEDIUM} !important`,
        padding: `0 ${INPUT_PADDING_MEDIUM} !important`,
        ...theme.typography.bodyNormal,
        '& .MuiInputAdornment-root': {
            marginLeft: 'var(--mui-tokens-spacing-2) !important',
            marginRight: '0 !important'
        },
        '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
            margin: '0 !important',
            marginRight: '0 !important'
        }
    },
    '&.MuiPickersInputBase-sizeLarge, &.MuiPickersOutlinedInput-sizeLarge, &.MuiInputBase-sizeLarge': {
        height: `${INPUT_HEIGHT_LARGE} !important`,
        maxHeight: `${INPUT_HEIGHT_LARGE} !important`,
        padding: `0 ${INPUT_PADDING_LARGE} !important`,
        ...theme.typography.bodyNormal,
        '& .MuiInputAdornment-root': {
            marginLeft: 'var(--mui-tokens-spacing-3) !important',
            marginRight: '0 !important'
        },
        '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
            margin: '0 !important',
            marginRight: '0 !important'
        }
    },
    '&.Mui-disabled *': {
        color: 'var(--mui-tokens-color-neutral-400)',
        WebkitTextFillColor: 'var(--mui-tokens-color-neutral-400)'
    },
    '&.MuiInputBase-readOnly *, &[readonly] *': {
        color: 'var(--mui-tokens-color-neutral-800)',
        WebkitTextFillColor: 'var(--mui-tokens-color-neutral-800)'
    },
    '& .MuiInputAdornment-root': {
        marginLeft: 'var(--mui-tokens-spacing-2)',
        marginRight: 0,
        display: 'flex',
        alignItems: 'center'
    },
    '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
        margin: 0,
        marginRight: 0,
        padding: 'var(--mui-tokens-spacing-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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

export const datePickerOverrides: ComponentTheme & Record<string, any> = {
    MuiDatePicker: {
        defaultProps: {
            slotProps: {
                textField: {
                    size: 'medium',
                    variant: 'outlined'
                }
            }
        }
    },
    MuiDateTimePicker: {
        defaultProps: {
            slotProps: {
                textField: {
                    size: 'medium',
                    variant: 'outlined'
                }
            }
        }
    },
    MuiPickersTextField: {
        defaultProps: {
            size: 'medium',
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
    } as any,
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
    } as any
};