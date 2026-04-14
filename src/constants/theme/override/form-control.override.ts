import { ComponentTheme } from '@type/common/theme.type';

export const formControlOverrides: ComponentTheme = {
    MuiFormControlLabel: {
        styleOverrides: {
            root: {
                color: 'var(--mui-palette-grey-600)',
                '&.Mui-disabled': {
                    '& .MuiFormControlLabel-label': {
                        color: 'var(--mui-palette-grey-200)'
                    }
                },
                '&:has(.Mui-checked).Mui-disabled': {
                    '& .MuiFormControlLabel-label': {
                        color: 'var(--mui-palette-grey-300)'
                    }
                }
            },
            label: {
                marginLeft: '7px'
            }
        }
    }
};