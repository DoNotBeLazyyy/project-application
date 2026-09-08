import { buildInputStateStyles, INPUT_HEIGHT_LARGE, INPUT_PADDING_LARGE } from '@constants/theme/input-state.constant';
import { ComponentTheme } from '@type/common/theme.type';
import type {} from '@mui/x-date-pickers/themeAugmentation';

export const datePickerOverrides: ComponentTheme = {
    MuiPickersOutlinedInput: {
        styleOverrides: {
            root: ({ theme }) => ({
                ...buildInputStateStyles('MuiPickersOutlinedInput-notchedOutline'),
                ...theme.typography.bodyNormal,
                borderRadius: 'var(--mui-tokens-radius-md)',
                boxSizing: 'border-box',
                height: INPUT_HEIGHT_LARGE,
                maxHeight: INPUT_HEIGHT_LARGE,
                padding: INPUT_PADDING_LARGE,
                '&.Mui-disabled *, &.MuiInputBase-readOnly *, &[readonly] *, &:has(input[readonly]) *, &.common_input_readonly *': {
                    color: 'var(--mui-tokens-color-neutral-400)',
                    WebkitTextFillColor: 'var(--mui-tokens-color-neutral-400)'
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
                '&.Mui-disabled .MuiInputAdornment-root svg, &.MuiInputBase-readOnly .MuiInputAdornment-root svg, &[readonly] .MuiInputAdornment-root svg, &:has(input[readonly]) .MuiInputAdornment-root svg, &.common_input_readonly .MuiInputAdornment-root svg': {
                    color: 'var(--mui-tokens-color-neutral-400) !important'
                }
            }),
            sectionsContainer: {
                padding: 'var(--mui-tokens-spacing-0)'
            },
            input: {
                padding: 'var(--mui-tokens-spacing-0)'
            }
        }
    }
};