import {
    INPUT_HEIGHT_LARGE, INPUT_HEIGHT_SMALL,
    SURFACE_DISABLED
} from '@constants/theme/input-state.constant';
import { ComponentTheme } from '@type/common/theme.type';

export const autocompleteOverrides: ComponentTheme = {
    MuiAutocomplete: {
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--mui-tokens-spacing-2)',
                    height: 'auto',
                    maxHeight: 'none',
                    minHeight: INPUT_HEIGHT_LARGE,
                    padding: 'var(--mui-tokens-spacing-1) var(--mui-tokens-spacing-3)',
                    '&.MuiInputBase-sizeSmall': {
                        minHeight: INPUT_HEIGHT_SMALL,
                        padding: 'var(--mui-tokens-spacing-1) var(--mui-tokens-spacing-2)'
                    },
                    '&.Mui-disabled, &.MuiInputBase-readOnly, &[readonly], &:has(input[readonly]), &.common_input_readonly': {
                        backgroundColor: SURFACE_DISABLED
                    }
                },
                '&.Mui-disabled .MuiAutocomplete-popupIndicator, &.Mui-readOnly .MuiAutocomplete-popupIndicator, & .Mui-disabled .MuiAutocomplete-popupIndicator, & .MuiInputBase-readOnly .MuiAutocomplete-popupIndicator': {
                    color: 'var(--mui-tokens-color-neutral-400) !important'
                },
                '& .MuiAutocomplete-input': {
                    minWidth: '3.75rem',
                    padding: 'var(--mui-tokens-spacing-1) var(--mui-tokens-spacing-2) !important'
                },
                '& .MuiAutocomplete-tag': {
                    margin: 'var(--mui-tokens-spacing-1) 0'
                }
            }
        }
    }
};