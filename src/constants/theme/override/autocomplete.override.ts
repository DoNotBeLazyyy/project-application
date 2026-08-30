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
                    '&.Mui-disabled': {
                        backgroundColor: SURFACE_DISABLED
                    }
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