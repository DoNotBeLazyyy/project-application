import CheckboxButtonCheckedIcon from '@components/icons/CheckboxChecked';
import CheckboxIndeterminateIcon from '@components/icons/CheckboxIndeterminate';
import CheckboxButtonUncheckedIcon from '@components/icons/CheckboxUnchecked';
import { Components, Theme } from '@mui/material';

export const formControlOverrides: Components<Omit<Theme, 'components'>> = {
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
            label: { marginLeft: '7px' }
        }
    }
};